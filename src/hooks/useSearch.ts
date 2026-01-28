// Hook for search functionality
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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

// Parse URL params to filters
function parseUrlParams(searchParams: URLSearchParams): Partial<SearchFilters> {
  const filters: Partial<SearchFilters> = {};

  const q = searchParams.get('q');
  if (q) filters.query = q;

  const cat = searchParams.get('cat');
  if (cat) filters.categoryId = parseInt(cat, 10);

  const minLv = searchParams.get('minLv');
  if (minLv) filters.minLevel = parseInt(minLv, 10);

  const maxLv = searchParams.get('maxLv');
  if (maxLv) filters.maxLevel = parseInt(maxLv, 10);

  const minEq = searchParams.get('minEq');
  if (minEq) filters.minEquipLevel = parseInt(minEq, 10);

  const maxEq = searchParams.get('maxEq');
  if (maxEq) filters.maxEquipLevel = parseInt(maxEq, 10);

  const jobs = searchParams.get('jobs');
  if (jobs) filters.selectedJobs = jobs.split(',');

  if (searchParams.get('craft') === '1') filters.craftableOnly = true;
  if (searchParams.get('gather') === '1') filters.gatherableOnly = true;

  const hq = searchParams.get('hq');
  if (hq === '1') filters.canBeHq = true;
  else if (hq === '0') filters.canBeHq = false;

  const trade = searchParams.get('trade');
  if (trade === '1') filters.tradeable = true;
  else if (trade === '0') filters.tradeable = false;

  const rarity = searchParams.get('rarity');
  if (rarity) filters.rarity = parseInt(rarity, 10);

  const patch = searchParams.get('patch');
  if (patch) filters.patch = patch;

  return filters;
}

// Convert filters to URL params
function filtersToUrlParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set('q', filters.query);
  if (filters.categoryId !== null) params.set('cat', String(filters.categoryId));
  if (filters.minLevel !== 1) params.set('minLv', String(filters.minLevel));
  if (filters.maxLevel !== 999) params.set('maxLv', String(filters.maxLevel));
  if (filters.minEquipLevel !== 1) params.set('minEq', String(filters.minEquipLevel));
  if (filters.maxEquipLevel !== 100) params.set('maxEq', String(filters.maxEquipLevel));
  if (filters.selectedJobs.length > 0) params.set('jobs', filters.selectedJobs.join(','));
  if (filters.craftableOnly) params.set('craft', '1');
  if (filters.gatherableOnly) params.set('gather', '1');
  if (filters.canBeHq === true) params.set('hq', '1');
  else if (filters.canBeHq === false) params.set('hq', '0');
  if (filters.tradeable === true) params.set('trade', '1');
  else if (filters.tradeable === false) params.set('trade', '0');
  if (filters.rarity !== null) params.set('rarity', String(filters.rarity));
  if (filters.patch !== null) params.set('patch', filters.patch);

  return params;
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSearching, setIsSearching] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const isInitialized = useRef(false);

  // Initialize filters from URL params on first render
  const filters = useMemo<SearchFilters>(() => {
    const urlFilters = parseUrlParams(searchParams);
    return { ...DEFAULT_FILTERS, ...urlFilters };
  }, [searchParams]);

  const updateQuery = useCallback((query: string) => {
    const newFilters = { ...filters, query };
    setSearchParams(filtersToUrlParams(newFilters), { replace: true });
  }, [filters, setSearchParams]);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    const newFilters = { ...filters, ...updates };
    setSearchParams(filtersToUrlParams(newFilters), { replace: true });
  }, [filters, setSearchParams]);

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Reset display limit when filters change
  useEffect(() => {
    if (isInitialized.current) {
      setDisplayLimit(PAGE_SIZE);
    }
    isInitialized.current = true;
  }, [searchParams]);

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
