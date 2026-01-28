// Hook for loading and managing item data
import { useState, useEffect } from 'react';
import type { Item, ItemCategory, Recipe, GatheringPoint, ItemSource } from '../types';
import { initializeSearchIndex } from '../services/searchService';

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

async function loadAllData(): Promise<void> {
  if (dataLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Load all JSON data files in parallel
      const [itemsResponse, recipesResponse, gatheringResponse, sourcesResponse, desynthResultsResponse, tradesResponse] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}data/items.json`),
        fetch(`${import.meta.env.BASE_URL}data/recipes.json`),
        fetch(`${import.meta.env.BASE_URL}data/gathering.json`),
        fetch(`${import.meta.env.BASE_URL}data/sources.json`),
        fetch(`${import.meta.env.BASE_URL}data/desynth-results.json`),
        fetch(`${import.meta.env.BASE_URL}data/trades.json`),
      ]);

      if (!itemsResponse.ok) throw new Error('Failed to load items data');

      const itemsData = await itemsResponse.json();
      globalItemData = {
        items: itemsData.items || {},
        categories: itemsData.categories || [],
        loading: false,
        error: null,
      };

      // Initialize search index
      initializeSearchIndex(globalItemData.items);

      // Recipes (optional, may not exist yet)
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

      // Gathering (optional, may not exist yet)
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

      // Sources (optional, may not exist yet)
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

      // Desynth results (what you get by desynthing this item)
      if (desynthResultsResponse.ok) {
        const desynthData = await desynthResultsResponse.json();
        globalDesynthResults = desynthData.results || {};
      }

      // Trades (what items you can buy with this currency)
      if (tradesResponse.ok) {
        globalTrades = await tradesResponse.json();
      }

      dataLoaded = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      globalItemData.error = errorMessage;
      globalItemData.loading = false;
      globalRecipeData.loading = false;
      globalGatheringData.loading = false;
      globalSourcesData.loading = false;
    }
  })();

  return loadingPromise;
}

/**
 * Hook to access item data
 */
export function useItemData(): ItemData {
  const [state, setState] = useState<ItemData>(globalItemData);

  useEffect(() => {
    if (!dataLoaded && !loadingPromise) {
      loadAllData().then(() => {
        setState({ ...globalItemData });
      });
    } else if (dataLoaded) {
      setState(globalItemData);
    } else if (loadingPromise) {
      loadingPromise.then(() => {
        setState({ ...globalItemData });
      });
    }
  }, []);

  return state;
}

/**
 * Hook to access recipe data
 */
export function useRecipeData(): RecipeData {
  const [state, setState] = useState<RecipeData>(globalRecipeData);

  useEffect(() => {
    if (!dataLoaded && !loadingPromise) {
      loadAllData().then(() => {
        setState({ ...globalRecipeData });
      });
    } else if (dataLoaded) {
      setState(globalRecipeData);
    } else if (loadingPromise) {
      loadingPromise.then(() => {
        setState({ ...globalRecipeData });
      });
    }
  }, []);

  return state;
}

/**
 * Hook to access gathering data
 */
export function useGatheringData(): GatheringData {
  const [state, setState] = useState<GatheringData>(globalGatheringData);

  useEffect(() => {
    if (!dataLoaded && !loadingPromise) {
      loadAllData().then(() => {
        setState({ ...globalGatheringData });
      });
    } else if (dataLoaded) {
      setState(globalGatheringData);
    } else if (loadingPromise) {
      loadingPromise.then(() => {
        setState({ ...globalGatheringData });
      });
    }
  }, []);

  return state;
}

/**
 * Hook to access sources data
 */
export function useSourcesData(): SourcesData {
  const [state, setState] = useState<SourcesData>(globalSourcesData);

  useEffect(() => {
    if (!dataLoaded && !loadingPromise) {
      loadAllData().then(() => {
        setState({ ...globalSourcesData });
      });
    } else if (dataLoaded) {
      setState(globalSourcesData);
    } else if (loadingPromise) {
      loadingPromise.then(() => {
        setState({ ...globalSourcesData });
      });
    }
  }, []);

  return state;
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
