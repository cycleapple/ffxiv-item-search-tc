import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ffxiv-custom-prices';

function loadCustomPrices(): Record<number, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCustomPrices(data: Record<number, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useCustomPrices() {
  const [customPrices, setCustomPrices] = useState<Record<number, number>>(loadCustomPrices);

  const setCustomPrice = useCallback((itemId: number, price: number) => {
    setCustomPrices(prev => {
      const next = { ...prev, [itemId]: price };
      saveCustomPrices(next);
      return next;
    });
  }, []);

  const clearCustomPrice = useCallback((itemId: number) => {
    setCustomPrices(prev => {
      const next = { ...prev };
      delete next[itemId];
      saveCustomPrices(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setCustomPrices({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getCustomPrice = useCallback((itemId: number): number | undefined => {
    return customPrices[itemId];
  }, [customPrices]);

  return { customPrices, setCustomPrice, clearCustomPrice, clearAll, getCustomPrice };
}
