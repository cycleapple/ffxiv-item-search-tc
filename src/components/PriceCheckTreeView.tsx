// Tree view component showing aggregated materials with dependencies
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { CraftingTreeNode, Item, ListingInfo } from '../types';
import type { PriceCheckListItemData } from '../hooks/usePriceCheckListData';
import type { QualityFilter } from '../hooks/useCraftingTree';
import { getItemIconUrl } from '../services/xivapiService';
import { formatPrice } from '../services/universalisApi';
import { ListingsTooltip } from './ListingsTooltip';
import { CopyButton } from './CopyButton';

interface PriceCheckTreeViewProps {
  items: PriceCheckListItemData[];
  qualityFilter: QualityFilter;
  onRemove: (itemId: number) => void;
  ownedMaterials: Record<number, number>;
  onOwnedChange: (itemId: number, quantity: number) => void;
  onOwnedClear: () => void;
  onQuantityChange: (itemId: number, quantity: number) => void;
  showOwned: boolean;
  customPrices: Record<number, number>;
  onCustomPriceChange: (itemId: number, price: number) => void;
  onCustomPriceClear: (itemId: number) => void;
  onCustomPricesClear: () => void;
  showCustomPrices: boolean;
}

type MaterialStatus = 'green' | 'yellow' | 'red' | 'gray';

const STATUS_COLORS: Record<MaterialStatus, { border: string; bar: string; opacity?: string }> = {
  green: { border: 'border-green-500', bar: 'bg-green-500' },
  yellow: { border: 'border-yellow-500', bar: 'bg-yellow-500' },
  red: { border: 'border-red-500', bar: 'bg-red-500' },
  gray: { border: 'border-gray-600', bar: 'bg-gray-600', opacity: 'opacity-60' },
};

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
  // Track direct parents for line drawing
  directParents: { parentId: number; rootId: number }[];
}

// Crystal item IDs (2-19)
const CRYSTAL_IDS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

// Color palette for root items
const ROOT_COLORS = [
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#22d3ee', // cyan
  '#818cf8', // indigo
  '#e879f9', // pink
  '#a78bfa', // purple
];

/**
 * Collect all materials from a tree node recursively
 * Now tracks direct parent for line drawing
 */
function collectMaterials(
  node: CraftingTreeNode,
  directParentId: number,
  rootItemId: number,
  rootItemName: string,
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
      const usedByEntry = existing.usedBy.find(u => u.itemId === rootItemId);
      if (usedByEntry) {
        usedByEntry.quantity += child.quantity;
      } else {
        existing.usedBy.push({
          itemId: rootItemId,
          itemName: rootItemName,
          quantity: child.quantity,
        });
      }
      // Add direct parent if not already tracked
      if (!existing.directParents.some(p => p.parentId === directParentId && p.rootId === rootItemId)) {
        existing.directParents.push({ parentId: directParentId, rootId: rootItemId });
      }
      // Keep the maximum depth (show at deepest usage level)
      existing.depth = Math.max(existing.depth, depth);
    } else {
      // Add new material
      materials.set(child.item.id, {
        item: child.item,
        totalQuantity: child.quantity,
        usedBy: [{
          itemId: rootItemId,
          itemName: rootItemName,
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
        directParents: [{ parentId: directParentId, rootId: rootItemId }],
      });
    }

    // Recursively collect from children - pass this material as the direct parent
    collectMaterials(child, child.item.id, rootItemId, rootItemName, materials, depth + 1, childrenMap);
  }
}

/**
 * Get best price based on quality filter, with custom price override
 */
