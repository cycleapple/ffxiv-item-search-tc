// Hook for building and calculating crafting price tree
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CraftingTreeNode, MarketData, ListingInfo } from '../types';
import { getItemById } from '../services/searchService';
import { getMultipleMarketData } from '../services/universalisApi';
import { getRecipesForItem } from './useItemData';

// Crystal item IDs (2-19)
const CRYSTAL_IDS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

const MAX_DEPTH = 10;

// Always use data center for cross-server price comparison
const DATA_CENTER = '陸行鳥';

// Quality filter type
export type QualityFilter = 'both' | 'nq' | 'hq';

interface UseCraftingTreeReturn {
  tree: CraftingTreeNode | null;
  loading: boolean;
  error: string | null;
  totalCraftCost: number;
  totalBuyCostHQ: number;
  refresh: () => void;
}

/**
 * Build the crafting tree structure recursively
 */
function buildTreeStructure(
  itemId: number,
  quantity: number,
  visitedIds: Set<number>,
  depth: number,
  showCrystals: boolean
): CraftingTreeNode | null {
  // Depth limit
  if (depth > MAX_DEPTH) return null;

  // Cycle detection
  if (visitedIds.has(itemId)) return null;

  const item = getItemById(itemId);
  if (!item) return null;

  // Skip crystals if not showing them
  if (!showCrystals && CRYSTAL_IDS.has(itemId)) return null;

  // Clone visited set for this branch
  const newVisited = new Set(visitedIds);
  newVisited.add(itemId);

  // Get recipe for this item
  const recipes = getRecipesForItem(itemId);
  const recipe = recipes.length > 0 ? recipes[0] : null;

  const node: CraftingTreeNode = {
    item,
    recipe,
    quantity,
    marketPriceNQ: null,
    marketPriceHQ: null,
    serverNQ: '',
    serverHQ: '',
    craftCost: null,
    children: [],
    depth,
  };

  // Build children if recipe exists
  if (recipe) {
    const numCrafts = recipe.resultAmount > 1
      ? Math.ceil(quantity / recipe.resultAmount)
      : quantity;

    for (const ingredient of recipe.ingredients) {
      const childNode = buildTreeStructure(
        ingredient.itemId,
        ingredient.amount * numCrafts,
        newVisited,
        depth + 1,
        showCrystals
      );
      if (childNode) {
        node.children.push(childNode);
      }
    }
  }

  return node;
}

/**
 * Collect all unique item IDs from the tree
 */
