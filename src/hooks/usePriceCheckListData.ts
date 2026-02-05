// Hook for fetching price and crafting data for price check list items
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PriceCheckListItem, CraftingTreeNode, MarketData, Item, ListingInfo } from '../types';
import { getItemById } from '../services/searchService';
import { getMultipleMarketData } from '../services/universalisApi';
import { getRecipesForItem } from './useItemData';

// Crystal item IDs (2-19)
const CRYSTAL_IDS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

const MAX_DEPTH = 10;
const DATA_CENTER = '陸行鳥';

export type QualityFilter = 'both' | 'nq' | 'hq';

export interface PriceCheckListItemData {
  listItem: PriceCheckListItem;
  item: Item | null;
  tree: CraftingTreeNode | null;
  totalCraftCost: number;
  totalBuyCostHQ: number;
}

interface UsePriceCheckListDataReturn {
  items: PriceCheckListItemData[];
  loading: boolean;
  error: string | null;
  grandTotalCraftCost: number;
  grandTotalBuyCostHQ: number;
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
  if (depth > MAX_DEPTH) return null;
  if (visitedIds.has(itemId)) return null;

  const item = getItemById(itemId);
  if (!item) return null;

  if (!showCrystals && CRYSTAL_IDS.has(itemId)) return null;

  const newVisited = new Set(visitedIds);
  newVisited.add(itemId);

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

  if (recipe) {
    for (const ingredient of recipe.ingredients) {
      const childNode = buildTreeStructure(
        ingredient.itemId,
        ingredient.amount * quantity,
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
 * Collect all unique item IDs from multiple trees
 */
function collectAllItemIdsFromTrees(trees: (CraftingTreeNode | null)[]): Set<number> {
  const ids = new Set<number>();

  function collectFromNode(node: CraftingTreeNode | null) {
    if (!node) return;
    ids.add(node.item.id);
    for (const child of node.children) {
      collectFromNode(child);
    }
  }

  for (const tree of trees) {
    collectFromNode(tree);
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
  for (const child of node.children) {
    calculateCosts(child);
  }

  if (!node.recipe || node.children.length === 0) {
    node.craftCost = null;
    return;
  }

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

  if (node.recipe.resultAmount > 1) {
    craftCost = craftCost / node.recipe.resultAmount * node.quantity;
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
 * Hook for fetching price check list data
 */
export function usePriceCheckListData(
  list: PriceCheckListItem[],
  showCrystals: boolean,
  qualityFilter: QualityFilter
): UsePriceCheckListDataReturn {
  const [prices, setPrices] = useState<Record<number, MarketData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Stable key for item IDs only (not quantities) to avoid refetching on quantity change
  const listItemIds = useMemo(() => list.map(l => l.itemId).sort().join(','), [list]);

  // Fetch prices only when item IDs, crystals filter, or quality filter change
  useEffect(() => {
    if (list.length === 0) {
      setPrices({});
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Build trees with quantity=1 just to collect all item IDs
        const allTreeIds: Set<number> = new Set();
        for (const listItem of list) {
          const tree = buildTreeStructure(listItem.itemId, 1, new Set(), 0, showCrystals);
          if (tree) {
            for (const id of collectAllItemIdsFromTrees([tree])) {
              allTreeIds.add(id);
            }
          }
        }

        const fetchedPrices = await getMultipleMarketData(Array.from(allTreeIds), DATA_CENTER);

        if (cancelled) return;
        setPrices(fetchedPrices);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '發生錯誤');
          setPrices({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listItemIds, showCrystals, qualityFilter, refreshTrigger]);

  // Build trees and apply prices (runs on quantity change without refetching)
  const items = useMemo<PriceCheckListItemData[]>(() => {
    if (list.length === 0 || Object.keys(prices).length === 0) return [];

    return list.map(listItem => {
      const item = getItemById(listItem.itemId) ?? null;
      const tree = buildTreeStructure(listItem.itemId, listItem.quantity, new Set(), 0, showCrystals);

      if (tree) {
        applyPrices(tree, prices);
        calculateCosts(tree);
        const totals = calculateTotals(tree);

        return {
          listItem,
          item,
          tree,
          totalCraftCost: totals.craftCost,
          totalBuyCostHQ: totals.buyCostHQ,
        };
      }

      // No tree - just get HQ market price for comparison
      const priceData = prices[listItem.itemId];
      let buyCostHQ = 0;
      if (priceData) {
        const hqResult = findCheapestHQ(priceData);
        if (hqResult.price !== null) {
          buyCostHQ = hqResult.price * listItem.quantity;
        }
      }

      return {
        listItem,
        item,
        tree: null,
        totalCraftCost: 0,
        totalBuyCostHQ: buyCostHQ,
      };
    });
  }, [list, prices, showCrystals]);

  // Calculate grand totals
  const grandTotals = useMemo(() => {
    let craftCost = 0;
    let buyCostHQ = 0;

    for (const item of items) {
      craftCost += item.totalCraftCost;
      buyCostHQ += item.totalBuyCostHQ;
    }

    return { craftCost, buyCostHQ };
  }, [items]);

  return {
    items,
    loading,
    error,
    grandTotalCraftCost: grandTotals.craftCost,
    grandTotalBuyCostHQ: grandTotals.buyCostHQ,
    refresh,
  };
}