function getBestPrice(
  mat: AggregatedMaterial,
  qualityFilter: QualityFilter,
  customPrices?: Record<number, number>
): { price: number | null; server: string; isHQ: boolean; isCustom: boolean } {
  // Check for custom price first
  if (customPrices && customPrices[mat.item.id] !== undefined) {
    return { price: customPrices[mat.item.id], server: '', isHQ: false, isCustom: true };
  }

  if (qualityFilter === 'nq') {
    return { price: mat.marketPriceNQ, server: mat.serverNQ, isHQ: false, isCustom: false };
  } else if (qualityFilter === 'hq') {
    return { price: mat.marketPriceHQ, server: mat.serverHQ, isHQ: true, isCustom: false };
  } else {
    if (mat.marketPriceNQ !== null && mat.marketPriceHQ !== null) {
      if (mat.marketPriceHQ < mat.marketPriceNQ) {
        return { price: mat.marketPriceHQ, server: mat.serverHQ, isHQ: true, isCustom: false };
      }
      return { price: mat.marketPriceNQ, server: mat.serverNQ, isHQ: false, isCustom: false };
    }
    if (mat.marketPriceHQ !== null) {
      return { price: mat.marketPriceHQ, server: mat.serverHQ, isHQ: true, isCustom: false };
    }
    return { price: mat.marketPriceNQ, server: mat.serverNQ, isHQ: false, isCustom: false };
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

export function PriceCheckTreeView({ items, qualityFilter, onRemove, ownedMaterials, onOwnedChange, onOwnedClear, onQuantityChange, showOwned, customPrices, onCustomPriceChange, onCustomPriceClear, onCustomPricesClear, showCustomPrices }: PriceCheckTreeViewProps) {
  const [showLines, setShowLines] = useState(false);
  const [selectedRootIds, setSelectedRootIds] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const materialRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string; rootId: number }[]>([]);
  const [refsVersion, setRefsVersion] = useState(0);

  // Aggregate all materials from all items
  const { rootItems, materialsByDepth, maxDepth, rootColorMap, allMaterials, materialChildren, materialParents, displacedDirectMaterials } = useMemo(() => {
    const materials = new Map<number, AggregatedMaterial>();
    const roots: PriceCheckListItemData[] = [];
    const colorMap = new Map<number, string>();

    const childrenMap = new Map<number, Map<number, number>>();

    for (let i = 0; i < items.length; i++) {
      const itemData = items[i];
      if (itemData.tree && itemData.item) {
        roots.push(itemData);
        colorMap.set(itemData.item.id, ROOT_COLORS[i % ROOT_COLORS.length]);
        collectMaterials(
          itemData.tree,
          itemData.item.id, // direct parent is the root item itself for depth 1
          itemData.item.id,
          itemData.item.name,
          materials,
          1,
          childrenMap
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

    // Sort each depth group: non-crystals first (by quantity desc), then crystals last
    for (const mats of byDepth.values()) {
      mats.sort((a, b) => {
        const aCrystal = CRYSTAL_IDS.has(a.item.id) ? 1 : 0;
        const bCrystal = CRYSTAL_IDS.has(b.item.id) ? 1 : 0;
        if (aCrystal !== bCrystal) return aCrystal - bCrystal;
        return b.totalQuantity - a.totalQuantity;
      });
    }

    // Build child -> parent map (only material parents, not root items)
    const parents = new Map<number, Set<number>>();
    // Track materials that are direct children of root but displaced to deeper depth
    const displaced = new Map<number, AggregatedMaterial>();
    const rootIds = new Set(roots.map(r => r.item!.id));

    for (const mat of materials.values()) {
      for (const dp of mat.directParents) {
        if (materials.has(dp.parentId)) {
          if (!parents.has(mat.item.id)) parents.set(mat.item.id, new Set());
          parents.get(mat.item.id)!.add(dp.parentId);
        }
        // Direct child of root but displayed at depth > 1
        if (rootIds.has(dp.parentId) && mat.depth > 1) {
          displaced.set(mat.item.id, mat);
        }
      }
    }

    return { rootItems: roots, materialsByDepth: byDepth, maxDepth: max, rootColorMap: colorMap, allMaterials: materials, materialChildren: childrenMap, materialParents: parents, displacedDirectMaterials: displaced };
  }, [items]);

  // Compute material statuses based on owned quantities
  // Allocation strategy: deeper parents get priority for shared materials
  const materialStatuses = useMemo(() => {
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
  }, [allMaterials, materialChildren, materialParents, ownedMaterials]);

  // Calculate lines for all depths
  const updateLines = useCallback(() => {
    if (!containerRef.current || !showLines) {
      setLines([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];

    // Iterate through all materials and draw lines to their direct parents
    for (const mat of allMaterials.values()) {
      const matEl = materialRefs.current.get(mat.item.id);
      if (!matEl) continue;

      const matRect = matEl.getBoundingClientRect();
      const matX = matRect.left - containerRect.left + matRect.width / 2;
      const matY = matRect.top - containerRect.top;

      for (const parent of mat.directParents) {
        // Only draw lines between adjacent depth levels
        const parentMat = allMaterials.get(parent.parentId);
        const parentDepth = parentMat ? parentMat.depth : 0; // root items = depth 0
        if (mat.depth - parentDepth !== 1) continue;

        // Check if parent is a root item or another material
        let parentEl = rootRefs.current.get(parent.parentId);
        if (!parentEl) {
          parentEl = materialRefs.current.get(parent.parentId) ?? undefined;
        }
        if (!parentEl) continue;

        const parentRect = parentEl.getBoundingClientRect();
        const parentX = parentRect.left - containerRect.left + parentRect.width / 2;
        const parentY = parentRect.top - containerRect.top + parentRect.height;

        const color = rootColorMap.get(parent.rootId) || '#888';

        newLines.push({
          x1: parentX,
          y1: parentY,
          x2: matX,
          y2: matY,
          color,
          rootId: parent.rootId,
        });
      }
    }

    setLines(newLines);
  }, [showLines, allMaterials, rootColorMap]);

  // Update lines on mount and when dependencies change
  useEffect(() => {
    // Multiple delayed calls to ensure refs are set after layout
    const timeouts = [
      setTimeout(updateLines, 50),
      setTimeout(updateLines, 200),
      setTimeout(updateLines, 500),
    ];

    const handleResize = () => {
      setTimeout(updateLines, 100);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateLines, true);

    // Use ResizeObserver for container changes
    const observer = new ResizeObserver(() => {
      setTimeout(updateLines, 100);
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Also observe DOM changes
    const mutationObserver = new MutationObserver(() => {
      setTimeout(updateLines, 50);
    });
    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateLines, true);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateLines, rootItems, materialsByDepth, refsVersion]);

  // Pending ref update timer
  const pendingRefUpdate = useRef<number | null>(null);

  // Schedule a debounced refs version update
  const scheduleRefsUpdate = useCallback(() => {
    if (pendingRefUpdate.current !== null) {
      clearTimeout(pendingRefUpdate.current);
    }
    pendingRefUpdate.current = window.setTimeout(() => {
      pendingRefUpdate.current = null;
      setRefsVersion(v => v + 1);
    }, 100);
  }, []);

  // Set ref for root item
  const setRootRef = useCallback((id: number, el: HTMLDivElement | null) => {
    if (el) {
      const hadRef = rootRefs.current.has(id);
      rootRefs.current.set(id, el);
      if (!hadRef) {
        scheduleRefsUpdate();
      }
    } else {
      rootRefs.current.delete(id);
    }
  }, [scheduleRefsUpdate]);

  // Set ref for material item
  const setMaterialRef = useCallback((id: number, el: HTMLDivElement | null) => {
    if (el) {
      const hadRef = materialRefs.current.has(id);
      materialRefs.current.set(id, el);
      if (!hadRef) {
        scheduleRefsUpdate();
      }
    } else {
      materialRefs.current.delete(id);
    }
  }, [scheduleRefsUpdate]);

  if (rootItems.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--ffxiv-muted)]">
        沒有可顯示的製作材料樹
      </div>
    );
  }

  // Get materials used by selected roots
  const selectedMaterialIds = useMemo(() => {
    if (selectedRootIds.size === 0) return new Set<number>();
    const ids = new Set<number>();
    for (const [, mats] of materialsByDepth) {
      for (const mat of mats) {
        if (mat.usedBy.some(u => selectedRootIds.has(u.itemId))) {
          ids.add(mat.item.id);
        }
      }
    }
    return ids;
  }, [selectedRootIds, materialsByDepth]);

  // Handle click on container background to deselect all
  const handleContainerClick = useCallback(() => {
    setSelectedRootIds(new Set());
  }, []);

  // Handle root item click - toggle selection
  const handleRootClick = useCallback((itemId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRootIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="relative" ref={containerRef} onClick={handleContainerClick}>
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-4 mb-4" onClick={(e) => e.stopPropagation()}>
        {showCustomPrices && (
          <button
            onClick={onCustomPricesClear}
            className="text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-error)] transition-colors"
          >
            清除自訂價格
          </button>
        )}
        {showOwned && (
          <button
            onClick={onOwnedClear}
            className="text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-error)] transition-colors"
          >
            清除擁有數量
          </button>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showLines}
            onChange={(e) => setShowLines(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-card)] text-[var(--ffxiv-highlight)] focus:ring-[var(--ffxiv-highlight)]"
          />
          <span className="text-[var(--ffxiv-muted)]">顯示依賴線</span>
        </label>
      </div>

      {/* SVG overlay for dependency lines - positioned behind cards */}
      {showLines && lines.length > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 0 }}
        >
          <defs>
            {rootItems.map((itemData) => {
              const color = rootColorMap.get(itemData.item!.id) || '#888';
              return (
                <linearGradient
                  key={itemData.item!.id}
                  id={`gradient-${itemData.item!.id}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                </linearGradient>
              );
            })}
          </defs>
          {lines.map((line, i) => {
            const isHighlighted = selectedRootIds.size === 0 || selectedRootIds.has(line.rootId);
            const opacity = isHighlighted ? 1 : 0.15;
            const strokeWidth = isHighlighted && selectedRootIds.has(line.rootId) ? 2 : 1.5;

            // Create a curved path
            const midY = (line.y1 + line.y2) / 2;

            return (
              <path
                key={i}
                d={`M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`}
                fill="none"
                stroke={`url(#gradient-${line.rootId})`}
                strokeWidth={strokeWidth}
                opacity={opacity}
                className="transition-all duration-200"
              />
            );
          })}
        </svg>
      )}

      <div className="space-y-6 relative" style={{ zIndex: 1 }} onClick={handleContainerClick}>
        {/* Root items (the items in the list) */}
        <div>
          <div className="text-sm text-[var(--ffxiv-muted)] mb-3">追蹤物品</div>
          <div className="flex flex-wrap gap-3">
            {rootItems.map((itemData) => {
              const item = itemData.item!;
              const iconUrl = getItemIconUrl(item.icon);
              const color = rootColorMap.get(item.id);

              return (
                <div
                  key={item.id}
                  ref={(el) => setRootRef(item.id, el)}
                  className="bg-[var(--ffxiv-card)] border-2 rounded-lg p-3 min-w-[160px] relative transition-all duration-200 cursor-pointer"
                  style={{
                    borderColor: color,
                    boxShadow: selectedRootIds.has(item.id) ? `0 0 12px ${color}60` : 'none',
                  }}
                  onClick={(e) => handleRootClick(item.id, e)}
                >
                  {/* Color indicator */}
                  <div
                    className="absolute top-0 left-0 w-full h-1 rounded-t-md"
                    style={{ backgroundColor: color }}
                  />

                  {/* Remove button */}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="absolute top-2 right-1 p-1 rounded text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-error)] hover:bg-[var(--ffxiv-error)]/10 transition-colors z-20"
                    title="移除"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-2 mb-2 pr-4 mt-1">
                    <ListingsTooltip listings={itemData.tree?.listings} lastUploadTime={itemData.tree?.lastUploadTime}>
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
                    <CopyButton text={item.name} />
                  </div>
                  {/* Quantity input */}
                  {showOwned && (
                    <div className="flex items-center gap-1.5 mb-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-[var(--ffxiv-muted)]">數量:</span>
                      <input
                        type="number"
                        min={1}
                        value={itemData.listItem.quantity}
                        onChange={(e) => onQuantityChange(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                        onFocus={(e) => e.target.select()}
                        className="w-16 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-1.5 py-0.5 text-xs text-right focus:outline-none focus:border-[var(--ffxiv-highlight)]"
                      />
                    </div>
                  )}
                  {/* Custom price input */}
                  {showCustomPrices && (
                    <div className="flex items-center gap-1.5 mb-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-[var(--ffxiv-muted)]">自訂:</span>
                      <input
                        type="number"
                        min={0}
                        value={customPrices[item.id] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === undefined) {
                            onCustomPriceClear(item.id);
                          } else {
                            onCustomPriceChange(item.id, Math.max(0, parseInt(val) || 0));
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="市場價"
                        className="w-20 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-1.5 py-0.5 text-xs text-right focus:outline-none focus:border-[var(--ffxiv-highlight)] placeholder:text-[var(--ffxiv-muted)]/40"
                      />
                    </div>
                  )}
                  {itemData.totalBuyCostHQ > 0 && (
                    <div className={`text-xs ${customPrices[item.id] !== undefined ? 'text-orange-400' : 'text-yellow-400'}`}>
                      {customPrices[item.id] !== undefined ? '自訂' : '直購HQ'}: {formatPrice(itemData.totalBuyCostHQ)} gil
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
                  let directQty = 0;
                  for (const root of rootItems) {
                    directQty += materialChildren.get(root.item!.id)?.get(mat.item.id) ?? 0;
                  }
                  return (
                    <div
                      key={`ghost-${mat.item.id}`}
                      className="bg-[var(--ffxiv-card)] border border-dashed border-[var(--ffxiv-border)] rounded-lg p-3 min-w-[160px] max-w-[200px] opacity-50 cursor-pointer hover:opacity-70 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
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
                            ↓ 見 {mat.depth} 層 ({directQty})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {mats?.map((mat) => {
                  const iconUrl = getItemIconUrl(mat.item.icon);
                  const bestPrice = getBestPrice(mat, qualityFilter, customPrices);
                  const totalCost = bestPrice.price !== null ? bestPrice.price * mat.totalQuantity : null;
                  const isHighlighted = selectedRootIds.size > 0 && selectedMaterialIds.has(mat.item.id);
                  const status = materialStatuses.get(mat.item.id) ?? 'red';
                  const statusStyle = showOwned ? STATUS_COLORS[status] : null;
                  const defaultBorder = mat.usedBy.length > 1 ? 'border-[var(--ffxiv-highlight)]' : 'border-[var(--ffxiv-border)]';

                  return (
                    <div
                      key={mat.item.id}
                      ref={(el) => setMaterialRef(mat.item.id, el)}
                      className={`bg-[var(--ffxiv-card)] border rounded-lg min-w-[180px] max-w-[220px] transition-all duration-200 flex overflow-hidden ${statusStyle ? `${statusStyle.border} ${statusStyle.opacity ?? ''}` : defaultBorder}`}
                      style={{
                        opacity: selectedRootIds.size > 0 && !isHighlighted ? 0.4 : undefined,
                        transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                      }}
                      onClick={(e) => e.stopPropagation()}
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
                        {showOwned && <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs text-[var(--ffxiv-muted)]">擁有:</span>
                          <input
                            type="number"
                            min={0}
                            value={ownedMaterials[mat.item.id] ?? 0}
                            onChange={(e) => onOwnedChange(mat.item.id, Math.max(0, parseInt(e.target.value) || 0))}
                            onFocus={(e) => e.target.select()}
                            className="w-16 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-1.5 py-0.5 text-xs text-right focus:outline-none focus:border-[var(--ffxiv-highlight)]"
                          />
                        </div>}

                        {/* Custom price input */}
                        {showCustomPrices && <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs text-[var(--ffxiv-muted)]">自訂:</span>
                          <input
                            type="number"
                            min={0}
                            value={customPrices[mat.item.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || val === undefined) {
                                onCustomPriceClear(mat.item.id);
                              } else {
                                onCustomPriceChange(mat.item.id, Math.max(0, parseInt(val) || 0));
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            placeholder="市場價"
                            className="w-20 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-1.5 py-0.5 text-xs text-right focus:outline-none focus:border-[var(--ffxiv-highlight)] placeholder:text-[var(--ffxiv-muted)]/40"
                          />
                        </div>}

                        {/* Price info */}
                        <div className="text-xs space-y-0.5 mb-2">
                          {bestPrice.price !== null && (
                            <div className={bestPrice.isCustom ? 'text-orange-400' : bestPrice.isHQ ? 'text-yellow-400' : 'text-green-400'}>
                              {bestPrice.isCustom ? '自訂' : bestPrice.isHQ ? 'HQ' : 'NQ'}: {formatPrice(bestPrice.price)} gil
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

                        {/* Used by which items - with color dots */}
                        <div className="flex flex-wrap gap-1">
                          {mat.usedBy.map((usage) => {
                            const usageColor = rootColorMap.get(usage.itemId);
                            return (
                              <span
                                key={usage.itemId}
                                className="px-1.5 py-0.5 rounded text-xs flex items-center gap-1"
                                style={{
                                  backgroundColor: `${usageColor}20`,
                                  color: usageColor,
                                }}
                                title={`${usage.itemName} 需要 ${usage.quantity} 個`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: usageColor }}
                                />
                                {usage.quantity}
                              </span>
                            );
                          })}
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
    </div>
  );
}