function collectAllItemIds(node: CraftingTreeNode): Set<number> {
  const ids = new Set<number>();
  ids.add(node.item.id);
  for (const child of node.children) {
    for (const id of collectAllItemIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * Find cheapest NQ listing and its server
 */
function findCheapestNQ(priceData: MarketData): { price: number | null; server: string } {
  if (!priceData.listings || priceData.listings.length === 0) {
    return { price: priceData.minPriceNQ > 0 ? priceData.minPriceNQ : null, server: '' };
  }

  let cheapestPrice: number | null = null;
  let cheapestServer = '';

  for (const listing of priceData.listings) {
    if (!listing.hq) {
      if (cheapestPrice === null || listing.pricePerUnit < cheapestPrice) {
        cheapestPrice = listing.pricePerUnit;
        cheapestServer = listing.worldName || '';
      }
    }
  }

  if (cheapestPrice === null && priceData.minPriceNQ > 0) {
    cheapestPrice = priceData.minPriceNQ;
  }

  return { price: cheapestPrice, server: cheapestServer };
}

/**
 * Find cheapest HQ listing and its server
 */
function findCheapestHQ(priceData: MarketData): { price: number | null; server: string } {
  if (!priceData.listings || priceData.listings.length === 0) {
    return { price: priceData.minPriceHQ > 0 ? priceData.minPriceHQ : null, server: '' };
  }

  let cheapestPrice: number | null = null;
  let cheapestServer = '';

  for (const listing of priceData.listings) {
    if (listing.hq) {
      if (cheapestPrice === null || listing.pricePerUnit < cheapestPrice) {
        cheapestPrice = listing.pricePerUnit;
        cheapestServer = listing.worldName || '';
      }
    }
  }

  if (cheapestPrice === null && priceData.minPriceHQ > 0) {
    cheapestPrice = priceData.minPriceHQ;
  }

  return { price: cheapestPrice, server: cheapestServer };
}

/**
 * Extract top listings sorted by price for tooltip display
 */
function extractListings(priceData: MarketData, limit: number = 8): ListingInfo[] {
  if (!priceData.listings || priceData.listings.length === 0) {
    return [];
  }

  // Sort by price and take top N
  const sorted = [...priceData.listings]
    .sort((a, b) => a.pricePerUnit - b.pricePerUnit)
    .slice(0, limit);

  return sorted.map(listing => ({
    price: listing.pricePerUnit,
    quantity: listing.quantity,
    server: listing.worldName || '',
    hq: listing.hq,
    lastReviewTime: listing.lastReviewTime,
  }));
}

/**
 * Apply market prices to tree nodes
 */
function applyPrices(
  node: CraftingTreeNode,
  prices: Record<number, MarketData>
): void {
  const priceData = prices[node.item.id];

  if (priceData) {
    const nqResult = findCheapestNQ(priceData);
    const hqResult = findCheapestHQ(priceData);

    node.marketPriceNQ = nqResult.price;
    node.marketPriceHQ = hqResult.price;
    node.serverNQ = nqResult.server;
    node.serverHQ = hqResult.server;
    node.listings = extractListings(priceData, 8);
    node.lastUploadTime = priceData.lastUploadTime;
  }

  for (const child of node.children) {
    applyPrices(child, prices);
  }
}

/**
 * Get the cheapest buy price (NQ or HQ, whichever is cheaper)
 * Used for materials when calculating craft cost
 */
function getCheapestBuyPrice(node: CraftingTreeNode): number | null {
  const nqPrice = node.marketPriceNQ;
  const hqPrice = node.marketPriceHQ;

  if (nqPrice !== null && hqPrice !== null) {
    return Math.min(nqPrice, hqPrice);
  }
  return nqPrice ?? hqPrice;
}

/**
 * Calculate costs for each node (bottom-up)
 * Always uses cheapest materials (NQ or HQ) for craft cost calculation
 */
function calculateCosts(node: CraftingTreeNode): void {
  // First, calculate costs for all children
  for (const child of node.children) {
    calculateCosts(child);
  }

  // If no recipe, can only buy
  if (!node.recipe || node.children.length === 0) {
    node.craftCost = null;
    return;
  }

  // Calculate craft cost from children using cheapest materials
  let craftCost = 0;
  for (const child of node.children) {
    const childCraftCost = child.craftCost;
    const childBuyPrice = getCheapestBuyPrice(child);
    const childBuyCost = childBuyPrice !== null ? childBuyPrice * child.quantity : null;

    let cheapestChildCost: number | null = null;

    if (childCraftCost !== null && childBuyCost !== null) {
      cheapestChildCost = Math.min(childCraftCost, childBuyCost);
    } else if (childCraftCost !== null) {
      cheapestChildCost = childCraftCost;
    } else if (childBuyCost !== null) {
      cheapestChildCost = childBuyCost;
    }

    if (cheapestChildCost === null) {
      node.craftCost = null;
      return;
    }

    craftCost += cheapestChildCost;
  }

  node.craftCost = Math.ceil(craftCost);
}

/**
 * Calculate total costs for the root item
 * Compares: HQ buy price vs craft cost (using cheapest materials)
 */
function calculateTotals(tree: CraftingTreeNode): { craftCost: number; buyCostHQ: number } {
  const craftCost = tree.craftCost ?? 0;

  // Always use HQ price for buy comparison
  const hqPrice = tree.marketPriceHQ;
  const buyCostHQ = hqPrice !== null ? hqPrice * tree.quantity : 0;

  return { craftCost, buyCostHQ };
}

/**
 * Hook to build and calculate crafting price tree
 */
export function useCraftingTree(
  itemId: number | null,
  showCrystals: boolean,
  qualityFilter: QualityFilter = 'both',
  quantity: number = 1
): UseCraftingTreeReturn {
  const [tree, setTree] = useState<CraftingTreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!itemId) {
      setTree(null);
      return;
    }

    const currentItemId = itemId;
    let cancelled = false;

    async function buildTree() {
      setLoading(true);
      setError(null);

      try {
        const rootTree = buildTreeStructure(currentItemId, quantity, new Set(), 0, showCrystals);

        if (!rootTree) {
          setError('無法建立製作樹');
          setTree(null);
          setLoading(false);
          return;
        }

        const allIds = Array.from(collectAllItemIds(rootTree));
        const prices = await getMultipleMarketData(allIds, DATA_CENTER);

        if (cancelled) return;

        applyPrices(rootTree, prices);
        calculateCosts(rootTree);

        setTree(rootTree);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '發生錯誤');
          setTree(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    buildTree();

    return () => {
      cancelled = true;
    };
  }, [itemId, showCrystals, qualityFilter, quantity, refreshTrigger]);

  const totals = useMemo(() => {
    if (!tree) return { craftCost: 0, buyCostHQ: 0 };
    return calculateTotals(tree);
  }, [tree]);

  return {
    tree,
    loading,
    error,
    totalCraftCost: totals.craftCost,
    totalBuyCostHQ: totals.buyCostHQ,
    refresh,
  };
}
