// Crafter stats input form
import { useState } from 'react';
import type { CrafterAttributes } from '../../types/crafting';

interface CrafterStatsFormProps {
  stats: CrafterAttributes;
  effectiveStats?: { craftsmanship: number; control: number; craft_points: number };
  onStatsChange: (stats: Partial<CrafterAttributes>) => void;
  onReset: () => void;
  defaultCollapsed?: boolean;
}

// Number input that allows empty field while typing, commits on blur
function NumericInput({ value, min, max, defaultValue, onChange, className }: {
  value: number; min: number; max: number; defaultValue: number;
  onChange: (v: number) => void; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={editing ? text : value}
      onChange={(e) => {
        if (editing) {
          setText(e.target.value);
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(v);
        } else {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(v);
        }
      }}
      onFocus={(e) => {
        setEditing(true);
        setText(String(value));
        e.target.select();
      }}
      onBlur={() => {
        setEditing(false);
        const v = parseInt(text);
        onChange(isNaN(v) ? defaultValue : v);
      }}
      className={className}
    />
  );
}

const inputClass = "flex-1 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-sm text-[var(--ffxiv-text)] focus:outline-none focus:border-[var(--ffxiv-accent)]";

export function CrafterStatsForm({ stats, effectiveStats, onStatsChange, onReset, defaultCollapsed }: CrafterStatsFormProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  // Calculate bonuses
  const craftBonus = effectiveStats ? effectiveStats.craftsmanship - stats.craftsmanship : 0;
  const controlBonus = effectiveStats ? effectiveStats.control - stats.control : 0;
  const cpBonus = effectiveStats ? effectiveStats.craft_points - stats.craft_points : 0;

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-sm font-medium text-[var(--ffxiv-text)] hover:text-[var(--ffxiv-accent)] transition-colors"
        >
          <span className={`text-xs transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
          製作者屬性
          {collapsed && (
            <span className="text-xs text-[var(--ffxiv-muted)] ml-1">
              Lv.{stats.level} / {stats.craftsmanship} / {stats.control} / {stats.craft_points}
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={onReset}
            className="text-xs text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] transition-colors"
          >
            重置
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-3 mt-3">
          {/* Level */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--ffxiv-muted)] w-12">等級:</label>
            <NumericInput value={stats.level} min={1} max={100} defaultValue={1}
              onChange={(v) => onStatsChange({ level: v })} className={inputClass} />
          </div>

          {/* Craftsmanship */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--ffxiv-muted)] w-12">作業:</label>
            <NumericInput value={stats.craftsmanship} min={0} max={9999} defaultValue={0}
              onChange={(v) => onStatsChange({ craftsmanship: v })} className={inputClass} />
            {craftBonus > 0 && (
              <span className="text-xs text-[var(--ffxiv-success)]">+{craftBonus}</span>
            )}
          </div>

          {/* Control */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--ffxiv-muted)] w-12">加工:</label>
            <NumericInput value={stats.control} min={0} max={9999} defaultValue={0}
              onChange={(v) => onStatsChange({ control: v })} className={inputClass} />
            {controlBonus > 0 && (
              <span className="text-xs text-[var(--ffxiv-success)]">+{controlBonus}</span>
            )}
          </div>

          {/* CP */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--ffxiv-muted)] w-12">CP:</label>
            <NumericInput value={stats.craft_points} min={0} max={9999} defaultValue={0}
              onChange={(v) => onStatsChange({ craft_points: v })} className={inputClass} />
            {cpBonus > 0 && (
              <span className="text-xs text-[var(--ffxiv-success)]">+{cpBonus}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
