// Hook for market data from Universalis
import { useState, useEffect, useCallback } from 'react';
import type { MarketData } from '../types';
import { getMarketData, DATA_CENTERS } from '../services/universalisApi';

const STORAGE_KEY = 'ffxiv-selected-world';

interface UseMarketDataReturn {
  marketData: MarketData | null;
  loading: boolean;
  error: string | null;
  selectedWorld: string;
  setSelectedWorld: (world: string) => void;
  refresh: () => void;
}

/**
 * Hook to fetch and manage market data for an item
 */
export function useMarketData(itemId: number | null): UseMarketDataReturn {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorld, setSelectedWorldState] = useState<string>(() => {
    // Load from localStorage or default to DC (全伺服器)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return '陸行鳥'; // Default to all TC servers
  });

  const setSelectedWorld = useCallback((world: string) => {
    setSelectedWorldState(world);
    localStorage.setItem(STORAGE_KEY, world);
  }, []);

  const fetchMarketData = useCallback(async () => {
    if (!itemId) {
      setMarketData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getMarketData(itemId, selectedWorld);
      setMarketData(data);
      if (!data) {
        setError('此物品無法在市場交易');
      }
    } catch (err) {
      setError('無法載入市場資料');
      setMarketData(null);
    } finally {
      setLoading(false);
    }
  }, [itemId, selectedWorld]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  return {
    marketData,
    loading,
    error,
    selectedWorld,
    setSelectedWorld,
    refresh: fetchMarketData,
  };
}

/**
 * Hook to get available worlds for selection
 */
export function useWorldSelector() {
  return {
    dataCenters: DATA_CENTERS,
  };
}
