// Material tree view for a single crafting item - matches PriceCheckTreeView style
import { useMemo, useRef, useCallback } from 'react';
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
  showOwned?: boolean;
  ownedMaterials?: Record<number, number>;
  onOwnedChange?: (itemId: number, quantity: number) => void;
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
  lastUploadTime?: number;
  directParents: { parentId: number }[];
}

// Crystal item IDs (2-19)
const CRYSTAL_IDS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

// Material status types for owned quantity tracking
type MaterialStatus = 'green' | 'yellow' | 'red' | 'gray';

const STATUS_COLORS: Record<MaterialStatus, { border: string; bar: string; opacity?: string }> = {
  green: { border: 'border-green-500', bar: 'bg-green-500' },
  yellow: { border: 'border-yellow-500', bar: 'bg-yellow-500' },
  red: { border: 'border-red-500', bar: 'bg-red-500' },
  gray: { border: 'border-gray-600', bar: 'bg-gray-600', opacity: 'opacity-60' },
};

/**
 * Collect all materials from a tree node recursively.
 * Each material only appears once, at its maximum depth.
 * Tracks which parent materials use each material.
 */
function collectMaterials(
  node: CraftingTreeNode,
  directParentId: number,
  directParentName: string,
  rootItemId: number,
  materials: Map<number, AggregatedMaterial>,
  depth: number,
  childrenMap: Map<number, Map<number, number>>
): void {
  for (const child of node.children) {
    // Track parent -> child relationship with per-parent quantity
    if (!childrenMap.has(directParentId)) childrenMap.set(directParentId, new Map());
    const parentMap = childrenMap.get(directParentId)!;
    parentMap.set(child.item.id, (parentMap.get(child.item.id) ?? 0) + child.quantity);

    const existing = materials.get(child.item.id);

    if (existing) {
      // Update existing material
      existing.totalQuantity += child.quantity;
      const usedByEntry = existing.usedBy.find(u => u.itemId === directParentId);
      if (usedByEntry) {
        usedByEntry.quantity += child.quantity;
      } else {
        existing.usedBy.push({
          itemId: directParentId,
          itemName: directParentName,
          quantity: child.quantity,
        });
      }
      // Add direct parent if not already tracked
      if (!existing.directParents.some(p => p.parentId === directParentId)) {
        existing.directParents.push({ parentId: directParentId });
      }
      // Keep the maximum depth (show at deepest usage level)
      existing.depth = Math.max(existing.depth, depth);
    } else {
      // Add new material
      materials.set(child.item.id, {
        item: child.item,
        totalQuantity: child.quantity,
        usedBy: [{
          itemId: directParentId,
          itemName: directParentName,
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
        lastUploadTime: child.lastUploadTime,
        directParents: [{ parentId: directParentId }],
      });
    }

    // Recursively collect from children - pass this material as the direct parent
    collectMaterials(child, child.item.id, child.item.name, rootItemId, materials, depth + 1, childrenMap);
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

export function CraftingMaterialTreeView({ tree, qualityFilter, showCrystals, showOwned = false, ownedMaterials = {}, onOwnedChange }: CraftingMaterialTreeViewProps) {
  const materialRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Set ref for material item
  const setMaterialRef = useCallback((id: number, el: HTMLDivElement | null) => {
    if (el) {
      materialRefs.current.set(id, el);
    } else {
      materialRefs.current.delete(id);
    }
  }, []);

  // Aggregate all materials
  const { materialsByDepth, maxDepth, allMaterials, materialChildren, materialParents, displacedDirectMaterials } = useMemo(() => {
    const materials = new Map<number, AggregatedMaterial>();
    const childrenMap = new Map<number, Map<number, number>>();

    // Collect materials starting from root
    collectMaterials(
      tree,
      tree.item.id,
      tree.item.name,
      tree.item.id,
      materials,
      1,
      childrenMap
    );

    // Filter out crystals if not showing
    if (!showCrystals) {
      for (const [id, mat] of materials) {
        if (CRYSTAL_IDS.has(mat.item.id)) {
          materials.delete(id);
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

    // Build child -> parent map (only material parents, not root item)
    const parents = new Map<number, Set<number>>();
    // Track materials that are direct children of root but displaced to deeper depth
    const displaced = new Map<number, AggregatedMaterial>();
    const rootId = tree.item.id;

    for (const mat of materials.values()) {
      for (const dp of mat.directParents) {
        if (materials.has(dp.parentId)) {
          if (!parents.has(mat.item.id)) parents.set(mat.item.id, new Set());
          parents.get(mat.item.id)!.add(dp.parentId);
        }
        // Direct child of root but displayed at depth > 1
        if (dp.parentId === rootId && mat.depth > 1) {
          displaced.set(mat.item.id, mat);
        }
      }
    }

    return { materialsByDepth: byDepth, maxDepth: max, allMaterials: materials, materialChildren: childrenMap, materialParents: parents, displacedDirectMaterials: displaced };
  }, [tree, showCrystals]);

  // Compute material statuses based on owned quantities
  const materialStatuses = useMemo(() => {
    if (!showOwned) return new Map<number, MaterialStatus>();

    const statusMap = new Map<number, MaterialStatus>();

    // Build reverse map: childId -> [{parentId, qty, parentDepth}]
    const childParentNeeds = new Map<number, { parentId: number; qty: number; parentDepth: number }[]>();
    for (const [parentId, childMap] of materialChildren) {
      const parentMat = allMaterials.get(parentId);
      const parentDepth = parentMat ? parentMat.depth : 0;
      for (const [childId, qty] of childMap) {
        if (!childParentNeeds.has(childId)) childParentNeeds.set(childId, []);
        childParentNeeds.get(childId)!.push({ parentId, qty, parentDepth });
      }
    }

    // Check if child has enough remaining after deeper parents take priority
    function childAllocatedForParent(childId: number, parentDepth: number, qtyNeeded: number): boolean {
      const childOwned = ownedMaterials[childId] ?? 0;
      const needs = childParentNeeds.get(childId);
      if (!needs) return childOwned >= qtyNeeded;

      // Sum needs of strictly deeper parents (they get priority)
      const deeperNeeds = needs
        .filter(n => n.parentDepth > parentDepth)
        .reduce((sum, n) => sum + n.qty, 0);

      return Math.max(0, childOwned - deeperNeeds) >= qtyNeeded;
    }

    // First: GREEN for fully satisfied materials (owned >= total)
    for (const [matId, mat] of allMaterials) {
      if ((ownedMaterials[matId] ?? 0) >= mat.totalQuantity) {
        statusMap.set(matId, 'green');
      }
    }

    // canCraft: all recipe children available via allocation or craftable
    const canCraftCache = new Map<number, boolean>();
    function canCraft(matId: number): boolean {
      if (canCraftCache.has(matId)) return canCraftCache.get(matId)!;
      canCraftCache.set(matId, false); // prevent cycles

      const childMap = materialChildren.get(matId);
      if (!childMap || childMap.size === 0) return false;

      const mat = allMaterials.get(matId);
      const myDepth = mat ? mat.depth : 0;

      const result = Array.from(childMap.entries()).every(([childId, qtyNeeded]) => {
        // Skip materials that are filtered out (e.g., crystals when showCrystals is false)
        if (!allMaterials.has(childId)) return true;

        if (statusMap.get(childId) === 'green') return true;
        if (childAllocatedForParent(childId, myDepth, qtyNeeded)) return true;
        return canCraft(childId);
      });
      canCraftCache.set(matId, result);
      return result;
    }

    // Second: YELLOW/RED for non-green materials
    for (const matId of allMaterials.keys()) {
      if (statusMap.get(matId) === 'green') continue;
      statusMap.set(matId, canCraft(matId) ? 'yellow' : 'red');
    }

    // Third: GRAY where all material-parents are green
    for (const matId of allMaterials.keys()) {
      const parentSet = materialParents.get(matId);
      if (parentSet && parentSet.size > 0) {
        if (Array.from(parentSet).every(p => statusMap.get(p) === 'green')) {
          statusMap.set(matId, 'gray');
        }
      }
    }

    return statusMap;
  }, [showOwned, allMaterials, materialChildren, materialParents, ownedMaterials]);

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
        const hasDisplaced = depth === 1 && displacedDirectMaterials.size > 0;
        if ((!mats || mats.length === 0) && !hasDisplaced) return null;

        return (
          <div key={depth}>
            <div className="text-sm text-[var(--ffxiv-muted)] mb-3">
              {depth === 1 ? '直接材料' : `${depth} 層材料`}
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Ghost cards for displaced direct materials */}
              {depth === 1 && Array.from(displacedDirectMaterials.values()).map((mat) => {
                const iconUrl = getItemIconUrl(mat.item.icon);
                return (
                  <div
                    key={`ghost-${mat.item.id}`}
                    className="bg-[var(--ffxiv-card)] border border-dashed border-[var(--ffxiv-border)] rounded-lg p-3 min-w-[160px] max-w-[200px] opacity-50 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => {
                      const el = materialRefs.current.get(mat.item.id);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Brief highlight effect
                      if (el) {
                        el.style.boxShadow = '0 0 12px var(--ffxiv-highlight)';
                        setTimeout(() => { el.style.boxShadow = ''; }, 1500);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={iconUrl}
                        alt={mat.item.name}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getItemIconUrl(0);
                        }}
                      />
                      <div className="min-w-0">
                        <div className={`text-xs font-medium truncate ${getRarityClass(mat.item.rarity)}`}>
                          {mat.item.name}
                        </div>
                        <div className="text-xs text-[var(--ffxiv-muted)]">
                          ↓ 見 {mat.depth} 層
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {mats?.map((mat) => {
                const iconUrl = getItemIconUrl(mat.item.icon);
                const bestPrice = getBestPrice(mat, qualityFilter);
                const totalCost = bestPrice.price !== null ? bestPrice.price * mat.totalQuantity : null;
                const status = materialStatuses.get(mat.item.id) ?? 'red';
                const statusStyle = showOwned ? STATUS_COLORS[status] : null;
                // Highlight border if used by multiple parents
                const defaultBorder = mat.usedBy.length > 1 ? 'border-[var(--ffxiv-highlight)]' : 'border-[var(--ffxiv-border)]';

                return (
                  <div
                    key={mat.item.id}
                    ref={(el) => setMaterialRef(mat.item.id, el)}
                    className={`bg-[var(--ffxiv-card)] border rounded-lg min-w-[180px] max-w-[220px] flex overflow-hidden ${statusStyle ? `${statusStyle.border} ${statusStyle.opacity ?? ''}` : defaultBorder}`}
                  >
                    {/* Left color bar */}
                    {statusStyle && <div className={`w-1 flex-shrink-0 ${statusStyle.bar}`} />}

                    <div className="p-3 flex-1 min-w-0">
                      {/* Item header */}
                      <div className="flex items-center gap-2 mb-2">
                        <ListingsTooltip listings={mat.listings} lastUploadTime={mat.lastUploadTime}>
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

                      {/* Owned input */}
                      {showOwned && onOwnedChange && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs text-[var(--ffxiv-muted)]">擁有:</span>
                          <input
                            type="number"
                            min={0}
                            value={ownedMaterials[mat.item.id] ?? 0}
                            onChange={(e) => onOwnedChange(mat.item.id, Math.max(0, parseInt(e.target.value) || 0))}
                            onFocus={(e) => e.target.select()}
                            className="w-16 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-1.5 py-0.5 text-xs text-right focus:outline-none focus:border-[var(--ffxiv-highlight)]"
                          />
                        </div>
                      )}

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

                      {/* Used by which parent materials */}
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
