// Hook for loading and managing item data
import { useState, useEffect } from 'react';
import type { Item, ItemCategory, Recipe, GatheringPoint, ItemSource } from '../types';
import { initializeSearchIndex, setMultilingualNames } from '../services/searchService';

interface ItemData {
  items: Record<number, Item>;
  categories: ItemCategory[];
  loading: boolean;
  error: string | null;
}

interface RecipeData {
  recipes: Record<number, Recipe[]>;
  craftTypes: { id: number; name: string }[];
  loading: boolean;
  error: string | null;
}

interface GatheringData {
  points: Record<number, GatheringPoint[]>;
  gatheringTypes: { id: number; name: string }[];
  places: Record<number, string>;
  loading: boolean;
  error: string | null;
}

interface SourcesData {
  sources: Record<number, ItemSource[]>;
  loading: boolean;
  error: string | null;
}

// Global state for data (loaded once)
let globalItemData: ItemData = {
  items: {},
  categories: [],
  loading: true,
  error: null,
};

let globalRecipeData: RecipeData = {
  recipes: {},
  craftTypes: [],
  loading: true,
  error: null,
};

let globalGatheringData: GatheringData = {
  points: {},
  gatheringTypes: [],
  places: {},
  loading: true,
  error: null,
};

let globalSourcesData: SourcesData = {
  sources: {},
  loading: true,
  error: null,
};

// Desynth results (what items you get by desynthing)
let globalDesynthResults: Record<number, number[]> = {};

// Trades (what items you can buy with this currency item)
interface TradeCurrency {
  id: number;
  amount: number;
}

interface TradeItem {
  itemId: number;
  amount: number;
  currencies: TradeCurrency[];
}
let globalTrades: Record<number, TradeItem[]> = {};

let dataLoaded = false;
let loadingPromise: Promise<void> | null = null;
let secondaryLoadingPromise: Promise<void> | null = null;
const secondaryListeners: Array<() => void> = [];

function notifySecondaryListeners() {
  secondaryListeners.forEach(fn => fn());
}

// Compact index field order (must match build-data.js output)
const INDEX_FIELDS = ['id','name','icon','itemLevel','equipLevel','rarity','categoryId','categoryName','canBeHq','stackSize','isUntradable','isCraftable','isGatherable','patch'] as const;
const BOOL_FIELDS = new Set(['canBeHq','isUntradable','isCraftable','isGatherable']);

function decodeIndexItems(indexData: { fields: string[]; items: (string | number)[][]; categories: ItemCategory[] }): Record<number, Item> {
  const fields = indexData.fields;
  const items: Record<number, Item> = {};
  for (const row of indexData.items) {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      obj[f] = BOOL_FIELDS.has(f) ? (row[i] === 1) : row[i];
    }
    // Fields not in index default to empty
    obj.description = '';
    items[obj.id as number] = obj as unknown as Item;
  }
  return items;
}

// Full item data cache (loaded lazily for detail pages)
let fullItemsLoaded = false;
let fullItemsPromise: Promise<void> | null = null;

async function loadFullItems(): Promise<void> {
  if (fullItemsLoaded) return;
  if (fullItemsPromise) return fullItemsPromise;
  fullItemsPromise = (async () => {
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}data/items.json`);
      if (!resp.ok) return;
      const data = await resp.json();
      // Merge full item data into globalItemData.items (preserving reference)
      const fullItems = data.items || {};
      for (const [id, item] of Object.entries(fullItems)) {
        globalItemData.items[Number(id)] = item as Item;
      }
      fullItemsLoaded = true;
    } catch (e) {
      console.error('Failed to load full items:', e);
    }
  })();
  return fullItemsPromise;
}

/** Load full item data on demand (for detail pages) */
export function ensureFullItemData(): Promise<void> {
  return loadFullItems();
}

async function loadAllData(): Promise<void> {
  if (dataLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Phase 1: Load compact index (~2MB) + multilingual names for search
      const [indexResponse, multiNamesResponse] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}data/items-index.json`),
        fetch(`${import.meta.env.BASE_URL}data/item-names-multi.json`),
      ]);

      if (!indexResponse.ok) throw new Error('Failed to load items index');

      const indexData = await indexResponse.json();
      globalItemData = {
        items: decodeIndexItems(indexData),
        categories: indexData.categories || [],
        loading: false,
        error: null,
      };

      if (multiNamesResponse.ok) {
        const multiNamesData = await multiNamesResponse.json();
        setMultilingualNames(multiNamesData);
      }

      initializeSearchIndex(globalItemData.items);
      dataLoaded = true;

      // Phase 2: Load secondary data + full items in background
      secondaryLoadingPromise = loadSecondaryData();
      loadFullItems(); // pre-warm full item data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      globalItemData.error = errorMessage;
      globalItemData.loading = false;
    }
  })();

  return loadingPromise;
}

