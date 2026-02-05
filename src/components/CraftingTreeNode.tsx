// Recursive crafting tree node component
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { CraftingTreeNode as TreeNodeType } from '../types';
import type { QualityFilter } from '../hooks/useCraftingTree';
import { getItemIconUrl } from '../services/xivapiService';
import { formatPrice } from '../services/universalisApi';
import { CopyButton } from './CopyButton';
import { ListingsTooltip } from './ListingsTooltip';

// Crystal item IDs (2-19)
const CRYSTAL_IDS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

interface CraftingTreeNodeProps {
  node: TreeNodeType;
  showCrystals: boolean;
  qualityFilter: QualityFilter;
}

/**
 * Get the best buy price and server based on quality filter
 */
function getBestPrice(
  node: TreeNodeType,
  qualityFilter: QualityFilter
): { price: number | null; server: string; isHQ: boolean } {
  const nqPrice = node.marketPriceNQ;
  const hqPrice = node.marketPriceHQ;

  if (qualityFilter === 'nq') {
    return { price: nqPrice, server: node.serverNQ, isHQ: false };
  } else if (qualityFilter === 'hq') {
    return { price: hqPrice, server: node.serverHQ, isHQ: true };
  } else {
    // 'both' - return the cheaper one
    if (nqPrice !== null && hqPrice !== null) {
      if (hqPrice < nqPrice) {
        return { price: hqPrice, server: node.serverHQ, isHQ: true };
      }
      return { price: nqPrice, server: node.serverNQ, isHQ: false };
    }
    if (hqPrice !== null) {
      return { price: hqPrice, server: node.serverHQ, isHQ: true };
    }
    return { price: nqPrice, server: node.serverNQ, isHQ: false };
  }
}

export function CraftingTreeNodeComponent({ node, showCrystals, qualityFilter }: CraftingTreeNodeProps) {
  const [isCollapsed, setIsCollapsed] = useState(node.depth > 2);

  // Filter children based on showCrystals
  const filteredChildren = useMemo(() => {
    if (showCrystals) return node.children;
    return node.children.filter(child => !CRYSTAL_IDS.has(child.item.id));
  }, [node.children, showCrystals]);

  const hasChildren = filteredChildren.length > 0;
  const iconUrl = getItemIconUrl(node.item.icon);

  // Get best price based on filter
  const bestPrice = getBestPrice(node, qualityFilter);
  const buyCost = bestPrice.price !== null ? bestPrice.price * node.quantity : null;
  const craftCost = node.craftCost;

  return (
    <div className="relative">
      {/* Node content */}
      <div className={`
        flex items-start gap-3 p-3 rounded-lg
        bg-[var(--ffxiv-card)] border border-[var(--ffxiv-accent)]
        hover:border-[var(--ffxiv-highlight)] transition-colors
        ${node.depth > 0 ? 'ml-10' : ''}
      `}>
        {/* Item icon with tooltip */}
        <ListingsTooltip listings={node.listings} lastUploadTime={node.lastUploadTime}>
          <Link
            to={`/item/${node.item.id}`}
            className="flex-shrink-0 w-10 h-10 bg-[var(--ffxiv-bg)] rounded overflow-hidden relative"
          >
            <img
              src={iconUrl}
              alt={node.item.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getItemIconUrl(0);
              }}
            />
            {/* Quantity badge */}
            {node.quantity > 1 && (
              <span className="absolute -top-1 -right-1 bg-[var(--ffxiv-highlight)] text-white text-xs px-1 rounded">
                x{node.quantity}
              </span>
            )}
          </Link>
        </ListingsTooltip>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/item/${node.item.id}`}
              className="text-sm font-medium hover:text-[var(--ffxiv-highlight)] truncate"
            >
              {node.item.name}
            </Link>
            <CopyButton text={node.item.name} />
            {node.recipe && (
              <span className="text-xs text-[var(--ffxiv-muted)]">
                ({node.recipe.craftTypeName})
              </span>
            )}
          </div>

          {/* Price info - show both NQ and HQ when filter is 'both' */}
          <div className="flex flex-col gap-1 mt-1 text-xs">
            {qualityFilter === 'both' ? (
              <>
                {/* NQ Price */}
                {node.marketPriceNQ !== null && (
                  <div className="text-green-400">
                    NQ: {formatPrice(node.marketPriceNQ)}
                    {node.quantity > 1 && (
                      <span className="text-[var(--ffxiv-muted)]"> x{node.quantity} = {formatPrice(node.marketPriceNQ * node.quantity)}</span>
                    )}
                    <span className="text-[var(--ffxiv-muted)]"> gil</span>
                    {node.serverNQ && (
                      <span className="text-[var(--ffxiv-muted)] ml-1">@ {node.serverNQ}</span>
                    )}
                  </div>
                )}
                {/* HQ Price */}
                {node.marketPriceHQ !== null && (
                  <div className="text-yellow-400">
                    HQ: {formatPrice(node.marketPriceHQ)}
                    {node.quantity > 1 && (
                      <span className="text-[var(--ffxiv-muted)]"> x{node.quantity} = {formatPrice(node.marketPriceHQ * node.quantity)}</span>
                    )}
                    <span className="text-[var(--ffxiv-muted)]"> gil</span>
                    {node.serverHQ && (
                      <span className="text-[var(--ffxiv-muted)] ml-1">@ {node.serverHQ}</span>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Single quality display */
              bestPrice.price !== null && (
                <div className={bestPrice.isHQ ? 'text-yellow-400' : 'text-green-400'}>
                  {bestPrice.isHQ ? 'HQ' : 'NQ'}: {formatPrice(bestPrice.price)}
                  {node.quantity > 1 && (
                    <span className="text-[var(--ffxiv-muted)]"> x{node.quantity} = {formatPrice(buyCost!)}</span>
                  )}
                  <span className="text-[var(--ffxiv-muted)]"> gil</span>
                  {bestPrice.server && (
                    <span className="text-[var(--ffxiv-muted)] ml-1">@ {bestPrice.server}</span>
                  )}
                </div>
              )
            )}

            {/* Craft cost */}
            {craftCost !== null && (
              <div className="text-blue-400">
                製作: {formatPrice(craftCost)} gil
              </div>
            )}
          </div>

          {/* Savings comparison */}
          {buyCost !== null && craftCost !== null && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {craftCost < buyCost ? (
                <span className="text-blue-400">
                  自製省 {formatPrice(buyCost - craftCost)} gil
                </span>
              ) : craftCost > buyCost ? (
                <span className="text-yellow-400">
                  直購省 {formatPrice(craftCost - buyCost)} gil
                </span>
              ) : (
                <span className="text-[var(--ffxiv-muted)]">
                  價格相同
                </span>
              )}
            </div>
          )}
        </div>

        {/* Collapse toggle for nodes with children - right side */}
        {hasChildren && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-highlight)] self-center"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="mt-2 border-l-2 border-[var(--ffxiv-accent)] ml-6 pl-4 space-y-2">
          {filteredChildren.map((child, index) => (
            <CraftingTreeNodeComponent
              key={`${child.item.id}-${index}`}
              node={child}
              showCrystals={showCrystals}
              qualityFilter={qualityFilter}
            />
          ))}
        </div>
      )}

      {/* Collapsed indicator */}
      {hasChildren && isCollapsed && (
        <div className="ml-14 mt-1 text-xs text-[var(--ffxiv-muted)]">
          ({filteredChildren.length} 個材料已收合)
        </div>
      )}
    </div>
  );
}
