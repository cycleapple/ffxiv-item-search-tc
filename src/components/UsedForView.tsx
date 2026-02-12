// Used for view component - shows what recipes use this item as an ingredient
import type { Recipe } from '../types';
import { getItemById } from '../services/searchService';
import { getItemIconUrl } from '../services/xivapiService';
import { getDesynthResults, getTradesForCurrency, getGCSupplyInfo } from '../hooks/useItemData';
import { CopyButton } from './CopyButton';
import { ItemLink } from './ItemLink';

interface UsedForViewProps {
  itemId: number;
  recipes: Recipe[];
}

// XIVAPI icon URLs
const XIVAPI_ICONS = {
  desynth: 'https://xivapi.com/i/000000/000120.png',
  trade: 'https://xivapi.com/i/060000/060412.png',
  gcSeals: 'https://xivapi.com/i/065000/065005.png',
};

// Job icons (local files in public/icons/jobs/)
const JOB_ICONS = {
  carpenter: 'icons/jobs/Carpenter.png',
  blacksmith: 'icons/jobs/Blacksmith.png',
  armorer: 'icons/jobs/Armorer.png',
  goldsmith: 'icons/jobs/Goldsmith.png',
  leatherworker: 'icons/jobs/Leatherworker.png',
  weaver: 'icons/jobs/Weaver.png',
  alchemist: 'icons/jobs/Alchemist.png',
  culinarian: 'icons/jobs/Culinarian.png',
};

// Map craftType to job icon path
const CRAFT_TYPE_ICONS: Record<number, string> = {
  0: JOB_ICONS.carpenter,
  1: JOB_ICONS.blacksmith,
  2: JOB_ICONS.armorer,
  3: JOB_ICONS.goldsmith,
  4: JOB_ICONS.leatherworker,
  5: JOB_ICONS.weaver,
  6: JOB_ICONS.alchemist,
  7: JOB_ICONS.culinarian,
};

