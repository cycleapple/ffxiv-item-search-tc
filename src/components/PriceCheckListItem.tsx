// Price check list item component
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PriceCheckListItemData } from '../hooks/usePriceCheckListData';
import type { QualityFilter } from '../hooks/useCraftingTree';
import { getItemIconUrl } from '../services/xivapiService';
import { formatPrice } from '../services/universalisApi';
import { CraftingTreeNodeComponent } from './CraftingTreeNode';
import { CopyButton } from './CopyButton';
import { ListingsTooltip } from './ListingsTooltip';

interface PriceCheckListItemProps {
  data: PriceCheckListItemData;
  showCrystals: boolean;
  qualityFilter: QualityFilter;
  onRemove: (itemId: number) => void;
}

function getRarityClass(rarity: number): string {
  switch (rarity) {
    case 1:
      return 'rarity-common';
    case 2:
      return 'rarity-uncommon';
    case 3:
      return 'rarity-rare';
    case 4:
      return 'rarity-relic';
    case 7:
      return 'rarity-aetherial';
    default:
      return 'rarity-common';
  }
}

export function PriceCheckListItemComponent({
  data,
  showCrystals,
  qualityFilter,
  onRemove,
}: PriceCheckListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { item, tree, totalCraftCost, totalBuyCostHQ } = data;

  if (!item) {
    return (
      <div className="bg-[var(--ffxiv-card)] rounded-lg p-3 border border-[var(--ffxiv-border)]">
        <div className="text-[var(--ffxiv-muted)]">物品載入中...</div>
      </div>
    );
  }

  const iconUrl = getItemIconUrl(item.icon);
  const hasTree = tree && tree.children.length > 0;
  const craftSavings = totalBuyCostHQ - totalCraftCost;

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg border border-[var(--ffxiv-border)] overflow-hidden">
      {/* Main item row */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Expand toggle */}
          {hasTree && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-highlight)] mt-1"
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {!hasTree && <div className="w-6" />}

          {/* Item icon */}
          <ListingsTooltip listings={tree?.listings}>
            <Link
              to={`/item/${item.id}`}
              className="flex-shrink-0 w-12 h-12 bg-[var(--ffxiv-bg)] rounded overflow-hidden"
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

          {/* Item info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/item/${item.id}`}
                className={`font-medium hover:text-[var(--ffxiv-highlight)] truncate ${getRarityClass(item.rarity)}`}
              >
                {item.name}
              </Link>
              <CopyButton text={item.name} />
              {item.isCraftable && (
                <span className="px-1.5 py-0.5 bg-[var(--ffxiv-accent)]/20 text-[var(--ffxiv-accent)] rounded text-xs">
                  製作
                </span>
              )}
            </div>

            {/* Price info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
              {totalBuyCostHQ > 0 && (
                <div className="text-yellow-400">
                  直購HQ: {formatPrice(totalBuyCostHQ)} gil
                </div>
              )}
              {totalCraftCost > 0 && (
                <div className="text-blue-400">
                  自製: {formatPrice(totalCraftCost)} gil
                </div>
              )}
              {totalCraftCost > 0 && totalBuyCostHQ > 0 && (
                <div className={craftSavings > 0 ? 'text-blue-400' : 'text-yellow-400'}>
                  {craftSavings > 0
                    ? `自製省 ${formatPrice(craftSavings)} gil`
                    : craftSavings < 0
                    ? `直購HQ省 ${formatPrice(-craftSavings)} gil`
                    : '價格相同'}
                </div>
              )}
              {totalBuyCostHQ === 0 && totalCraftCost === 0 && (
                <div className="text-[var(--ffxiv-muted)]">無價格資料</div>
              )}
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={() => onRemove(item.id)}
            className="flex-shrink-0 p-1.5 rounded text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-error)] hover:bg-[var(--ffxiv-error)]/10 transition-colors"
            title="移除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded crafting tree */}
      {hasTree && isExpanded && (
        <div className="border-t border-[var(--ffxiv-border)] p-3 bg-[var(--ffxiv-bg)]">
          <div className="text-xs text-[var(--ffxiv-muted)] mb-3">製作材料樹</div>
          <div className="space-y-2">
            {tree.children.map((child, index) => (
              <CraftingTreeNodeComponent
                key={`${child.item.id}-${index}`}
                node={child}
                showCrystals={showCrystals}
                qualityFilter={qualityFilter}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
