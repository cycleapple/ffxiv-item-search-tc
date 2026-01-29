// Tree view component showing aggregated materials with dependencies
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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
  depth: number
): void {
  for (const child of node.children) {
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
      // Keep the minimum depth (closest to root)
      existing.depth = Math.min(existing.depth, depth);
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
        directParents: [{ parentId: directParentId, rootId: rootItemId }],
      });
    }

    // Recursively collect from children - pass this material as the direct parent
    collectMaterials(child, child.item.id, rootItemId, rootItemName, materials, depth + 1);
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
  const [showLines, setShowLines] = useState(false);
  const [selectedRootIds, setSelectedRootIds] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const materialRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string; rootId: number }[]>([]);
  const [refsVersion, setRefsVersion] = useState(0);

  // Aggregate all materials from all items
  const { rootItems, materialsByDepth, maxDepth, rootColorMap, allMaterials } = useMemo(() => {
    const materials = new Map<number, AggregatedMaterial>();
    const roots: PriceCheckListItemData[] = [];
    const colorMap = new Map<number, string>();

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

    // Sort each depth group: non-crystals first (by quantity desc), then crystals last
    for (const mats of byDepth.values()) {
      mats.sort((a, b) => {
        const aCrystal = CRYSTAL_IDS.has(a.item.id) ? 1 : 0;
        const bCrystal = CRYSTAL_IDS.has(b.item.id) ? 1 : 0;
        if (aCrystal !== bCrystal) return aCrystal - bCrystal;
        return b.totalQuantity - a.totalQuantity;
      });
    }

    return { rootItems: roots, materialsByDepth: byDepth, maxDepth: max, rootColorMap: colorMap, allMaterials: materials };
  }, [items]);

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
      {/* Toggle for dependency lines */}
      <div className="flex items-center justify-end mb-4" onClick={(e) => e.stopPropagation()}>
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
          <div className="text-sm text-[var(--ffxiv-muted)] mb-3">查價物品</div>
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
                  const isHighlighted = selectedRootIds.size > 0 && selectedMaterialIds.has(mat.item.id);

                  return (
                    <div
                      key={mat.item.id}
                      ref={(el) => setMaterialRef(mat.item.id, el)}
                      className={`bg-[var(--ffxiv-card)] border rounded-lg p-3 min-w-[180px] max-w-[220px] transition-all duration-200 ${
                        mat.usedBy.length > 1
                          ? 'border-[var(--ffxiv-highlight)]'
                          : 'border-[var(--ffxiv-border)]'
                      }`}
                      style={{
                        opacity: selectedRootIds.size > 0 && !isHighlighted ? 0.4 : 1,
                        transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                      }}
                      onClick={(e) => e.stopPropagation()}
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