async function loadSecondaryData(): Promise<void> {
  try {
    const [recipesResponse, gatheringResponse, sourcesResponse, desynthResultsResponse, tradesResponse] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/recipes.json`),
      fetch(`${import.meta.env.BASE_URL}data/gathering.json`),
      fetch(`${import.meta.env.BASE_URL}data/sources.json`),
      fetch(`${import.meta.env.BASE_URL}data/desynth-results.json`),
      fetch(`${import.meta.env.BASE_URL}data/trades.json`),
    ]);

    if (recipesResponse.ok) {
      const recipesData = await recipesResponse.json();
      globalRecipeData = {
        recipes: recipesData.recipes || {},
        craftTypes: recipesData.craftTypes || [],
        loading: false,
        error: null,
      };
    } else {
      globalRecipeData.loading = false;
    }

    if (gatheringResponse.ok) {
      const gatheringData = await gatheringResponse.json();
      globalGatheringData = {
        points: gatheringData.points || {},
        gatheringTypes: gatheringData.gatheringTypes || [],
        places: gatheringData.places || {},
        loading: false,
        error: null,
      };
    } else {
      globalGatheringData.loading = false;
    }

    if (sourcesResponse.ok) {
      const sourcesData = await sourcesResponse.json();
      globalSourcesData = {
        sources: sourcesData.sources || {},
        loading: false,
        error: null,
      };
    } else {
      globalSourcesData.loading = false;
    }

    if (desynthResultsResponse.ok) {
      const desynthData = await desynthResultsResponse.json();
      globalDesynthResults = desynthData.results || {};
    }

    if (tradesResponse.ok) {
      globalTrades = await tradesResponse.json();
    }
  } catch (error) {
    console.error('Failed to load secondary data:', error);
    globalRecipeData.loading = false;
    globalGatheringData.loading = false;
    globalSourcesData.loading = false;
  }

  notifySecondaryListeners();
}

/**
 * Hook to access item data
 */
export function useItemData(): ItemData {
  // If data is already loaded, return it directly without causing re-renders
  const [state, setState] = useState<ItemData>(() =>
    dataLoaded ? globalItemData : { ...globalItemData }
  );

  useEffect(() => {
    // Skip if data already loaded
    if (dataLoaded) {
      // Only update if state doesn't match (e.g., initial render had stale data)
      if (state.loading !== globalItemData.loading) {
        setState(globalItemData);
      }
      return;
    }

    if (!loadingPromise) {
      loadAllData().then(() => {
        setState({ ...globalItemData });
      });
    } else {
      loadingPromise.then(() => {
        setState({ ...globalItemData });
      });
    }
  }, []);

  return state;
}

/**
 * Hook that subscribes to secondary data loading completion
 */
function useSecondaryData<T>(getCurrent: () => T): T {
  const [state, setState] = useState<T>(getCurrent);

  useEffect(() => {
    // If secondary data already loaded, sync state
    if (!globalRecipeData.loading || !globalGatheringData.loading || !globalSourcesData.loading) {
      setState(getCurrent());
    }

    const listener = () => setState(getCurrent());
    secondaryListeners.push(listener);
    return () => {
      const idx = secondaryListeners.indexOf(listener);
      if (idx >= 0) secondaryListeners.splice(idx, 1);
    };
  }, []);

  return state;
}

/**
 * Hook to access recipe data
 */
export function useRecipeData(): RecipeData {
  return useSecondaryData(() => ({ ...globalRecipeData }));
}

/**
 * Hook to access gathering data
 */
export function useGatheringData(): GatheringData {
  return useSecondaryData(() => ({ ...globalGatheringData }));
}

/**
 * Hook to access sources data
 */
export function useSourcesData(): SourcesData {
  return useSecondaryData(() => ({ ...globalSourcesData }));
}

/**
 * Get recipes for an item by ID
 */
export function getRecipesForItem(itemId: number): Recipe[] {
  return globalRecipeData.recipes[itemId] || [];
}

/**
 * Get gathering points for an item by ID
 */
export function getGatheringPointsForItem(itemId: number): GatheringPoint[] {
  return globalGatheringData.points[itemId] || [];
}

/**
 * Get sources for an item by ID
 */
export function getSourcesForItem(itemId: number): ItemSource[] {
  return globalSourcesData.sources[itemId] || [];
}

/**
 * Get all recipes that use an item as ingredient
 */
export function getRecipesUsingItem(itemId: number): Recipe[] {
  const results: Recipe[] = [];

  for (const recipes of Object.values(globalRecipeData.recipes)) {
    for (const recipe of recipes) {
      const usesItem = recipe.ingredients.some(ing => ing.itemId === itemId);
      if (usesItem) {
        results.push(recipe);
      }
    }
  }

  return results;
}

/**
 * Get items that can be obtained by desynthing this item
 */
export function getDesynthResults(itemId: number): number[] {
  return globalDesynthResults[itemId] || [];
}

/**
 * Get items that can be purchased with this currency item
 */
export function getTradesForCurrency(itemId: number): TradeItem[] {
  return globalTrades[itemId] || [];
}

export type { TradeItem, TradeCurrency };
