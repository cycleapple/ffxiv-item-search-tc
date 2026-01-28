// Item list component for search results
import type { SearchResult } from '../types';
import { ItemCard } from './ItemCard';

interface ItemListProps {
  results: SearchResult[];
  loading?: boolean;
}

export function ItemList({ results, loading }: ItemListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)]"></div>
      </div>
    );
  }

  if (results.length === 0) {
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

  return (
    <div className="space-y-2">
      <div className="text-sm text-[var(--ffxiv-muted)] mb-3">
        找到 {results.length} 個物品
      </div>
      <div className="grid gap-2">
        {results.map((result) => (
          <ItemCard key={result.item.id} item={result.item} />
        ))}
      </div>
    </div>
  );
}
