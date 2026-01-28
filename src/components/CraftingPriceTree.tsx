// Main crafting price tree component
import { useState } from 'react';
import { useCraftingTree, type QualityFilter } from '../hooks/useCraftingTree';
import { CraftingTreeNodeComponent } from './CraftingTreeNode';
import { formatPrice } from '../services/universalisApi';

interface CraftingPriceTreeProps {
  itemId: number;
  isUntradable?: boolean;
}

export function CraftingPriceTree({ itemId, isUntradable }: CraftingPriceTreeProps) {
  const [showCrystals, setShowCrystals] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('both');

  const { tree, loading, error, totalCraftCost, totalBuyCost, refresh } = useCraftingTree(
    itemId,
    showCrystals,
    qualityFilter
  );

  if (isUntradable) {
    return (
      <div className="bg-[var(--ffxiv-bg)] rounded-lg p-4 border border-[var(--ffxiv-accent)]">
        <div className="text-center text-[var(--ffxiv-muted)]">此物品無法交易</div>
      </div>
    );
  }

  // Calculate savings
  const craftSavings = totalBuyCost - totalCraftCost;
  const buySavings = totalCraftCost - totalBuyCost;

  return (
    <div className="bg-[var(--ffxiv-bg)] rounded-lg p-4 border border-[var(--ffxiv-accent)]">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          {/* Quality filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--ffxiv-muted)]">品質:</label>
            <select
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
              className="bg-[var(--ffxiv-card)] border border-[var(--ffxiv-accent)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--ffxiv-highlight)]"
            >
              <option value="both">NQ + HQ (取便宜)</option>
              <option value="nq">只看 NQ</option>
              <option value="hq">只看 HQ</option>
            </select>
          </div>

          {/* Show crystals toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showCrystals}
              onChange={(e) => setShowCrystals(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--ffxiv-accent)] bg-[var(--ffxiv-card)] text-[var(--ffxiv-highlight)] focus:ring-[var(--ffxiv-highlight)]"
            />
            <span className="text-[var(--ffxiv-muted)]">顯示水晶</span>
          </label>
        </div>

        {/* Refresh button */}
        <button
          onClick={refresh}
          disabled={loading}
          className="text-sm text-[var(--ffxiv-highlight)] hover:underline disabled:opacity-50"
        >
          {loading ? '載入中...' : '重新整理'}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--ffxiv-highlight)] border-t-transparent"></div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-4 text-[var(--ffxiv-muted)]">{error}</div>
      )}

      {/* Tree content */}
      {tree && !loading && (
        <div className="space-y-4">
          {/* Cost summary */}
          <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-accent)]">
            <div className="text-sm text-[var(--ffxiv-muted)] mb-3">
              以全伺服器最低價計算（每項材料取各伺服器最便宜的價格）
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <div className="text-xs text-[var(--ffxiv-muted)] mb-1">最便宜製作</div>
                <div className="text-lg font-medium text-blue-400">
                  {totalCraftCost > 0 ? `${formatPrice(totalCraftCost)} gil` : '-'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--ffxiv-muted)] mb-1">直購成品</div>
                <div className="text-lg font-medium text-yellow-400">
                  {totalBuyCost > 0 ? `${formatPrice(totalBuyCost)} gil` : '-'}
                </div>
              </div>
            </div>

            {/* Savings comparison */}
            {totalCraftCost > 0 && totalBuyCost > 0 && (
              <div className="flex justify-center gap-6 text-sm">
                {craftSavings > 0 ? (
                  <span className="text-blue-400">
                    自製省 {formatPrice(craftSavings)} gil
                  </span>
                ) : craftSavings < 0 ? (
                  <span className="text-yellow-400">
                    直購省 {formatPrice(buySavings)} gil
                  </span>
                ) : (
                  <span className="text-[var(--ffxiv-muted)]">
                    價格相同
                  </span>
                )}
              </div>
            )}
            {totalCraftCost > 0 && totalBuyCost === 0 && (
              <div className="text-center text-sm text-[var(--ffxiv-muted)]">
                市場無上架
              </div>
            )}
            {totalCraftCost === 0 && totalBuyCost > 0 && (
              <div className="text-center text-sm text-[var(--ffxiv-muted)]">
                無法計算製作成本
              </div>
            )}
          </div>

          {/* Materials tree */}
          {tree.children.length > 0 && (
            <div>
              <div className="text-sm text-[var(--ffxiv-muted)] mb-3">材料樹狀圖</div>
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

          {/* No recipe message */}
          {tree.children.length === 0 && (
            <div className="text-center text-[var(--ffxiv-muted)] py-4">
              此物品無製作配方或無材料
            </div>
          )}
        </div>
      )}
    </div>
  );
}
