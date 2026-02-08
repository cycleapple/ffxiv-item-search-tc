// Item list component for search results
import type { SearchResult } from '../types';
import { ItemCard } from './ItemCard';

interface ItemListProps {
  results: SearchResult[];
  totalResults?: number;
  loading?: boolean;
  hasSearched?: boolean;  // Whether user has initiated a search
  hasMore?: boolean;      // Whether there are more results to load
  onLoadMore?: () => void;
  query?: string;
  onItemSelect?: (id: number) => void;
  selectedItemId?: number | null;
}

export function ItemList({
  results,
  totalResults,
  loading,
  hasSearched = true,
  hasMore = false,
  onLoadMore,
  query,
  onItemSelect,
  selectedItemId,
}: ItemListProps) {
  // Initial state - no search performed yet
  if (!hasSearched) {
    return (
      <div className="text-center py-16">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-[var(--ffxiv-accent)] opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-[var(--ffxiv-text)] mb-2">
          搜尋 FFXIV 物品
        </h2>
        <p className="text-[var(--ffxiv-muted)] mb-4 max-w-md mx-auto">
          輸入物品名稱開始搜尋
        </p>
        <p className="text-xs text-[var(--ffxiv-muted)]">
          支援繁中、簡中、日文、英文搜尋
        </p>
        <p className="mt-2 text-xs text-[var(--ffxiv-muted)]">
          💡 可使用追蹤清單比價、採集鬧鐘提醒、製作模擬器
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)]"></div>
        </div>
      );
    }
    return (
      <div className="text-center py-12 text-[var(--ffxiv-muted)]">
        <svg
          className="mx-auto h-12 w-12 mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>找不到符合條件的物品</p>
        <p className="text-sm mt-1">請嘗試不同的搜尋關鍵字或篩選條件</p>
      </div>
    );
  }

  const total = totalResults ?? results.length;
  const displayCount = results.length;

  return (
    <div className={`space-y-2 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>
      <div className="text-sm text-[var(--ffxiv-muted)] mb-3 flex items-center gap-2">
        {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)]"></div>}
        {hasMore ? (
          <>顯示 {displayCount} / {total} 個物品</>
        ) : (
          <>找到 {total} 個物品</>
        )}
      </div>
      <div className="grid gap-2">
        {results.map((result) => (
          <ItemCard key={result.item.id} item={result.item} query={query} onSelect={onItemSelect} isSelected={selectedItemId === result.item.id} />
        ))}
      </div>
      {hasMore && onLoadMore && (
        <div className="pt-4 text-center">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded-lg transition-colors"
          >
            載入更多 ({total - displayCount} 個剩餘)
          </button>
        </div>
      )}
    </div>
  );
}
