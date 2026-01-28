// Hook for search functionality
import { useState, useCallback, useMemo } from 'react';
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
  craftableOnly: false,
  gatherableOnly: false,
  canBeHq: null,
  tradeable: null,
  rarity: null,
  patch: null,
};

interface UseSearchReturn {
  filters: SearchFilters;
  results: SearchResult[];
  isSearching: boolean;
  hasSearched: boolean;  // Whether user has initiated a search
  updateQuery: (query: string) => void;
  updateFilters: (updates: Partial<SearchFilters>) => void;
  resetFilters: () => void;
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

  const updateQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, query }));
  }, []);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Check if user has searched (has any active filter)
  const hasSearched = useMemo(() => hasActiveFilters(filters), [filters]);

  // Memoized search results - only search if there are active filters
  const results = useMemo(() => {
    if (!hasSearched) {
      return [];
    }
    setIsSearching(true);
    const searchResults = searchItems(filters, 100);
    setIsSearching(false);
    return searchResults;
  }, [filters, hasSearched]);

  return {
    filters,
    results,
    isSearching,
    hasSearched,
    updateQuery,
    updateFilters,
    resetFilters,
  };
}
