// Hook for search functionality
import { useState, useCallback, useMemo } from 'react';
import type { SearchFilters, SearchResult } from '../types';
import { searchItems } from '../services/searchService';

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  categoryId: null,
  minLevel: 1,
  maxLevel: 999,
  classJobId: null,
  craftableOnly: false,
  gatherableOnly: false,
};

interface UseSearchReturn {
  filters: SearchFilters;
  results: SearchResult[];
  isSearching: boolean;
  updateQuery: (query: string) => void;
  updateFilters: (updates: Partial<SearchFilters>) => void;
  resetFilters: () => void;
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

  // Memoized search results
  const results = useMemo(() => {
    setIsSearching(true);
    const searchResults = searchItems(filters, 100);
    setIsSearching(false);
    return searchResults;
  }, [filters]);

  return {
    filters,
    results,
    isSearching,
    updateQuery,
    updateFilters,
    resetFilters,
  };
}