export function UsedForView({ itemId, recipes }: UsedForViewProps) {
  // Get items that can be obtained by desynthing this item
  const desynthResults = getDesynthResults(itemId);

  // Get items that can be purchased with this currency
  const trades = getTradesForCurrency(itemId);

  // Get GC supply/provisioning info
  const gcSupply = getGCSupplyInfo(itemId);

  if (recipes.length === 0 && desynthResults.length === 0 && trades.length === 0 && !gcSupply) {
    return (
      <div className="text-center py-8 text-[var(--ffxiv-muted)]">
        <div className="text-4xl mb-3">📦</div>
        <p>此物品沒有已知的用途</p>
      </div>
    );
  }

  // Group recipes by craft type
  const groupedRecipes = recipes.reduce((acc, recipe) => {
    const craftType = recipe.craftTypeName || '其他';
    if (!acc[craftType]) {
      acc[craftType] = [];
    }
    acc[craftType].push(recipe);
    return acc;
  }, {} as Record<string, Recipe[]>);

  // Sort each group by recipe level
  for (const craftType in groupedRecipes) {
    groupedRecipes[craftType].sort((a, b) => b.recipeLevel - a.recipeLevel);
  }

  return (
    <div className="space-y-6">
      {/* Recipes that use this item */}
      {recipes.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-[var(--ffxiv-muted)] mb-3">
            共 {recipes.length} 個配方使用此材料
          </div>

          {Object.entries(groupedRecipes).map(([craftType, craftRecipes]) => (
        <div key={craftType} className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--ffxiv-muted)]">
            {CRAFT_TYPE_ICONS[craftRecipes[0]?.craftType] ? (
              <img
                src={`${import.meta.env.BASE_URL}${CRAFT_TYPE_ICONS[craftRecipes[0]?.craftType]}`}
                alt={craftType}
                className="w-5 h-5"
              />
            ) : (
              <span>🔨</span>
            )}
            <span>{craftType}</span>
            <span className="text-xs">({craftRecipes.length})</span>
          </div>

          <div className="grid gap-2">
            {craftRecipes.map((recipe) => {
              const resultItem = getItemById(recipe.itemId);
              if (!resultItem) return null;

              // Find how many of this item is needed
              const ingredient = recipe.ingredients.find(ing => ing.itemId === itemId);
              const amountNeeded = ingredient?.amount || 1;

              return (
                <div
                  key={recipe.id}
                  className="flex items-center gap-3 p-3 bg-[var(--ffxiv-bg)] rounded-lg border border-[var(--ffxiv-accent)] hover:border-[var(--ffxiv-highlight)] transition-colors"
                >
                  <ItemLink
                    itemId={recipe.itemId}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {/* Item icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-[var(--ffxiv-card)] rounded overflow-hidden">
                      <img
                        src={getItemIconUrl(resultItem.icon)}
                        alt={resultItem.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getItemIconUrl(0);
                        }}
                      />
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{resultItem.name}</div>
                      <div className="text-xs text-[var(--ffxiv-muted)]">
                        Lv.{recipe.recipeLevel}
                        {recipe.stars > 0 && <span className="ml-1">{'★'.repeat(recipe.stars)}</span>}
                        {recipe.resultAmount > 1 && (
                          <span className="ml-2">x{recipe.resultAmount}</span>
                        )}
                      </div>
                    </div>
                  </ItemLink>

                  <CopyButton text={resultItem.name} />

                  {/* Amount needed */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm text-[var(--ffxiv-highlight)]">
                      x{amountNeeded}
                    </div>
                    <div className="text-xs text-[var(--ffxiv-muted)]">
                      需要
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
        </div>
      )}

      {/* Desynths to - what you get by desynthing this item */}
      {desynthResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--ffxiv-muted)]">
            <img src={XIVAPI_ICONS.desynth} alt="分解" className="w-5 h-5" />
            <span>分解結果</span>
            <span className="text-xs">({desynthResults.length})</span>
          </div>

          <div className="grid gap-2">
            {desynthResults.map((resultItemId) => {
              const resultItem = getItemById(resultItemId);
              if (!resultItem) return null;

              return (
                <div
                  key={resultItemId}
                  className="flex items-center gap-3 p-3 bg-[var(--ffxiv-bg)] rounded-lg border border-[var(--ffxiv-accent)] hover:border-[var(--ffxiv-highlight)] transition-colors"
                >
                  <ItemLink
                    itemId={resultItemId}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {/* Item icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-[var(--ffxiv-card)] rounded overflow-hidden">
                      <img
                        src={getItemIconUrl(resultItem.icon)}
                        alt={resultItem.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getItemIconUrl(0);
                        }}
                      />
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{resultItem.name}</div>
                      <div className="text-xs text-[var(--ffxiv-muted)]">
                        {resultItem.categoryName}
                      </div>
                    </div>
                  </ItemLink>
                  <CopyButton text={resultItem.name} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trades - what items can be purchased with this currency */}
      {trades.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--ffxiv-muted)]">
            <img src={XIVAPI_ICONS.trade} alt="兌換" className="w-5 h-5" />
            <span>可兌換物品</span>
            <span className="text-xs">({trades.length})</span>
          </div>

          <div className="grid gap-2 max-h-[400px] overflow-y-auto">
            {trades.slice(0, 50).map((trade) => {
              const tradeItem = getItemById(trade.itemId);
              if (!tradeItem) return null;

              // Generate unique key from currencies
              const tradeKey = `${trade.itemId}-${trade.currencies.map(c => `${c.id}:${c.amount}`).join('-')}`;

              return (
                <div
                  key={tradeKey}
                  className="p-3 bg-[var(--ffxiv-bg)] rounded-lg border border-[var(--ffxiv-accent)]"
                >
                  {/* Cost section - what you pay */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs text-[var(--ffxiv-muted)]">付出:</span>
                    {trade.currencies.map((currency) => {
                      const currencyItem = getItemById(currency.id);
                      if (!currencyItem) return null;
                      return (
                        <div
                          key={currency.id}
                          className="flex items-center gap-1 px-2 py-1 bg-[var(--ffxiv-card)] rounded"
                        >
                          <ItemLink
                            itemId={currency.id}
                            className="flex items-center gap-1 hover:text-[var(--ffxiv-accent)] transition-colors"
                          >
                            <img
                              src={getItemIconUrl(currencyItem.icon)}
                              alt={currencyItem.name}
                              className="w-5 h-5"
                              loading="lazy"
                            />
                            <span className="text-xs truncate max-w-[100px]">{currencyItem.name}</span>
                          </ItemLink>
                          <CopyButton text={currencyItem.name} />
                          <span className="text-xs text-[var(--ffxiv-highlight)]">x{currency.amount}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Result section - what you get */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--ffxiv-muted)]">換取:</span>
                    <ItemLink
                      itemId={trade.itemId}
                      className="flex items-center gap-2 flex-1 min-w-0 hover:text-[var(--ffxiv-highlight)] transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-[var(--ffxiv-card)] rounded overflow-hidden">
                        <img
                          src={getItemIconUrl(tradeItem.icon)}
                          alt={tradeItem.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getItemIconUrl(0);
                          }}
                        />
                      </div>
                      <span className="font-medium truncate">{tradeItem.name}</span>
                    </ItemLink>
                    <CopyButton text={tradeItem.name} />
                    <span className="text-sm text-[var(--ffxiv-highlight)] flex-shrink-0">
                      x{trade.amount}
                    </span>
                  </div>
                </div>
              );
            })}
            {trades.length > 50 && (
              <div className="text-center text-sm text-[var(--ffxiv-muted)] py-2">
                ...還有 {trades.length - 50} 個物品
              </div>
            )}
          </div>
        </div>
      )}

      {/* GC Supply & Provisioning */}
      {gcSupply && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--ffxiv-muted)]">
            <img src={XIVAPI_ICONS.gcSeals} alt="軍需品籌備" className="w-5 h-5" />
            <span>軍需品籌備</span>
          </div>

          <div className="p-3 bg-[var(--ffxiv-bg)] rounded-lg border border-[var(--ffxiv-accent)]">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--ffxiv-muted)]">EXP:</span>
                <span className="text-sm text-[var(--ffxiv-highlight)]">{gcSupply.exp.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <img src={XIVAPI_ICONS.gcSeals} alt="軍票" className="w-4 h-4" />
                <span className="text-xs text-[var(--ffxiv-muted)]">軍票:</span>
                <span className="text-sm text-[var(--ffxiv-highlight)]">x{gcSupply.seals.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
