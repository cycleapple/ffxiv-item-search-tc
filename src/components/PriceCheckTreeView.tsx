// Tree view component showing aggregated materials with dependencies
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { CraftingTreeNode, Item, ListingInfo } from '../types';
import type { PriceCheckListItemData } from '../hooks/usePriceCheckListData';
import type { QualityFilter } from '../hooks/useCraftingTree';
import { getItemIconUrl } from '../services/xivapiService';
import { formatPrice } from '../services/universalisApi';
import { ListingsTooltip } from './ListingsTooltip';

interface PriceCheckTreeViewProps {
  items: PriceCheckListItemData[];
  qualityFilter: QualityFilter;
  onRemove: (itemId: number) => void;
}

interface AggregatedMaterial {
  item: Item;
  totalQuantity: number;
  usedBy: { itemId: number; itemName: string; quantity: number }[];
  marketPriceNQ: number | null;
  marketPriceHQ: number | null;
  serverNQ: string;
  serverHQ: string;
  craftCost: number | null;
  depth: number;
  hasRecipe: boolean;
  listings?: ListingInfo[];
}

/**
 * Collect all materials from a tree node recursively
 */
function collectMaterials(
  node: CraftingTreeNode,
  parentItemId: number,
  parentItemName: string,
  materials: Map<number, AggregatedMaterial>,
  depth: number
): void {
  for (const child of node.children) {
    const existing = materials.get(child.item.id);

    if (existing) {
      // Update existing material
      existing.totalQuantity += child.quantity;
      const usedByEntry = existing.usedBy.find(u => u.itemId === parentItemId);
      if (usedByEntry) {
        usedByEntry.quantity += child.quantity;
      } else {
        existing.usedBy.push({
          itemId: parentItemId,
          itemName: parentItemName,
          quantity: child.quantity,
        });
      }
      // Keep the minimum depth (closest to root)
      existing.depth = Math.min(existing.depth, depth);
    } else {
      // Add new material
      materials.set(child.item.id, {
        item: child.item,
        totalQuantity: child.quantity,
        usedBy: [{
          itemId: parentItemId,
          itemName: parentItemName,
          quantity: child.quantity,
        }],
        marketPriceNQ: child.marketPriceNQ,
        marketPriceHQ: child.marketPriceHQ,
        serverNQ: child.serverNQ,
        serverHQ: child.serverHQ,
        craftCost: child.craftCost,
        depth,
        hasRecipe: child.recipe !== null && child.children.length > 0,
        listings: child.listings,
      });
    }

    // Recursively collect from children
    collectMaterials(child, parentItemId, parentItemName, materials, depth + 1);
  }
}

/**
 * Get best price based on quality filter
 */
function getBestPrice(
  mat: AggregatedMaterial,
  qualityFilter: QualityFilter
): { price: number | null; server: string; isHQ: boolean } {
  if (qualityFilter === 'nq') {
    return { price: mat.marketPriceNQ, server: mat.serverNQ, isHQ: false };
  } else if (qualityFilter === 'hq') {
    return { price: mat.marketPriceHQ, server: mat.serverHQ, isHQ: true };
  } else {
    if (mat.marketPriceNQ !== null && mat.marketPriceHQ !== null) {
      if (mat.marketPriceHQ < mat.marketPriceNQ) {
        return { price: mat.marketPriceHQ, server: mat.serverHQ, isHQ: true };
      }
      return { price: mat.marketPriceNQ, server: mat.serverNQ, isHQ: false };
    }
    if (mat.marketPriceHQ !== null) {
      return { price: mat.marketPriceHQ, server: mat.serverHQ, isHQ: true };
    }
    return { price: mat.marketPriceNQ, server: mat.serverNQ, isHQ: false };
  }
}

function getRarityClass(rarity: number): string {
  switch (rarity) {
    case 1: return 'rarity-common';
    case 2: return 'rarity-uncommon';
    case 3: return 'rarity-rare';
    case 4: return 'rarity-relic';
    case 7: return 'rarity-aetherial';
    default: return 'rarity-common';
  }
}

