// Crafting status display component
import { useState } from 'react';
import type { CraftingStatus, CraftingBuffs, LimitedActionState } from '../../types/crafting';

interface StatusDisplayProps {
  status: CraftingStatus | null;
  defaultCollapsed?: boolean;
}

// Progress bar component
function ProgressBar({
  current,
  max,
  color,
  label,
}: {
  current: number;
  max: number;
  color: string;
  label: string;
}) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isComplete = current >= max;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--ffxiv-muted)]">{label}</span>
        <span className={isComplete ? 'text-green-400' : 'text-[var(--ffxiv-text)]'}>
          {current} / {max}
        </span>
      </div>
      <div className="h-3 bg-[var(--ffxiv-bg)] rounded overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${isComplete ? 'bg-green-500' : color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Buff display
function BuffDisplay({ buffs }: { buffs: CraftingBuffs }) {
  const activeBuffs: { name: string; value: number | string }[] = [];

  if (buffs.muscle_memory > 0) activeBuffs.push({ name: '堅信', value: buffs.muscle_memory });
  if (buffs.great_strides > 0) activeBuffs.push({ name: '闊步', value: buffs.great_strides });
  if (buffs.veneration > 0) activeBuffs.push({ name: '崇敬', value: buffs.veneration });
  if (buffs.innovation > 0) activeBuffs.push({ name: '改革', value: buffs.innovation });
  if (buffs.inner_quiet > 0) activeBuffs.push({ name: '內靜', value: buffs.inner_quiet });
  if (buffs.final_appraisal > 0) activeBuffs.push({ name: '最終確認', value: buffs.final_appraisal });
  if (buffs.manipulation > 0) activeBuffs.push({ name: '掌握', value: buffs.manipulation });
  if (buffs.wast_not > 0) activeBuffs.push({ name: '儉約', value: buffs.wast_not });
  if (buffs.observed > 0) activeBuffs.push({ name: '觀察', value: buffs.observed });
  if (buffs.expedience > 0) activeBuffs.push({ name: '儉約II', value: buffs.expedience });
  if (buffs.heart_and_soul === 'Active' as LimitedActionState) activeBuffs.push({ name: '專心致志', value: '!' });
  if (buffs.trained_perfection === 'Active' as LimitedActionState) activeBuffs.push({ name: '巧奪天工', value: '!' });

  if (activeBuffs.length === 0) {
    return <div className="text-xs text-[var(--ffxiv-muted)]">無增益效果</div>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {activeBuffs.map((buff, i) => (
        <span
          key={i}
          className="text-xs px-1.5 py-0.5 rounded bg-[var(--ffxiv-accent)]/20 text-[var(--ffxiv-accent)]"
        >
          {buff.name}[{buff.value}]
        </span>
      ))}
    </div>
  );
}

// Condition display
const CONDITION_COLORS: Record<string, string> = {
  Normal: 'bg-white/20 text-white',
  Good: 'bg-red-500/30 text-red-400',
  Excellent: 'bg-yellow-500/30 text-yellow-300',
  Poor: 'bg-gray-700 text-gray-400',
  Centered: 'bg-yellow-600/30 text-yellow-400',
  Sturdy: 'bg-blue-500/30 text-blue-400',
  Pliant: 'bg-green-500/30 text-green-400',
  Malleable: 'bg-blue-700/30 text-blue-300',
  Primed: 'bg-purple-500/30 text-purple-400',
  GoodOmen: 'bg-pink-500/30 text-pink-400',
};

const CONDITION_NAMES: Record<string, string> = {
  Normal: '通常',
  Good: '高品質',
  Excellent: '最高品質',
  Poor: '低品質',
  Centered: '安定',
  Sturdy: '結實',
  Pliant: '高效',
  Malleable: '大進展',
  Primed: '長持續',
  GoodOmen: '良兆',
};

export function StatusDisplay({ status, defaultCollapsed }: StatusDisplayProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);

  if (!status) {
    return (
      <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
        <div className="text-center text-[var(--ffxiv-muted)] py-4">
          選擇配方以開始模擬
        </div>
      </div>
    );
  }

  const condition = status.condition;
  const progressPct = status.recipe.difficulty > 0 ? Math.round(status.progress / status.recipe.difficulty * 100) : 0;
  const qualityPct = status.recipe.quality > 0 ? Math.round(status.quality / status.recipe.quality * 100) : 0;

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-sm font-medium text-[var(--ffxiv-text)] hover:text-[var(--ffxiv-accent)] transition-colors"
        >
          <span className={`text-xs transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
          製作狀態
          {collapsed && (
            <span className="text-xs text-[var(--ffxiv-muted)] ml-1">
              步驟{status.step} / 進展{progressPct}% / 品質{qualityPct}%
            </span>
          )}
        </button>
        {!collapsed && (
          <span className="text-xs text-[var(--ffxiv-muted)]">步驟 {status.step}</span>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-3 mt-3">
          {/* Progress */}
          <ProgressBar
            current={status.progress}
            max={status.recipe.difficulty}
            color="bg-blue-500"
            label="進展"
          />

          {/* Quality */}
          <ProgressBar
            current={status.quality}
            max={status.recipe.quality}
            color="bg-orange-500"
            label="品質"
          />

          {/* Durability */}
          <ProgressBar
            current={status.durability}
            max={status.recipe.durability}
            color="bg-yellow-600"
            label="耐久"
          />

          {/* CP */}
          <ProgressBar
            current={status.craft_points}
            max={status.attributes.craft_points}
            color="bg-pink-500"
            label="CP"
          />

          {/* Condition */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--ffxiv-muted)]">狀態:</span>
            <span className={`text-xs px-2 py-0.5 rounded ${CONDITION_COLORS[condition] || CONDITION_COLORS.Normal}`}>
              {CONDITION_NAMES[condition] || condition}
            </span>
          </div>

          {/* Buffs */}
          <div className="pt-2 border-t border-[var(--ffxiv-border)]">
            <div className="text-xs text-[var(--ffxiv-muted)] mb-1">增益效果:</div>
            <BuffDisplay buffs={status.buffs} />
          </div>
        </div>
      )}
    </div>
  );
}
