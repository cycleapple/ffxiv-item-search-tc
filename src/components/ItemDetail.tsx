// Item detail page component
import { useParams, useNavigate } from 'react-router-dom';
import { useItemData, useRecipeData, useGatheringData, useSourcesData, getRecipesUsingItem } from '../hooks/useItemData';
import { getItemById } from '../services/searchService';
import { getItemIconUrl } from '../services/xivapiService';
import { ObtainView } from './ObtainView';
import { RecipeView } from './RecipeView';
import { GatheringView } from './GatheringView';
import { MarketPrice } from './MarketPrice';
import { CraftingPriceTree } from './CraftingPriceTree';
import { UsedForView } from './UsedForView';
import { CopyButton } from './CopyButton';
import { EquipmentStatsView } from './EquipmentStatsView';
import { AddToPriceListButton } from './AddToPriceListButton';
import { useState, useEffect } from 'react';
import { useSettings, type TabType } from '../hooks/useSettings';
import type { Item, Recipe, GatheringPoint, ItemSource } from '../types';

function getRarityClass(rarity: number): string {
  switch (rarity) {
    case 1:
      return 'rarity-common';
    case 2:
      return 'rarity-uncommon';
    case 3:
      return 'rarity-rare';
    case 4:
      return 'rarity-relic';
    case 7:
      return 'rarity-aetherial';
    default:
      return 'rarity-common';
  }
}

/**
 * Clean FFXIV client formatting codes from text
 * These include <hex:XXXXXXXX> codes and other special markers
 */
