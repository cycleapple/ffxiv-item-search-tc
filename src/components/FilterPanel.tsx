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

// Rarity options
const RARITY_OPTIONS = [
  { value: 1, label: '普通' },
  { value: 2, label: '綠色' },
  { value: 3, label: '藍色' },
  { value: 4, label: '紫色' },
  { value: 7, label: '粉色' },
];

// Job data for icons - use abbreviation for garlandtools
const JOB_CATEGORIES = [
  {
    name: '坦克',
    jobs: [
      { abbr: 'PLD', name: '騎士' },
      { abbr: 'WAR', name: '戰士' },
      { abbr: 'DRK', name: '暗黑騎士' },
      { abbr: 'GNB', name: '絕槍戰士' },
    ],
  },
  {
    name: '治療',
    jobs: [
      { abbr: 'WHM', name: '白魔法師' },
      { abbr: 'SCH', name: '學者' },
      { abbr: 'AST', name: '占星術士' },
      { abbr: 'SGE', name: '賢者' },
    ],
  },
  {
    name: '近戰',
    jobs: [
      { abbr: 'MNK', name: '武僧' },
      { abbr: 'DRG', name: '龍騎士' },
      { abbr: 'NIN', name: '忍者' },
      { abbr: 'SAM', name: '武士' },
      { abbr: 'RPR', name: '鐮刀師' },
      { abbr: 'VPR', name: '蝮蛇劍士' },
    ],
  },
  {
    name: '遠程',
    jobs: [
      { abbr: 'BRD', name: '吟遊詩人' },
      { abbr: 'MCH', name: '機工士' },
      { abbr: 'DNC', name: '舞者' },
    ],
  },
  {
    name: '法系',
    jobs: [
      { abbr: 'BLM', name: '黑魔法師' },
      { abbr: 'SMN', name: '召喚師' },
      { abbr: 'RDM', name: '赤魔法師' },
      { abbr: 'PCT', name: '繪靈法師' },
      { abbr: 'BLU', name: '青魔法師' },
    ],
  },
  {
    name: '製作',
    jobs: [
      { abbr: 'CRP', name: '木工師' },
      { abbr: 'BSM', name: '鍛造師' },
      { abbr: 'ARM', name: '甲冑師' },
      { abbr: 'GSM', name: '金工師' },
      { abbr: 'LTW', name: '皮革師' },
      { abbr: 'WVR', name: '裁縫師' },
      { abbr: 'ALC', name: '鍊金術師' },
      { abbr: 'CUL', name: '烹調師' },
    ],
  },
  {
    name: '採集',
    jobs: [
      { abbr: 'MIN', name: '採礦師' },
      { abbr: 'BTN', name: '園藝師' },
      { abbr: 'FSH', name: '釣魚師' },
    ],
  },
];

// Get job icon URL from garlandtools (has all jobs including newer ones)
function getJobIconUrl(abbr: string): string {
  return `https://garlandtools.org/files/icons/job/${abbr}.png`;
}

