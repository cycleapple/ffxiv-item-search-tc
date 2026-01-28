// Filter panel component
import type { SearchFilters, ItemCategory } from '../types';

interface FilterPanelProps {
  filters: SearchFilters;
  categories: ItemCategory[];
  onFilterChange: (updates: Partial<SearchFilters>) => void;
  onReset: () => void;
}

export function FilterPanel({ filters, categories, onFilterChange, onReset }: FilterPanelProps) {
  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.minLevel !== 1 ||
    filters.maxLevel !== 999 ||
    filters.craftableOnly ||
    filters.gatherableOnly;

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--ffxiv-text)]">篩選條件</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-[var(--ffxiv-accent)] hover:text-[var(--ffxiv-accent-hover)] hover:underline transition-colors"
          >
            重置篩選
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Category Filter */}
        <div>
          <label className="block text-xs text-[var(--ffxiv-muted)] mb-1">物品分類</label>
          <select
            value={filters.categoryId ?? ''}
            onChange={(e) =>
              onFilterChange({
                categoryId: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded-lg px-3 py-2 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)] cursor-pointer"
          >
            <option value="">全部分類</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level Range */}
        <div>
          <label className="block text-xs text-[var(--ffxiv-muted)] mb-1">
            物品等級: <span className="text-[var(--ffxiv-highlight)]">{filters.minLevel}</span> - <span className="text-[var(--ffxiv-highlight)]">{filters.maxLevel}</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="999"
              value={filters.minLevel}
              onChange={(e) =>
                onFilterChange({
                  minLevel: Math.min(parseInt(e.target.value), filters.maxLevel),
                })
              }
              className="flex-1 accent-[var(--ffxiv-accent)]"
            />
            <input
              type="range"
              min="1"
              max="999"
              value={filters.maxLevel}
              onChange={(e) =>
                onFilterChange({
                  maxLevel: Math.max(parseInt(e.target.value), filters.minLevel),
                })
              }
              className="flex-1 accent-[var(--ffxiv-accent)]"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.craftableOnly}
              onChange={(e) => onFilterChange({ craftableOnly: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)] accent-[var(--ffxiv-accent)]"
            />
            <span className="text-sm text-[var(--ffxiv-text-secondary)]">可製作</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.gatherableOnly}
              onChange={(e) => onFilterChange({ gatherableOnly: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)] accent-[var(--ffxiv-accent)]"
            />
            <span className="text-sm text-[var(--ffxiv-text-secondary)]">可採集</span>
          </label>
        </div>
      </div>
    </div>
  );
}
