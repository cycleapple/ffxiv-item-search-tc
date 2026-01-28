// Search service using FlexSearch
import FlexSearch from 'flexsearch';
import type { Item, SearchFilters, SearchResult } from '../types';

// Multilingual names type
interface MultilingualNames {
  [itemId: string]: {
    en?: string;
    ja?: string;
    cn?: string;
  };
}

// FlexSearch index for items - using any to handle the dynamic nature of FlexSearch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let itemIndex: any = null;
let itemsMap: Map<number, Item> = new Map();
let multilingualNames: MultilingualNames = {};

/**
 * Set multilingual names data for search
 */
export function setMultilingualNames(names: MultilingualNames): void {
  multilingualNames = names;
  console.log(`Loaded ${Object.keys(names).length} multilingual name entries`);
}

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

  // Add items to index - include all language names for search
  for (const [id, item] of itemsMap) {
    // Build search text with all available names
    const searchParts = [item.name, item.description || ''];

    // Add multilingual names if available
    const multiNames = multilingualNames[id];
    if (multiNames) {
      if (multiNames.en) searchParts.push(multiNames.en);
      if (multiNames.ja) searchParts.push(multiNames.ja);
      if (multiNames.cn) searchParts.push(multiNames.cn);
    }

    itemIndex.add(id, searchParts.join(' '));
  }

  console.log(`Search index initialized with ${itemsMap.size} items`);
}

/**
 * Search result with total count for pagination
 */
export interface SearchResultWithTotal {
  results: SearchResult[];
  total: number;
}

/**
 * Search for items matching the query and filters
 */
export function searchItems(filters: SearchFilters, limit = 100): SearchResultWithTotal {
  if (!itemIndex || itemsMap.size === 0) {
    console.warn('Search index not initialized');
    return { results: [], total: 0 };
  }

  let results: Item[];

  if (filters.query.trim()) {
    // Normalize query for better Unicode matching (handles different input methods)
    const query = filters.query.trim().toLowerCase().normalize('NFC');

    // Search by query using FlexSearch
    const searchResults = itemIndex.search(filters.query, { limit: 5000 }) as number[];
    const flexSearchIds = new Set(searchResults);

    results = searchResults
      .map((id: number) => itemsMap.get(id))
      .filter((item): item is Item => item !== undefined);

    // Also do substring search across all names (TC, EN, JA, CN) for better CJK support
    // This catches cases where FlexSearch tokenization doesn't match partial strings
    for (const [id, item] of itemsMap) {
      if (flexSearchIds.has(id)) continue; // Already in results

      // Check TC name and description (normalize for Unicode compatibility)
      if (item.name.toLowerCase().normalize('NFC').includes(query) ||
          (item.description && item.description.toLowerCase().normalize('NFC').includes(query))) {
        results.push(item);
        continue;
      }

      // Check multilingual names
      const multiNames = multilingualNames[id];
      if (multiNames) {
        const enMatch = multiNames.en && multiNames.en.toLowerCase().normalize('NFC').includes(query);
        const jaMatch = multiNames.ja && multiNames.ja.toLowerCase().normalize('NFC').includes(query);
        const cnMatch = multiNames.cn && multiNames.cn.toLowerCase().normalize('NFC').includes(query);

        if (enMatch || jaMatch || cnMatch) {
          results.push(item);
        }

        // Debug logging for item 36374 (orchestrion roll)
        if (id === 36374 || item.name.includes('昏暗')) {
          console.log('Debug search for item', id, item.name);
          console.log('  Query:', query, 'hex:', Array.from(query).map(c => c.charCodeAt(0).toString(16)).join(' '));
          console.log('  JA name:', multiNames.ja);
          if (multiNames.ja) {
            console.log('  JA hex:', Array.from(multiNames.ja).map(c => c.charCodeAt(0).toString(16)).join(' '));
            console.log('  JA match:', jaMatch);
          }
        }
      }
    }
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

  const total = results.length;

  // Limit results
  return {
    results: results.slice(0, limit).map(item => ({
      item,
      score: 1, // FlexSearch doesn't provide scores in this version
    })),
    total,
  };
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

// Re-export from useItemData for convenience
export { getRecipesForItem } from '../hooks/useItemData';
