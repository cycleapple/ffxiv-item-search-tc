// Crafter stats input form
import type { CrafterAttributes } from '../../types/crafting';

interface CrafterStatsFormProps {
  stats: CrafterAttributes;
  onStatsChange: (stats: Partial<CrafterAttributes>) => void;
  onReset: () => void;
}

export function CrafterStatsForm({ stats, onStatsChange, onReset }: CrafterStatsFormProps) {
  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--ffxiv-text)]">製作者屬性</h3>
        <button
          onClick={onReset}
          className="text-xs text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] transition-colors"
        >
          重置
        </button>
      </div>

      <div className="space-y-3">
        {/* Level */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--ffxiv-muted)] w-12">等級:</label>
          <input
            type="number"
            min={1}
            max={100}
            value={stats.level}
            onChange={(e) => onStatsChange({ level: parseInt(e.target.value) || 1 })}
            className="flex-1 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
          />
        </div>

        {/* Craftsmanship */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--ffxiv-muted)] w-12">作業:</label>
          <input
            type="number"
            min={0}
            max={9999}
            value={stats.craftsmanship}
            onChange={(e) => onStatsChange({ craftsmanship: parseInt(e.target.value) || 0 })}
            className="flex-1 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
          />
        </div>

        {/* Control */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--ffxiv-muted)] w-12">加工:</label>
          <input
            type="number"
            min={0}
            max={9999}
            value={stats.control}
            onChange={(e) => onStatsChange({ control: parseInt(e.target.value) || 0 })}
            className="flex-1 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
          />
        </div>

        {/* CP */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--ffxiv-muted)] w-12">CP:</label>
          <input
            type="number"
            min={0}
            max={9999}
            value={stats.craft_points}
            onChange={(e) => onStatsChange({ craft_points: parseInt(e.target.value) || 0 })}
            className="flex-1 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]"
          />
        </div>
      </div>
    </div>
  );
}
