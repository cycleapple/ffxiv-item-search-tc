// Advanced filter panel component - similar to Teamcraft
import { useState, useEffect } from 'react';
import type { SearchFilters, ItemCategory } from '../types';
import { getAllPatches } from '../services/searchService';

interface FilterPanelProps {
  filters: SearchFilters;
  categories: ItemCategory[];
  onFilterChange: (updates: Partial<SearchFilters>) => void;
  onReset: () => void;
}

// Rarity options with colors
const RARITY_OPTIONS = [
  { value: 1, label: '普通', color: 'text-gray-300' },
  { value: 2, label: '綠色', color: 'text-green-400' },
  { value: 3, label: '藍色', color: 'text-blue-400' },
  { value: 4, label: '紫色', color: 'text-purple-400' },
  { value: 7, label: '粉色', color: 'text-pink-400' },
];

export function FilterPanel({ filters, categories, onFilterChange, onReset }: FilterPanelProps) {
  const [patches, setPatches] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load available patches
  useEffect(() => {
    setPatches(getAllPatches());
  }, []);

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.minLevel !== 1 ||
    filters.maxLevel !== 999 ||
    filters.minEquipLevel !== 1 ||
    filters.maxEquipLevel !== 100 ||
    filters.craftableOnly ||
    filters.gatherableOnly ||
    filters.canBeHq !== null ||
    filters.tradeable !== null ||
    filters.rarity !== null ||
    filters.patch !== null;

  // Count active filters
  const activeFilterCount = [
    filters.categoryId !== null,
    filters.minLevel !== 1 || filters.maxLevel !== 999,
    filters.minEquipLevel !== 1 || filters.maxEquipLevel !== 100,
    filters.craftableOnly,
    filters.gatherableOnly,
    filters.canBeHq !== null,
    filters.tradeable !== null,
    filters.rarity !== null,
    filters.patch !== null,
  ].filter(Boolean).length;

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg border border-[var(--ffxiv-border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--ffxiv-bg-tertiary)] border-b border-[var(--ffxiv-border)]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[var(--ffxiv-text)]">進階篩選</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-[var(--ffxiv-accent)] text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs text-[var(--ffxiv-accent)] hover:text-[var(--ffxiv-accent-hover)] hover:underline transition-colors"
            >
              重置全部
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)] transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main filters (always visible) */}
      <div className="p-4 space-y-4">
        {/* Row 1: Category and Rarity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs text-[var(--ffxiv-muted)] mb-1.5">物品分類</label>
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

          {/* Rarity Filter */}
          <div>
            <label className="block text-xs text-[var(--ffxiv-muted)] mb-1.5">稀有度</label>
            <select
              value={filters.rarity ?? ''}
              onChange={(e) =>
                onFilterChange({
                  rarity: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded-lg px-3 py-2 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)] cursor-pointer"
            >
              <option value="">全部稀有度</option>
              {RARITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Item Level Range */}
        <div>
          <label className="block text-xs text-[var(--ffxiv-muted)] mb-1.5">
            品級 (iLv): <span className="text-[var(--ffxiv-highlight)]">{filters.minLevel}</span> - <span className="text-[var(--ffxiv-highlight)]">{filters.maxLevel}</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="999"
              value={filters.minLevel}
              onChange={(e) =>
                onFilterChange({
                  minLevel: Math.max(1, Math.min(parseInt(e.target.value) || 1, filters.maxLevel)),
                })
              }
              className="w-20 bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-2 py-1.5 text-sm text-center text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
            />
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
            <input
              type="number"
              min="1"
              max="999"
              value={filters.maxLevel}
              onChange={(e) =>
                onFilterChange({
                  maxLevel: Math.max(parseInt(e.target.value) || 999, filters.minLevel),
                })
              }
              className="w-20 bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-2 py-1.5 text-sm text-center text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
            />
          </div>
        </div>

        {/* Row 3: Toggle filters */}
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg bg-[var(--ffxiv-bg-tertiary)] hover:bg-[var(--ffxiv-card-hover)] transition-colors">
            <input
              type="checkbox"
              checked={filters.craftableOnly}
              onChange={(e) => onFilterChange({ craftableOnly: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)] accent-[var(--ffxiv-accent)]"
            />
            <span className="text-sm text-[var(--ffxiv-text-secondary)]">可製作</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg bg-[var(--ffxiv-bg-tertiary)] hover:bg-[var(--ffxiv-card-hover)] transition-colors">
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

      {/* Expanded filters */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--ffxiv-border)] pt-4">
          {/* Row 4: Equip Level Range */}
          <div>
            <label className="block text-xs text-[var(--ffxiv-muted)] mb-1.5">
              裝備等級: <span className="text-[var(--ffxiv-highlight)]">{filters.minEquipLevel}</span> - <span className="text-[var(--ffxiv-highlight)]">{filters.maxEquipLevel}</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                value={filters.minEquipLevel}
                onChange={(e) =>
                  onFilterChange({
                    minEquipLevel: Math.max(1, Math.min(parseInt(e.target.value) || 1, filters.maxEquipLevel)),
                  })
                }
                className="w-16 bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-2 py-1.5 text-sm text-center text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
              />
              <input
                type="range"
                min="1"
                max="100"
                value={filters.minEquipLevel}
                onChange={(e) =>
                  onFilterChange({
                    minEquipLevel: Math.min(parseInt(e.target.value), filters.maxEquipLevel),
                  })
                }
                className="flex-1 accent-[var(--ffxiv-accent)]"
              />
              <input
                type="range"
                min="1"
                max="100"
                value={filters.maxEquipLevel}
                onChange={(e) =>
                  onFilterChange({
                    maxEquipLevel: Math.max(parseInt(e.target.value), filters.minEquipLevel),
                  })
                }
                className="flex-1 accent-[var(--ffxiv-accent)]"
              />
              <input
                type="number"
                min="1"
                max="100"
                value={filters.maxEquipLevel}
                onChange={(e) =>
                  onFilterChange({
                    maxEquipLevel: Math.max(parseInt(e.target.value) || 100, filters.minEquipLevel),
                  })
                }
                className="w-16 bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-2 py-1.5 text-sm text-center text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
              />
            </div>
          </div>

          {/* Row 5: Patch and extra toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patch Filter */}
            <div>
              <label className="block text-xs text-[var(--ffxiv-muted)] mb-1.5">版本</label>
              <select
                value={filters.patch ?? ''}
                onChange={(e) =>
                  onFilterChange({
                    patch: e.target.value || null,
                  })
                }
                className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded-lg px-3 py-2 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)] cursor-pointer"
              >
                <option value="">全部版本</option>
                {patches.map((patch) => (
                  <option key={patch} value={patch}>
                    {patch}
                  </option>
                ))}
              </select>
            </div>

            {/* HQ and Tradeable toggles */}
            <div className="flex flex-col gap-2">
              <label className="block text-xs text-[var(--ffxiv-muted)]">其他條件</label>
              <div className="flex flex-wrap gap-2">
                {/* Can be HQ */}
                <button
                  onClick={() => {
                    const newValue = filters.canBeHq === null ? true : filters.canBeHq === true ? false : null;
                    onFilterChange({ canBeHq: newValue });
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    filters.canBeHq === true
                      ? 'bg-[var(--ffxiv-accent)] border-[var(--ffxiv-accent)] text-white'
                      : filters.canBeHq === false
                      ? 'bg-red-900/30 border-red-500/50 text-red-400'
                      : 'bg-[var(--ffxiv-bg-tertiary)] border-[var(--ffxiv-border)] text-[var(--ffxiv-text-secondary)]'
                  }`}
                >
                  {filters.canBeHq === null ? 'HQ' : filters.canBeHq ? 'HQ 可' : 'HQ 否'}
                </button>

                {/* Tradeable */}
                <button
                  onClick={() => {
                    const newValue = filters.tradeable === null ? true : filters.tradeable === true ? false : null;
                    onFilterChange({ tradeable: newValue });
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    filters.tradeable === true
                      ? 'bg-[var(--ffxiv-accent)] border-[var(--ffxiv-accent)] text-white'
                      : filters.tradeable === false
                      ? 'bg-red-900/30 border-red-500/50 text-red-400'
                      : 'bg-[var(--ffxiv-bg-tertiary)] border-[var(--ffxiv-border)] text-[var(--ffxiv-text-secondary)]'
                  }`}
                >
                  {filters.tradeable === null ? '可交易' : filters.tradeable ? '可交易' : '不可交易'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
