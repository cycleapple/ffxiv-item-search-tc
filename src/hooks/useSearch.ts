// Hook for search functionality
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { SearchFilters, SearchResult } from '../types';
import { searchItems } from '../services/searchService';

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  categoryId: null,
  minLevel: 1,
  maxLevel: 999,
  minEquipLevel: 1,
  maxEquipLevel: 100,
  classJobId: null,
  selectedJobs: [],
  craftableOnly: false,
  gatherableOnly: false,
  canBeHq: null,
  tradeable: null,
  rarity: null,
  patch: null,
};

const PAGE_SIZE = 100;

interface UseSearchReturn {
  filters: SearchFilters;
  results: SearchResult[];
  totalResults: number;
  isSearching: boolean;
  hasSearched: boolean;  // Whether user has initiated a search
  hasMore: boolean;      // Whether there are more results to load
  updateQuery: (query: string) => void;
  updateFilters: (updates: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  loadMore: () => void;
}

// Check if any filter is active (not default)
function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.categoryId !== null ||
    filters.minLevel !== 1 ||
    filters.maxLevel !== 999 ||
    filters.minEquipLevel !== 1 ||
    filters.maxEquipLevel !== 100 ||
    filters.selectedJobs.length > 0 ||
    filters.craftableOnly ||
    filters.gatherableOnly ||
    filters.canBeHq !== null ||
    filters.tradeable !== null ||
    filters.rarity !== null ||
    filters.patch !== null
  );
}

export function useSearch(): UseSearchReturn {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [isSearching, setIsSearching] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  const updateQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, query }));
  }, []);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [filters]);

  // Check if user has searched (has any active filter)
  const hasSearched = useMemo(() => hasActiveFilters(filters), [filters]);

  // Memoized search results - only search if there are active filters
  const searchData = useMemo(() => {
    if (!hasSearched) {
      return { results: [], total: 0 };
    }
    setIsSearching(true);
    const data = searchItems(filters, displayLimit);
    setIsSearching(false);
    return data;
  }, [filters, hasSearched, displayLimit]);

  const loadMore = useCallback(() => {
    setDisplayLimit(prev => prev + PAGE_SIZE);
  }, []);

  const hasMore = searchData.total > searchData.results.length;

  return {
    filters,
    results: searchData.results,
    totalResults: searchData.total,
    isSearching,
    hasSearched,
    hasMore,
    updateQuery,
    updateFilters,
    resetFilters,
    loadMore,
  };
}
