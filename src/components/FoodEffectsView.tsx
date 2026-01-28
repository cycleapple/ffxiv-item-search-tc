// Display food/medicine effects
import type { FoodEffects } from '../types';

interface FoodEffectsViewProps {
  foodEffects: FoodEffects;
  canBeHq?: boolean;
}

export function FoodEffectsView({ foodEffects, canBeHq = true }: FoodEffectsViewProps) {
  if (!foodEffects.bonuses || foodEffects.bonuses.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)]">
        <h3 className="font-medium text-[var(--ffxiv-text)]">食物效果</h3>
      </div>
      <div className="p-4">
        {/* EXP Bonus */}
        {foodEffects.expBonus > 0 && (
          <div className="mb-3 text-sm">
            <span className="text-[var(--ffxiv-muted)]">經驗值加成: </span>
            <span className="text-[var(--ffxiv-accent)]">+{foodEffects.expBonus}%</span>
          </div>
        )}

        {/* Stat Bonuses */}
        <div className="space-y-2">
          {foodEffects.bonuses.map((bonus, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-[var(--ffxiv-text)]">{bonus.paramName}</span>
              <div className="flex items-center gap-3">
                {/* NQ Values */}
                <span className="text-[var(--ffxiv-muted)]">
                  {bonus.isRelative ? `${bonus.value}%` : bonus.value}
                  {bonus.max > 0 && (
                    <span className="text-xs ml-1">({bonus.max})</span>
                  )}
                </span>

                {/* HQ Values */}
                {canBeHq && (bonus.valueHq > 0 || bonus.maxHq > 0) && (
                  <span className="text-[var(--ffxiv-highlight)]">
                    HQ {bonus.isRelative ? `${bonus.valueHq}%` : bonus.valueHq}
                    {bonus.maxHq > 0 && (
                      <span className="text-xs ml-1">({bonus.maxHq})</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Duration note */}
        <div className="mt-3 pt-3 border-t border-[var(--ffxiv-border)] text-xs text-[var(--ffxiv-muted)]">
          持續時間 30分（持續時間最多可疊加延長2倍）
        </div>
      </div>
    </div>
  );
}
