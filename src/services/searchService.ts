// Search service using FlexSearch
import FlexSearch from 'flexsearch';
import type { Item, SearchFilters, SearchResult } from '../types';

// FlexSearch index for items - using any to handle the dynamic nature of FlexSearch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let itemIndex: any = null;
let itemsMap: Map<number, Item> = new Map();

/**
 * Initialize the search index with items data
 */
export function initializeSearchIndex(items: Record<number, Item>): void {
  // Create FlexSearch index optimized for Chinese text
  // Use 'full' tokenization to allow matching any substring (important for Chinese)
  itemIndex = new FlexSearch.Index({
    tokenize: 'full',
    resolution: 9,
    cache: true,
  });

  itemsMap = new Map(
    Object.entries(items).map(([id, item]) => [parseInt(id), item as Item])
  );

  // Add items to index
  for (const [id, item] of itemsMap) {
    // Index both name and description
    itemIndex.add(id, `${item.name} ${item.description || ''}`);
  }

  console.log(`Search index initialized with ${itemsMap.size} items`);
}

/**
 * Search for items matching the query and filters
 */
export function searchItems(filters: SearchFilters, limit = 100): SearchResult[] {
  if (!itemIndex || itemsMap.size === 0) {
    console.warn('Search index not initialized');
    return [];
  }

  let results: Item[];

  if (filters.query.trim()) {
    // Search by query
    const searchResults = itemIndex.search(filters.query, { limit: 1000 }) as number[];
    results = searchResults
      .map((id: number) => itemsMap.get(id))
      .filter((item): item is Item => item !== undefined);
  } else {
    // No query, return all items
    results = Array.from(itemsMap.values());
  }

  // Apply filters
  results = results.filter(item => {
    // Category filter
    if (filters.categoryId !== null && item.categoryId !== filters.categoryId) {
      return false;
    }

    // Item Level filter
    if (item.itemLevel < filters.minLevel || item.itemLevel > filters.maxLevel) {
      return false;
    }

    // Equip Level filter
    if (filters.minEquipLevel !== 1 || filters.maxEquipLevel !== 100) {
      if (item.equipLevel < filters.minEquipLevel || item.equipLevel > filters.maxEquipLevel) {
        return false;
      }
    }

    // Craftable filter
    if (filters.craftableOnly && !item.isCraftable) {
      return false;
    }

    // Gatherable filter
    if (filters.gatherableOnly && !item.isGatherable) {
      return false;
    }

    // HQ filter
    if (filters.canBeHq !== null) {
      if (filters.canBeHq && !item.canBeHq) return false;
      if (!filters.canBeHq && item.canBeHq) return false;
    }

    // Tradeable filter
    if (filters.tradeable !== null) {
      // isUntradable is true when item cannot be traded
      const isTradeable = !item.isUntradable;
      if (filters.tradeable && !isTradeable) return false;
      if (!filters.tradeable && isTradeable) return false;
    }

    // Rarity filter
    if (filters.rarity !== null && item.rarity !== filters.rarity) {
      return false;
    }

    // Patch filter
    if (filters.patch !== null && item.patch !== filters.patch) {
      return false;
    }

    // Job filter - check if item can be worn by any of the selected jobs
    if (filters.selectedJobs.length > 0) {
      // Items must have equipStats with classJobCategoryName to be filtered by job
      if (!item.equipStats?.classJobCategoryName) {
        return false;
      }
      // Check if any selected job is in the classJobCategoryName
      const itemJobs = item.equipStats.classJobCategoryName.split(/\s+/);
      const hasMatchingJob = filters.selectedJobs.some(job => itemJobs.includes(job));
      if (!hasMatchingJob) {
        return false;
      }
    }

    return true;
  });

  // Sort by relevance (items matching query should be first) and then by level
  results.sort((a, b) => {
    // If there's a query, items with exact name match come first
    if (filters.query.trim()) {
      const queryLower = filters.query.toLowerCase();
      const aExact = a.name.toLowerCase().includes(queryLower);
      const bExact = b.name.toLowerCase().includes(queryLower);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
    }
    // Then sort by item level (descending)
    return b.itemLevel - a.itemLevel;
  });

  // Limit results
  return results.slice(0, limit).map(item => ({
    item,
    score: 1, // FlexSearch doesn't provide scores in this version
  }));
}

/**
 * Get a single item by ID
 */
export function getItemById(id: number): Item | undefined {
  return itemsMap.get(id);
}

/**
 * Get all items
 */
export function getAllItems(): Item[] {
  return Array.from(itemsMap.values());
}

/**
 * Get items by IDs
 */
export function getItemsByIds(ids: number[]): Item[] {
  return ids
    .map(id => itemsMap.get(id))
    .filter((item): item is Item => item !== undefined);
}

/**
 * Get item by exact name match
 */
export function getItemByName(name: string): Item | undefined {
  for (const item of itemsMap.values()) {
    if (item.name === name) {
      return item;
    }
  }
  return undefined;
}

/**
 * Get all unique patches from items
 */
export function getAllPatches(): string[] {
  const patches = new Set<string>();
  for (const item of itemsMap.values()) {
    if (item.patch) {
      patches.add(item.patch);
    }
  }
  return Array.from(patches).sort((a, b) => {
    // Sort patches in descending order (newest first)
    const [aMajor, aMinor] = a.split('.').map(Number);
    const [bMajor, bMinor] = b.split('.').map(Number);
    if (bMajor !== aMajor) return bMajor - aMajor;
    return bMinor - aMinor;
  });
}