function cleanFFXIVText(text: string): string {
  if (!text) return '';
  return text
    // Remove hex codes like <hex:02100103>
    .replace(/<hex:[0-9A-Fa-f]+>/g, '')
    // Remove UIForeground/UIGlow tags
    .replace(/<UIForeground>[^<]*<\/UIForeground>/g, '')
    .replace(/<UIGlow>[^<]*<\/UIGlow>/g, '')
    // Remove other potential tags
    .replace(/<[^>]+>/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const itemId = id ? parseInt(id) : null;
  const navigate = useNavigate();

  const { loading: itemsLoading } = useItemData();
  const { recipes: recipesData } = useRecipeData();
  const { points: gatheringData } = useGatheringData();
  const { sources: sourcesData } = useSourcesData();
  const { tabOrder, getDefaultTab } = useSettings();

  const [item, setItem] = useState<Item | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [gatheringPoints, setGatheringPoints] = useState<GatheringPoint[]>([]);
  const [sources, setSources] = useState<ItemSource[]>([]);
  const [usedForRecipes, setUsedForRecipes] = useState<Recipe[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(getDefaultTab());

  useEffect(() => {
    if (!itemsLoading && itemId) {
      const foundItem = getItemById(itemId);
      setItem(foundItem || null);

      // Get recipes for this item
      setRecipes(recipesData[itemId] || []);

      // Get gathering points for this item
      setGatheringPoints(gatheringData[itemId] || []);

      // Get sources for this item
      setSources(sourcesData[itemId] || []);

      // Get recipes that use this item as ingredient
      setUsedForRecipes(getRecipesUsingItem(itemId));
    }
  }, [itemsLoading, itemId, recipesData, gatheringData, sourcesData]);

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)]"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <div className="text-[var(--ffxiv-muted)] mb-4">找不到此物品</div>
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--ffxiv-accent)] hover:text-[var(--ffxiv-accent-hover)] hover:underline transition-colors"
        >
          返回搜尋
        </button>
      </div>
    );
  }

  const iconUrl = getItemIconUrl(item.icon);

  // Count total obtain methods
  const obtainCount = sources.length + (recipes.length > 0 ? 1 : 0) + (gatheringPoints.length > 0 ? 1 : 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-accent)] mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回搜尋
      </button>

      {/* Item header */}
      <div className="bg-[var(--ffxiv-bg-secondary)] rounded-lg border border-[var(--ffxiv-border)] mb-6 overflow-hidden">
        {/* Top section - Name and Icon */}
        <div className="p-4 border-b border-[var(--ffxiv-border)]">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-14 h-14 bg-[var(--ffxiv-bg-tertiary)] rounded-lg overflow-hidden">
              <img
                src={iconUrl}
                alt={item.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getItemIconUrl(0);
                }}
              />
            </div>

            {/* Name and ID */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold truncate ${getRarityClass(item.rarity)}`}>
                  {item.name}
                </h1>
                <CopyButton text={item.name} />
              </div>
              <div className="text-sm text-[var(--ffxiv-muted)]">ID: {item.id}</div>
            </div>

            {/* Add to price list button */}
            {!item.isUntradable && (
              <AddToPriceListButton itemId={item.id} variant="button" />
            )}
          </div>
        </div>

        {/* Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-[var(--ffxiv-border)]">
          {/* Category */}
          <div className="p-3">
            <div className="text-xs text-[var(--ffxiv-muted)] mb-1">分類</div>
            <div className="text-sm font-medium">{item.categoryName}</div>
          </div>

          {/* Item Level */}
          <div className="p-3">
            <div className="text-xs text-[var(--ffxiv-muted)] mb-1">物品等級</div>
            <div className="text-sm font-medium">{item.itemLevel}</div>
          </div>

          {/* Equip Level */}
          <div className="p-3">
            <div className="text-xs text-[var(--ffxiv-muted)] mb-1">裝備等級</div>
            <div className="text-sm font-medium">{item.equipLevel > 0 ? item.equipLevel : '-'}</div>
          </div>

          {/* Patch */}
          <div className="p-3">
            <div className="text-xs text-[var(--ffxiv-muted)] mb-1">版本</div>
            <div className="text-sm font-medium">{item.patch || '-'}</div>
          </div>
        </div>

        {/* Tags */}
        <div className="p-4 border-t border-[var(--ffxiv-border)] flex flex-wrap gap-2">
          {item.canBeHq && (
            <span className="px-2 py-1 bg-[var(--ffxiv-highlight)]/20 text-[var(--ffxiv-highlight)] rounded text-xs">
              可製作 HQ
            </span>
          )}
          {item.isCraftable && (
            <span className="px-2 py-1 bg-[var(--ffxiv-accent)]/20 text-[var(--ffxiv-accent)] rounded text-xs">
              可製作
            </span>
          )}
          {item.isGatherable && (
            <span className="px-2 py-1 bg-[var(--ffxiv-success)]/20 text-[var(--ffxiv-success)] rounded text-xs">
              可採集
            </span>
          )}
          {item.isUntradable ? (
            <span className="px-2 py-1 bg-[var(--ffxiv-error)]/20 text-[var(--ffxiv-error)] rounded text-xs">
              不可交易
            </span>
          ) : (
            <span className="px-2 py-1 bg-[var(--ffxiv-success)]/20 text-[var(--ffxiv-success)] rounded text-xs">
              可交易
            </span>
          )}
          {item.stackSize > 1 && (
            <span className="px-2 py-1 bg-[var(--ffxiv-bg-tertiary)] text-[var(--ffxiv-muted)] rounded text-xs">
              可堆疊: {item.stackSize}
            </span>
          )}
        </div>

        {/* Description */}
        {item.description && cleanFFXIVText(item.description) && (
          <div className="p-4 border-t border-[var(--ffxiv-border)] bg-[var(--ffxiv-bg-tertiary)]">
            <p className="text-sm text-[var(--ffxiv-muted)] leading-relaxed">
              {cleanFFXIVText(item.description)}
            </p>
          </div>
        )}
      </div>

      {/* Equipment Stats */}
      {item.equipStats && (
        <div className="mb-6">
          <EquipmentStatsView
            equipStats={item.equipStats}
            canBeHq={item.canBeHq}
            equipLevel={item.equipLevel}
            itemLevel={item.itemLevel}
          />
        </div>
      )}

      {/* Tabs - rendered in user-defined order */}
      <div className="flex border-b border-[var(--ffxiv-accent)] mb-4 overflow-x-auto">
        {tabOrder.map((tab) => {
          // Skip craftcost tab if no recipes
          if (tab.id === 'craftcost' && recipes.length === 0) return null;

          // Get count for each tab
          let count: number | null = null;
          if (tab.id === 'obtain') count = obtainCount;
          else if (tab.id === 'recipe') count = recipes.length;
          else if (tab.id === 'gathering') count = gatheringPoints.length;
          else if (tab.id === 'usedfor') count = usedForRecipes.length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[var(--ffxiv-highlight)] border-b-2 border-[var(--ffxiv-highlight)]'
                  : 'text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-text)]'
              }`}
            >
              {tab.name} {count !== null && count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === 'obtain' && (
          <ObtainView
            itemId={item.id}
            sources={sources}
            recipes={recipes}
            gatheringPoints={gatheringPoints}
          />
        )}
        {activeTab === 'recipe' && <RecipeView recipes={recipes} />}
        {activeTab === 'gathering' && <GatheringView points={gatheringPoints} />}
        {activeTab === 'market' && (
          <MarketPrice itemId={item.id} isUntradable={item.isUntradable} />
        )}
        {activeTab === 'craftcost' && (
          <CraftingPriceTree itemId={item.id} isUntradable={item.isUntradable} />
        )}
        {activeTab === 'usedfor' && (
          <UsedForView itemId={item.id} recipes={usedForRecipes} />
        )}
      </div>
    </div>
  );
}