export function PriceCheckTreeView({ items, qualityFilter, onRemove }: PriceCheckTreeViewProps) {
  // Aggregate all materials from all items
  const { rootItems, materialsByDepth, maxDepth } = useMemo(() => {
    const materials = new Map<number, AggregatedMaterial>();
    const roots: PriceCheckListItemData[] = [];

    for (const itemData of items) {
      if (itemData.tree && itemData.item) {
        roots.push(itemData);
        collectMaterials(
          itemData.tree,
          itemData.item.id,
          itemData.item.name,
          materials,
          1
        );
      }
    }

    // Group materials by depth
    const byDepth = new Map<number, AggregatedMaterial[]>();
    let max = 0;

    for (const mat of materials.values()) {
      const depth = mat.depth;
      if (!byDepth.has(depth)) {
        byDepth.set(depth, []);
      }
      byDepth.get(depth)!.push(mat);
      max = Math.max(max, depth);
    }

    // Sort each depth group by total quantity (descending)
    for (const mats of byDepth.values()) {
      mats.sort((a, b) => b.totalQuantity - a.totalQuantity);
    }

    return { rootItems: roots, materialsByDepth: byDepth, maxDepth: max };
  }, [items]);

  if (rootItems.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--ffxiv-muted)]">
        沒有可顯示的製作材料樹
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Root items (the items in the list) */}
      <div>
        <div className="text-sm text-[var(--ffxiv-muted)] mb-3">查價物品</div>
        <div className="flex flex-wrap gap-3">
          {rootItems.map((itemData) => {
            const item = itemData.item!;
            const iconUrl = getItemIconUrl(item.icon);

            return (
              <div
                key={item.id}
                className="bg-[var(--ffxiv-card)] border border-[var(--ffxiv-accent)] rounded-lg p-3 min-w-[160px] relative"
              >
                {/* Remove button */}
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute top-1 right-1 p-1 rounded text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-error)] hover:bg-[var(--ffxiv-error)]/10 transition-colors"
                  title="移除"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-2 mb-2 pr-4">
                  <ListingsTooltip listings={itemData.tree?.listings}>
                    <Link
                      to={`/item/${item.id}`}
                      className="w-8 h-8 bg-[var(--ffxiv-bg)] rounded overflow-hidden flex-shrink-0"
                    >
                      <img
                        src={iconUrl}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getItemIconUrl(0);
                        }}
                      />
                    </Link>
                  </ListingsTooltip>
                  <Link
                    to={`/item/${item.id}`}
                    className={`text-sm font-medium hover:text-[var(--ffxiv-highlight)] truncate ${getRarityClass(item.rarity)}`}
                  >
                    {item.name}
                  </Link>
                </div>
                {itemData.totalBuyCostHQ > 0 && (
                  <div className="text-xs text-yellow-400">
                    直購HQ: {formatPrice(itemData.totalBuyCostHQ)} gil
                  </div>
                )}
                {itemData.totalCraftCost > 0 && (
                  <div className="text-xs text-blue-400">
                    自製: {formatPrice(itemData.totalCraftCost)} gil
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Materials by depth level */}
      {Array.from({ length: maxDepth }, (_, i) => i + 1).map((depth) => {
        const mats = materialsByDepth.get(depth);
        if (!mats || mats.length === 0) return null;

        return (
          <div key={depth}>
            <div className="text-sm text-[var(--ffxiv-muted)] mb-3">
              {depth === 1 ? '直接材料' : `${depth} 層材料`}
            </div>
            <div className="flex flex-wrap gap-3">
              {mats.map((mat) => {
                const iconUrl = getItemIconUrl(mat.item.icon);
                const bestPrice = getBestPrice(mat, qualityFilter);
                const totalCost = bestPrice.price !== null ? bestPrice.price * mat.totalQuantity : null;

                return (
                  <div
                    key={mat.item.id}
                    className={`bg-[var(--ffxiv-card)] border rounded-lg p-3 min-w-[180px] max-w-[220px] ${
                      mat.usedBy.length > 1
                        ? 'border-[var(--ffxiv-highlight)]'
                        : 'border-[var(--ffxiv-border)]'
                    }`}
                  >
                    {/* Item header */}
                    <div className="flex items-center gap-2 mb-2">
                      <ListingsTooltip listings={mat.listings}>
                        <Link
                          to={`/item/${mat.item.id}`}
                          className="w-8 h-8 bg-[var(--ffxiv-bg)] rounded overflow-hidden flex-shrink-0"
                        >
                          <img
                            src={iconUrl}
                            alt={mat.item.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getItemIconUrl(0);
                            }}
                          />
                        </Link>
                      </ListingsTooltip>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/item/${mat.item.id}`}
                          className={`text-sm font-medium hover:text-[var(--ffxiv-highlight)] truncate block ${getRarityClass(mat.item.rarity)}`}
                        >
                          {mat.item.name}
                        </Link>
                        <div className="text-xs text-[var(--ffxiv-muted)]">
                          需要: {mat.totalQuantity}
                        </div>
                      </div>
                    </div>

                    {/* Price info */}
                    <div className="text-xs space-y-0.5 mb-2">
                      {bestPrice.price !== null && (
                        <div className={bestPrice.isHQ ? 'text-yellow-400' : 'text-green-400'}>
                          {bestPrice.isHQ ? 'HQ' : 'NQ'}: {formatPrice(bestPrice.price)} gil
                          {bestPrice.server && (
                            <span className="text-[var(--ffxiv-muted)]"> @ {bestPrice.server}</span>
                          )}
                        </div>
                      )}
                      {totalCost !== null && (
                        <div className="text-[var(--ffxiv-muted)]">
                          小計: {formatPrice(totalCost)} gil
                        </div>
                      )}
                      {mat.hasRecipe && mat.craftCost !== null && (
                        <div className="text-blue-400">
                          可製作
                        </div>
                      )}
                    </div>

                    {/* Used by which items */}
                    <div className="flex flex-wrap gap-1">
                      {mat.usedBy.map((usage) => (
                        <span
                          key={usage.itemId}
                          className="px-1.5 py-0.5 bg-[var(--ffxiv-accent)]/20 text-[var(--ffxiv-accent)] rounded text-xs"
                          title={`${usage.itemName} 需要 ${usage.quantity} 個`}
                        >
                          {usage.quantity}
                        </span>
                      ))}
                      {mat.usedBy.length > 1 && (
                        <span className="px-1.5 py-0.5 bg-[var(--ffxiv-highlight)]/20 text-[var(--ffxiv-highlight)] rounded text-xs">
                          共用
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
