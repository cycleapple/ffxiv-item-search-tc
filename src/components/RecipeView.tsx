// Recipe view component
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../types';
import { getItemById } from '../services/searchService';
import { getItemIconUrl } from '../services/xivapiService';
import { CopyButton } from './CopyButton';
import { ItemLink } from './ItemLink';

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

// Craft type to job abbreviation mapping
const CRAFT_TYPE_JOBS: Record<number, string> = {
  0: 'CRP',
  1: 'BSM',
  2: 'ARM',
  3: 'GSM',
  4: 'LTW',
  5: 'WVR',
  6: 'ALC',
  7: 'CUL',
};

// Job names in Traditional Chinese
const JOB_NAMES_TC: Record<string, string> = {
  CRP: '木工師',
  BSM: '鍛造師',
  ARM: '甲冑師',
  GSM: '金工師',
  LTW: '皮革師',
  WVR: '裁縫師',
  ALC: '鍊金術師',
  CUL: '烹調師',
};

// Get job icon URL
function getJobIconUrl(abbr: string): string {
  const jobNames: Record<string, string> = {
    CRP: 'carpenter',
    BSM: 'blacksmith',
    ARM: 'armorer',
    GSM: 'goldsmith',
    LTW: 'leatherworker',
    WVR: 'weaver',
    ALC: 'alchemist',
    CUL: 'culinarian',
  };
  return `https://xivapi.com/cj/1/${jobNames[abbr] || 'carpenter'}.png`;
}

export function RecipeView({ recipes }: RecipeViewProps) {
  const navigate = useNavigate();

  if (recipes.length === 0) {
    return (
      <div className="text-center py-4 text-[var(--ffxiv-muted)]">
        此物品無法製作
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recipes.map((recipe, index) => {
        const jobAbbr = CRAFT_TYPE_JOBS[recipe.craftType] || 'CRP';
        const jobName = JOB_NAMES_TC[jobAbbr] || CRAFT_TYPE_NAMES[recipe.craftType];
        const masterBook = recipe.secretRecipeBook ? getItemById(recipe.secretRecipeBook) : null;

        return (
          <div
            key={recipe.id || index}
            className="bg-[var(--ffxiv-bg)] rounded-lg p-4 border border-[var(--ffxiv-accent)]"
          >
            {/* Recipe header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <img
                  src={getJobIconUrl(jobAbbr)}
                  alt={jobName}
                  title={jobName}
                  className="w-6 h-6"
                />
                <span className="font-medium">
                  {jobName}
                </span>
                <span className="text-sm text-[var(--ffxiv-muted)]">
                  Lv.{recipe.classJobLevel || recipe.recipeLevel}
                  {recipe.stars > 0 && (
                    <span className="ml-1 text-yellow-400">
                      {'★'.repeat(recipe.stars)}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {recipe.resultAmount > 1 && (
                  <span className="text-sm text-[var(--ffxiv-muted)]">
                    產出: {recipe.resultAmount}
                  </span>
                )}
                <button
                  onClick={() => navigate(`/craft/${recipe.itemId}`)}
                  className="px-3 py-1 text-xs bg-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent-hover)] text-white rounded transition-colors"
                >
                  模擬製作
                </button>
              </div>
            </div>

            {/* Master book requirement */}
            {masterBook && (
              <div className="flex items-center gap-2 p-2 mb-3 bg-[var(--ffxiv-bg-tertiary)] rounded border border-[var(--ffxiv-warning)]/30">
                <span className="text-xs text-[var(--ffxiv-warning)]">秘笈</span>
                <ItemLink
                  itemId={masterBook.id}
                  className="flex items-center gap-2 flex-1 min-w-0 hover:text-[var(--ffxiv-accent)] transition-colors"
                >
                  <div className="w-5 h-5 bg-[var(--ffxiv-bg)] rounded overflow-hidden flex-shrink-0">
                    <img
                      src={getItemIconUrl(masterBook.icon)}
                      alt={masterBook.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-sm text-[var(--ffxiv-warning)]">{masterBook.name}</span>
                </ItemLink>
                <CopyButton text={masterBook.name} />
              </div>
            )}

            {/* Recipe details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-sm">
              {recipe.recipeLevel && (
                <div className="bg-[var(--ffxiv-card)] rounded px-2 py-1">
                  <span className="text-[var(--ffxiv-muted)]">rlvl: </span>
                  <span className="font-medium">{recipe.recipeLevel}</span>
                </div>
              )}
              {recipe.durability && (
                <div className="bg-[var(--ffxiv-card)] rounded px-2 py-1">
                  <span className="text-[var(--ffxiv-muted)]">耐久度: </span>
                  <span className="font-medium">{recipe.durability}</span>
                </div>
              )}
              {recipe.difficulty && (
                <div className="bg-[var(--ffxiv-card)] rounded px-2 py-1">
                  <span className="text-[var(--ffxiv-muted)]">進展量: </span>
                  <span className="font-medium">{recipe.difficulty}</span>
                </div>
              )}
              {recipe.quality && (
                <div className="bg-[var(--ffxiv-card)] rounded px-2 py-1">
                  <span className="text-[var(--ffxiv-muted)]">品質: </span>
                  <span className="font-medium">{recipe.quality}</span>
                </div>
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
                    <ItemLink
                      itemId={ing.itemId}
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
                    </ItemLink>
                    <CopyButton text={item.name} />
                    <span className="text-sm text-[var(--ffxiv-muted)] flex-shrink-0">x{ing.amount}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
