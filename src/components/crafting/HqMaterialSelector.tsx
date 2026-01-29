// HQ material selector for crafting simulator
import { useMemo } from 'react';
import type { Recipe, Item } from '../../types';
import { getItemIconUrl } from '../../services/xivapiService';

interface HqMaterialSelectorProps {
  recipe: Recipe;
  items: Record<number, Item>;
  hqMaterials: Record<number, number>; // itemId -> HQ count
  onHqMaterialsChange: (hqMaterials: Record<number, number>) => void;
  maxQuality: number; // Recipe's max quality
}

// Calculate initial quality from HQ materials
// Formula matches BestCraft: weight each ingredient by item level
// ratio = sum(hqCount * itemLevel) / sum(totalCount * itemLevel) for HQ-able items only
// initialQuality = floor(maxQuality * materialQualityFactor / 100 * ratio)
export function calculateInitialQuality(
  recipe: Recipe,
  hqMaterials: Record<number, number>,
  maxQuality: number,
  items?: Record<number, Item>
): number {
  const materialQualityFactor = recipe.materialQualityFactor || 0;
  if (materialQualityFactor === 0) return 0;

  let totalLevelCount = 0;
  let hqLevelCount = 0;

  recipe.ingredients.forEach((ing) => {
    const item = items?.[ing.itemId];
    // Only count HQ-able items (skip crystals etc.)
    if (item && !item.canBeHq) return;
    if (ing.itemId >= 2 && ing.itemId <= 19) return; // crystals

    const level = item?.itemLevel || 1;
    const hqCount = Math.min(hqMaterials[ing.itemId] || 0, ing.amount);

    totalLevelCount += ing.amount * level;
    hqLevelCount += hqCount * level;
  });

  if (totalLevelCount === 0) return 0;

  const ratio = hqLevelCount / totalLevelCount;
  return Math.floor(maxQuality * materialQualityFactor / 100 * ratio);
}

export function HqMaterialSelector({
  recipe,
  items,
  hqMaterials,
  onHqMaterialsChange,
  maxQuality,
}: HqMaterialSelectorProps) {
  // Filter out crystals (categories 59, item IDs 2-19 are crystals)
  const craftableIngredients = useMemo(() => {
    return recipe.ingredients.filter((ing) => {
      const item = items[ing.itemId];
      // Skip if it's a crystal (categoryId 59 or item ID 2-19)
      if (!item) return false;
      if (item.categoryId === 59) return false;
      if (ing.itemId >= 2 && ing.itemId <= 19) return false;
      // Only show items that can be HQ
      return item.canBeHq;
    });
  }, [recipe.ingredients, items]);

  const initialQuality = calculateInitialQuality(recipe, hqMaterials, maxQuality, items);
  const materialQualityFactor = recipe.materialQualityFactor || 0;

  // No HQ-able materials
  if (craftableIngredients.length === 0 || materialQualityFactor === 0) {
    return (
      <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
        <h3 className="text-sm font-medium text-[var(--ffxiv-text)] mb-2">HQ 素材</h3>
        <p className="text-xs text-[var(--ffxiv-muted)]">此配方無法使用 HQ 素材提升起始品質</p>
      </div>
    );
  }

  const handleHqChange = (itemId: number, delta: number) => {
    const ingredient = recipe.ingredients.find((i) => i.itemId === itemId);
    if (!ingredient) return;

    const current = hqMaterials[itemId] || 0;
    const newValue = Math.max(0, Math.min(ingredient.amount, current + delta));

    onHqMaterialsChange({
      ...hqMaterials,
      [itemId]: newValue,
    });
  };

  const handleSetAll = (allHq: boolean) => {
    const newHqMaterials: Record<number, number> = {};
    craftableIngredients.forEach((ing) => {
      newHqMaterials[ing.itemId] = allHq ? ing.amount : 0;
    });
    onHqMaterialsChange(newHqMaterials);
  };

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--ffxiv-text)]">HQ 素材</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleSetAll(true)}
            className="text-xs text-[var(--ffxiv-accent)] hover:underline"
          >
            全部 HQ
          </button>
          <button
            onClick={() => handleSetAll(false)}
            className="text-xs text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)]"
          >
            全部 NQ
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {craftableIngredients.map((ing) => {
          const item = items[ing.itemId];
          if (!item) return null;

          const hqCount = hqMaterials[ing.itemId] || 0;

          return (
            <div key={ing.itemId} className="flex items-center gap-2">
              <img
                src={getItemIconUrl(item.icon)}
                alt={item.name}
                className="w-6 h-6 rounded"
              />
              <span className="flex-1 text-sm text-[var(--ffxiv-text)] truncate" title={item.name}>
                {item.name}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleHqChange(ing.itemId, -1)}
                  disabled={hqCount === 0}
                  className="w-6 h-6 rounded bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] text-[var(--ffxiv-text)] hover:border-[var(--ffxiv-accent)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  -
                </button>
                <span className="w-12 text-center text-sm">
                  <span className={hqCount > 0 ? 'text-[var(--ffxiv-highlight)]' : 'text-[var(--ffxiv-muted)]'}>
                    {hqCount}
                  </span>
                  <span className="text-[var(--ffxiv-muted)]">/{ing.amount}</span>
                </span>
                <button
                  onClick={() => handleHqChange(ing.itemId, 1)}
                  disabled={hqCount >= ing.amount}
                  className="w-6 h-6 rounded bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] text-[var(--ffxiv-text)] hover:border-[var(--ffxiv-accent)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Initial quality display */}
      <div className="mt-3 pt-3 border-t border-[var(--ffxiv-border)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ffxiv-muted)]">起始品質:</span>
          <span className="text-[var(--ffxiv-highlight)] font-medium">
            {initialQuality.toLocaleString()}
            <span className="text-[var(--ffxiv-muted)] font-normal ml-1">
              / {maxQuality.toLocaleString()}
            </span>
          </span>
        </div>
        <div className="text-xs text-[var(--ffxiv-muted)] mt-1">
          素材品質係數: {materialQualityFactor}%
        </div>
      </div>
    </div>
  );
}
