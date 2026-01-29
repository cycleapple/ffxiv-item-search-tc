// Price check list page component
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePriceCheckList } from '../hooks/usePriceCheckList';
import { usePriceCheckListData, type QualityFilter } from '../hooks/usePriceCheckListData';
import { useOwnedMaterials } from '../hooks/useOwnedMaterials';
import { PriceCheckListItemComponent } from './PriceCheckListItem';
import { PriceCheckTreeView } from './PriceCheckTreeView';

type ViewMode = 'list' | 'tree';

export function PriceCheckListPage() {
  const navigate = useNavigate();
  const { list, removeItem, clearList, updateQuantity } = usePriceCheckList();
  const { ownedMaterials, setOwned, clearAll: clearOwned } = useOwnedMaterials();
  const [showCrystals, setShowCrystals] = useState(false);
  const [showOwned, setShowOwned] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>('both');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');

  const {
    items,
    loading,
    error,
    refresh,
  } = usePriceCheckListData(list, showCrystals, qualityFilter);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回搜尋
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--ffxiv-text)]">
          查價清單 ({list.length})
        </h1>
        {list.length > 0 && (
          <button
            onClick={clearList}
            className="px-3 py-1.5 text-sm text-[var(--ffxiv-error)] hover:bg-[var(--ffxiv-error)]/10 rounded transition-colors"
          >
            清空清單
          </button>
        )}
      </div>

      {/* Controls */}
      {list.length > 0 && (
        <div className="flex items-center justify-between p-4 mb-4 bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)] flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-[var(--ffxiv-bg)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--ffxiv-accent)] text-white'
                    : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  清單
                </span>
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-[var(--ffxiv-accent)] text-white'
                    : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  樹狀
                </span>
              </button>
            </div>

            {/* Quality filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--ffxiv-muted)]">品質:</label>
              <select
                value={qualityFilter}
                onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
                className="bg-[var(--ffxiv-card)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--ffxiv-highlight)]"
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
                className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-card)] text-[var(--ffxiv-highlight)] focus:ring-[var(--ffxiv-highlight)]"
              />
              <span className="text-[var(--ffxiv-muted)]">顯示水晶</span>
            </label>

            {/* Show owned toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOwned}
                onChange={(e) => setShowOwned(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-card)] text-[var(--ffxiv-highlight)] focus:ring-[var(--ffxiv-highlight)]"
              />
              <span className="text-[var(--ffxiv-muted)]">擁有數量</span>
            </label>
          </div>

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={loading}
            className="text-sm text-[var(--ffxiv-highlight)] hover:underline disabled:opacity-50"
          >
            {loading ? '載入中...' : '重新整理價格'}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && list.length > 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ffxiv-highlight)] border-t-transparent"></div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-8 text-[var(--ffxiv-muted)]">{error}</div>
      )}

      {/* Empty state */}
      {list.length === 0 && (
        <div className="text-center py-16 bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)]">
          <svg className="w-20 h-20 mx-auto text-[var(--ffxiv-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div className="text-lg text-[var(--ffxiv-muted)] mb-2">清單是空的</div>
          <div className="text-sm text-[var(--ffxiv-muted)] mb-4">
            在搜尋結果或物品詳情頁點擊「加入查價」來新增物品
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded-lg transition-colors"
          >
            開始搜尋物品
          </Link>
        </div>
      )}

      {/* Content based on view mode */}
      {!loading && list.length > 0 && (
        <>
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {items.map((data) => (
                <PriceCheckListItemComponent
                  key={data.listItem.itemId}
                  data={data}
                  showCrystals={showCrystals}
                  qualityFilter={qualityFilter}
                  onRemove={removeItem}
                />
              ))}
            </div>
          ) : (
            <PriceCheckTreeView
              items={items}
              qualityFilter={qualityFilter}
              onRemove={removeItem}
              ownedMaterials={ownedMaterials}
              onOwnedChange={setOwned}
              onOwnedClear={clearOwned}
              onQuantityChange={updateQuantity}
              showOwned={showOwned}
            />
          )}
        </>
      )}
    </div>
  );
}
