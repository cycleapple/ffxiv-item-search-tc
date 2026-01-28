// Recipe view component
import { Link } from 'react-router-dom';
import type { Recipe } from '../types';
import { getItemById } from '../services/searchService';
import { getItemIconUrl } from '../services/xivapiService';
import { CopyButton } from './CopyButton';

interface RecipeViewProps {
  recipes: Recipe[];
}

const CRAFT_TYPE_NAMES: Record<number, string> = {
  0: '木工',
  1: '鍛冶',
  2: '甲冑',
  3: '雕金',
  4: '皮革',
  5: '裁縫',
  6: '煉金',
  7: '烹調',
};

export function RecipeView({ recipes }: RecipeViewProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-4 text-[var(--ffxiv-muted)]">
        此物品無法製作
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recipes.map((recipe, index) => (
        <div
          key={recipe.id || index}
          className="bg-[var(--ffxiv-bg)] rounded-lg p-4 border border-[var(--ffxiv-accent)]"
        >
          {/* Recipe header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-[var(--ffxiv-accent)] rounded text-sm">
                {CRAFT_TYPE_NAMES[recipe.craftType] || `製作師 ${recipe.craftType}`}
              </span>
              <span className="text-sm text-[var(--ffxiv-muted)]">
                Lv.{recipe.recipeLevel}
                {recipe.stars > 0 && (
                  <span className="ml-1 text-yellow-400">
                    {'★'.repeat(recipe.stars)}
                  </span>
                )}
              </span>
            </div>
            {recipe.resultAmount > 1 && (
              <span className="text-sm text-[var(--ffxiv-muted)]">
                產出: {recipe.resultAmount}
              </span>
            )}
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="text-xs text-[var(--ffxiv-muted)] mb-2">所需材料:</div>
            {recipe.ingredients.map((ing, i) => {
              const item = getItemById(ing.itemId);
              if (!item) return null;

              return (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-[var(--ffxiv-card)] rounded"
                >
                  <Link
                    to={`/item/${ing.itemId}`}
                    className="flex items-center gap-2 flex-1 min-w-0 hover:text-[var(--ffxiv-accent)] transition-colors"
                  >
                    <div className="w-6 h-6 bg-[var(--ffxiv-bg)] rounded overflow-hidden flex-shrink-0">
                      <img
                        src={getItemIconUrl(item.icon)}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-sm truncate">{item.name}</span>
                  </Link>
                  <CopyButton text={item.name} />
                  <span className="text-sm text-[var(--ffxiv-muted)] flex-shrink-0">x{ing.amount}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
