// Main crafting price tree component
import { useState, useCallback } from 'react';
import { useCraftingTree, type QualityFilter } from '../hooks/useCraftingTree';
import { CraftingTreeNodeComponent } from './CraftingTreeNode';
import { CraftingMaterialTreeView } from './CraftingMaterialTreeView';
import { formatPrice, formatRelativeTime } from '../services/universalisApi';

// Local storage key for owned materials (per item)
const OWNED_STORAGE_KEY_PREFIX = 'crafting-owned-';

interface CraftingPriceTreeProps {
  itemId: number;
}

type ViewMode = 'tree' | 'flat';

export function CraftingPriceTree({ itemId }: CraftingPriceTreeProps) {
  const [showCrystals, setShowCrystals] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('both');
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [showOwned, setShowOwned] = useState(false);
  const [ownedMaterials, setOwnedMaterials] = useState<Record<number, number>>(() => {
    // Load from localStorage on mount
    const storageKey = `${OWNED_STORAGE_KEY_PREFIX}${itemId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Save owned materials to localStorage when they change
  const handleOwnedChange = useCallback((matItemId: number, quantity: number) => {
    setOwnedMaterials(prev => {
      const next = { ...prev };
      if (quantity === 0) {
        delete next[matItemId];
      } else {
        next[matItemId] = quantity;
      }
      // Save to localStorage
      const storageKey = `${OWNED_STORAGE_KEY_PREFIX}${itemId}`;
      try {
        if (Object.keys(next).length === 0) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, [itemId]);

  const handleOwnedClear = useCallback(() => {
    setOwnedMaterials({});
    const storageKey = `${OWNED_STORAGE_KEY_PREFIX}${itemId}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
  }, [itemId]);

  // Always build tree with crystals included; each view filters independently
  const { tree, loading, error, totalCraftCost, totalBuyCostHQ, refresh } = useCraftingTree(
    itemId,
    true,
    qualityFilter
  );

  // Calculate savings (HQ buy vs cheapest craft)
  const craftSavings = totalBuyCostHQ - totalCraftCost;

  return (
    <div className="bg-[var(--ffxiv-bg)] rounded-lg p-4 border border-[var(--ffxiv-accent)]">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-[var(--ffxiv-card)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'tree'
                  ? 'bg-[var(--ffxiv-accent)] text-white'
                  : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)]'
              }`}
            >
              清單
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewMode === 'flat'
                  ? 'bg-[var(--ffxiv-accent)] text-white'
                  : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)]'
              }`}
            >
              樹狀
            </button>
          </div>

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

          {/* Show owned toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOwned}
              onChange={(e) => setShowOwned(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--ffxiv-accent)] bg-[var(--ffxiv-card)] text-[var(--ffxiv-highlight)] focus:ring-[var(--ffxiv-highlight)]"
            />
            <span className="text-[var(--ffxiv-muted)]">擁有數量</span>
          </label>
        </div>

        {/* Refresh and clear buttons */}
        <div className="flex items-center gap-4">
          {showOwned && Object.keys(ownedMaterials).length > 0 && (
            <button
              onClick={handleOwnedClear}
              className="text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-error)] transition-colors"
            >
              清除擁有數量
            </button>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="text-sm text-[var(--ffxiv-highlight)] hover:underline disabled:opacity-50"
          >
            {loading ? '載入中...' : '重新整理'}
          </button>
        </div>
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
              比較：直購HQ成品 vs 用最便宜素材製作（含NQ）
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <div className="text-xs text-[var(--ffxiv-muted)] mb-1">自製成本</div>
                <div className="text-lg font-medium text-blue-400">
                  {totalCraftCost > 0 ? `${formatPrice(totalCraftCost)} gil` : '-'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--ffxiv-muted)] mb-1">直購HQ成品</div>
                <div className="text-lg font-medium text-yellow-400">
                  {totalBuyCostHQ > 0 ? `${formatPrice(totalBuyCostHQ)} gil` : '-'}
                </div>
              </div>
            </div>

            {/* Savings comparison */}
            {totalCraftCost > 0 && totalBuyCostHQ > 0 && (
              <div className="flex justify-center gap-6 text-sm">
                {craftSavings > 0 ? (
                  <span className="text-blue-400">
                    自製省 {formatPrice(craftSavings)} gil
                  </span>
                ) : craftSavings < 0 ? (
                  <span className="text-yellow-400">
                    直購HQ省 {formatPrice(-craftSavings)} gil
                  </span>
                ) : (
                  <span className="text-[var(--ffxiv-muted)]">
                    價格相同
                  </span>
                )}
              </div>
            )}
            {totalCraftCost > 0 && totalBuyCostHQ === 0 && (
              <div className="text-center text-sm text-[var(--ffxiv-muted)]">
                市場無HQ上架
              </div>
            )}
            {totalCraftCost === 0 && totalBuyCostHQ > 0 && (
              <div className="text-center text-sm text-[var(--ffxiv-muted)]">
                無法計算製作成本
              </div>
            )}

            {/* Last upload time */}
            {tree.lastUploadTime && (
              <div className="text-xs text-[var(--ffxiv-muted)] text-right mt-2 pt-2 border-t border-[var(--ffxiv-accent)]/30">
                資料更新: {formatRelativeTime(tree.lastUploadTime)}
              </div>
            )}
          </div>

          {/* Materials view - based on view mode */}
          {tree.children.length > 0 && (
            <div>
              <div className="text-sm text-[var(--ffxiv-muted)] mb-3">
                {viewMode === 'tree' ? '材料清單' : '材料樹狀圖'}
              </div>

              {viewMode === 'tree' ? (
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
              ) : (
                <CraftingMaterialTreeView
                  tree={tree}
                  qualityFilter={qualityFilter}
                  showCrystals={showCrystals}
                  showOwned={showOwned}
                  ownedMaterials={ownedMaterials}
                  onOwnedChange={handleOwnedChange}
                />
              )}
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