export function FilterPanel({ filters, categories, onFilterChange, onReset }: FilterPanelProps) {
  const [patches, setPatches] = useState<string[]>([]);

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
    filters.selectedJobs.length > 0 ||
    filters.craftableOnly ||
    filters.gatherableOnly ||
    filters.canBeHq !== null ||
    filters.tradeable !== null ||
    filters.rarity !== null ||
    filters.patch !== null;

  // Toggle job selection
  const toggleJob = (abbr: string) => {
    const newJobs = filters.selectedJobs.includes(abbr)
      ? filters.selectedJobs.filter(j => j !== abbr)
      : [...filters.selectedJobs, abbr];
    onFilterChange({ selectedJobs: newJobs });
  };

  // Select all jobs in a category
  const selectCategory = (categoryJobs: { abbr: string }[]) => {
    const categoryAbbrs = categoryJobs.map(j => j.abbr);
    const allSelected = categoryAbbrs.every(abbr => filters.selectedJobs.includes(abbr));

    if (allSelected) {
      // Deselect all in category
      onFilterChange({
        selectedJobs: filters.selectedJobs.filter(j => !categoryAbbrs.includes(j))
      });
    } else {
      // Select all in category
      const newJobs = [...new Set([...filters.selectedJobs, ...categoryAbbrs])];
      onFilterChange({ selectedJobs: newJobs });
    }
  };

  // Clear all job selections
  const clearJobs = () => {
    onFilterChange({ selectedJobs: [] });
  };

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg border border-[var(--ffxiv-border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--ffxiv-bg-tertiary)] border-b border-[var(--ffxiv-border)]">
        <h3 className="text-sm font-medium text-[var(--ffxiv-text)]">篩選條件</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-[var(--ffxiv-accent)] hover:text-[var(--ffxiv-accent-hover)] hover:underline transition-colors"
          >
            重置全部
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Row 1: Category, Rarity, Patch */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-3 py-1.5 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)] cursor-pointer"
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
              className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-3 py-1.5 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)] cursor-pointer"
            >
              <option value="">全部稀有度</option>
              {RARITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

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
              className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-3 py-1.5 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)] cursor-pointer"
            >
              <option value="">全部版本</option>
              {patches.map((patch) => (
                <option key={patch} value={patch}>
                  {patch}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Level ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Item Level Range */}
          <div>
            <label className="block text-xs text-[var(--ffxiv-muted)] mb-1.5">品級 (iLv)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="999"
                value={filters.minLevel}
                onChange={(e) =>
                  onFilterChange({
                    minLevel: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-3 py-1.5 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
                placeholder="最小"
              />
              <span className="text-[var(--ffxiv-muted)]">-</span>
              <input
                type="number"
                min="1"
                max="999"
                value={filters.maxLevel}
                onChange={(e) =>
                  onFilterChange({
                    maxLevel: Math.max(1, parseInt(e.target.value) || 999),
                  })
                }
                className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-3 py-1.5 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
                placeholder="最大"
              />
            </div>
          </div>

          {/* Equip Level Range */}
          <div>
            <label className="block text-xs text-[var(--ffxiv-muted)] mb-1.5">裝備等級</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={filters.minEquipLevel}
                onChange={(e) =>
                  onFilterChange({
                    minEquipLevel: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-3 py-1.5 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
                placeholder="最小"
              />
              <span className="text-[var(--ffxiv-muted)]">-</span>
              <input
                type="number"
                min="1"
                max="100"
                value={filters.maxEquipLevel}
                onChange={(e) =>
                  onFilterChange({
                    maxEquipLevel: Math.max(1, parseInt(e.target.value) || 100),
                  })
                }
                className="w-full bg-[var(--ffxiv-bg-tertiary)] border border-[var(--ffxiv-border)] rounded px-3 py-1.5 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
                placeholder="最大"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Toggle filters */}
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded bg-[var(--ffxiv-bg-tertiary)] hover:bg-[var(--ffxiv-card-hover)] transition-colors">
            <input
              type="checkbox"
              checked={filters.craftableOnly}
              onChange={(e) => onFilterChange({ craftableOnly: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)] accent-[var(--ffxiv-accent)]"
            />
            <span className="text-sm text-[var(--ffxiv-text-secondary)]">可製作</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded bg-[var(--ffxiv-bg-tertiary)] hover:bg-[var(--ffxiv-card-hover)] transition-colors">
            <input
              type="checkbox"
              checked={filters.gatherableOnly}
              onChange={(e) => onFilterChange({ gatherableOnly: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)] accent-[var(--ffxiv-accent)]"
            />
            <span className="text-sm text-[var(--ffxiv-text-secondary)]">可採集</span>
          </label>

          {/* HQ Toggle */}
          <button
            onClick={() => {
              const newValue = filters.canBeHq === null ? true : filters.canBeHq === true ? false : null;
              onFilterChange({ canBeHq: newValue });
            }}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filters.canBeHq === true
                ? 'bg-[var(--ffxiv-accent)] text-white'
                : filters.canBeHq === false
                ? 'bg-red-900/30 text-red-400'
                : 'bg-[var(--ffxiv-bg-tertiary)] text-[var(--ffxiv-text-secondary)]'
            }`}
          >
            {filters.canBeHq === null ? 'HQ' : filters.canBeHq ? 'HQ 可' : 'HQ 否'}
          </button>

          {/* Tradeable Toggle */}
          <button
            onClick={() => {
              const newValue = filters.tradeable === null ? true : filters.tradeable === true ? false : null;
              onFilterChange({ tradeable: newValue });
            }}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              filters.tradeable === true
                ? 'bg-[var(--ffxiv-accent)] text-white'
                : filters.tradeable === false
                ? 'bg-red-900/30 text-red-400'
                : 'bg-[var(--ffxiv-bg-tertiary)] text-[var(--ffxiv-text-secondary)]'
            }`}
          >
            {filters.tradeable === null ? '可交易' : filters.tradeable ? '可交易' : '不可交易'}
          </button>
        </div>

        {/* Row 4: Job icons (Worn By) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[var(--ffxiv-muted)]">
              可裝備職業
              {filters.selectedJobs.length > 0 && (
                <span className="ml-2 text-[var(--ffxiv-accent)]">
                  ({filters.selectedJobs.length} 已選)
                </span>
              )}
            </label>
            {filters.selectedJobs.length > 0 && (
              <button
                onClick={clearJobs}
                className="text-xs text-[var(--ffxiv-accent)] hover:underline"
              >
                清除
              </button>
            )}
          </div>

          <div className="space-y-2">
            {JOB_CATEGORIES.map((category) => {
              const allSelected = category.jobs.every(j => filters.selectedJobs.includes(j.abbr));
              const someSelected = category.jobs.some(j => filters.selectedJobs.includes(j.abbr));

              return (
                <div key={category.name} className="flex items-center gap-2">
                  {/* Category label - clickable to select all */}
                  <button
                    onClick={() => selectCategory(category.jobs)}
                    className={`w-12 text-xs text-left px-1 py-0.5 rounded transition-colors ${
                      allSelected
                        ? 'text-[var(--ffxiv-accent)] font-medium'
                        : someSelected
                        ? 'text-[var(--ffxiv-text-secondary)]'
                        : 'text-[var(--ffxiv-muted)]'
                    } hover:text-[var(--ffxiv-accent)]`}
                    title={`選擇所有${category.name}`}
                  >
                    {category.name}
                  </button>

                  {/* Job icons */}
                  <div className="flex flex-wrap gap-1">
                    {category.jobs.map((job) => {
                      const isSelected = filters.selectedJobs.includes(job.abbr);
                      return (
                        <button
                          key={job.abbr}
                          onClick={() => toggleJob(job.abbr)}
                          className={`flex items-center justify-center w-8 h-8 rounded transition-all ${
                            isSelected
                              ? 'bg-[var(--ffxiv-accent)] ring-2 ring-[var(--ffxiv-accent)]'
                              : 'bg-[var(--ffxiv-bg-tertiary)] hover:bg-[var(--ffxiv-card-hover)] opacity-60 hover:opacity-100'
                          }`}
                          title={job.name}
                        >
                          <img
                            src={getJobIconUrl(job.abbr)}
                            alt={job.name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
