// Material tree view for a single crafting item - shows materials grouped by depth
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { CraftingTreeNode, Item, ListingInfo } from '../types';
import type { QualityFilter } from '../hooks/useCraftingTree';
import { getItemIconUrl } from '../services/xivapiService';
import { formatPrice } from '../services/universalisApi';
import { ListingsTooltip } from './ListingsTooltip';
import { CopyButton } from './CopyButton';

interface CraftingMaterialTreeViewProps {
  tree: CraftingTreeNode;
  qualityFilter: QualityFilter;
  showCrystals: boolean;
}

interface AggregatedMaterial {
  item: Item;
  totalQuantity: number;
  marketPriceNQ: number | null;
  marketPriceHQ: number | null;
  serverNQ: string;
  serverHQ: string;
  craftCost: number | null;
  depth: number;
  hasRecipe: boolean;
  listings?: ListingInfo[];
}

// Crystal item IDs (2-19)
const CRYSTAL_IDS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

/**
 * Collect all materials from a tree node recursively.
 * Uses compound key (itemId-depth) so the same material at different depths
 * is shown separately with correct quantities per level.
 */
function collectMaterials(
  node: CraftingTreeNode,
  materials: Map<string, AggregatedMaterial>,
  depth: number
): void {
  for (const child of node.children) {
    const key = `${child.item.id}-${depth}`;
    const existing = materials.get(key);

    if (existing) {
      // Same item at same depth - accumulate quantity
      existing.totalQuantity += child.quantity;
    } else {
      // Add new material entry for this depth
      materials.set(key, {
        item: child.item,
        totalQuantity: child.quantity,
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
    collectMaterials(child, materials, depth + 1);
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

export function CraftingMaterialTreeView({ tree, qualityFilter, showCrystals }: CraftingMaterialTreeViewProps) {
  // Aggregate all materials
  const { materialsByDepth, maxDepth } = useMemo(() => {
    const materials = new Map<string, AggregatedMaterial>();
    collectMaterials(tree, materials, 1);

    // Filter out crystals if not showing
    if (!showCrystals) {
      for (const [key, mat] of materials) {
        if (CRYSTAL_IDS.has(mat.item.id)) {
          materials.delete(key);
        }
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

    // Sort each depth group: non-crystals first (by quantity desc), then crystals last
    for (const mats of byDepth.values()) {
      mats.sort((a, b) => {
        const aCrystal = CRYSTAL_IDS.has(a.item.id) ? 1 : 0;
        const bCrystal = CRYSTAL_IDS.has(b.item.id) ? 1 : 0;
        if (aCrystal !== bCrystal) return aCrystal - bCrystal;
        return b.totalQuantity - a.totalQuantity;
      });
    }

    return { materialsByDepth: byDepth, maxDepth: max };
  }, [tree, showCrystals]);

  if (maxDepth === 0) {
    return (
      <div className="text-center py-4 text-[var(--ffxiv-muted)]">
        此物品無製作配方或無材料
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                    key={`${mat.item.id}-${mat.depth}`}
                    className="bg-[var(--ffxiv-card)] border border-[var(--ffxiv-border)] rounded-lg p-3 min-w-[180px] max-w-[220px]"
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
                        <div className="flex items-center gap-0.5">
                          <Link
                            to={`/item/${mat.item.id}`}
                            className={`text-sm font-medium hover:text-[var(--ffxiv-highlight)] truncate ${getRarityClass(mat.item.rarity)}`}
                          >
                            {mat.item.name}
                          </Link>
                          <CopyButton text={mat.item.name} />
                        </div>
                        <div className="text-xs text-[var(--ffxiv-muted)]">
                          需要: {mat.totalQuantity}
                        </div>
                      </div>
                    </div>

                    {/* Price info */}
                    <div className="text-xs space-y-0.5">
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
                      {mat.hasRecipe && (
                        <div className="text-blue-400">
                          可製作
                        </div>
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
