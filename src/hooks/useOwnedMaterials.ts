import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ffxiv-owned-materials';

function loadOwned(): Record<number, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOwned(data: Record<number, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useOwnedMaterials() {
  const [ownedMaterials, setOwnedMaterials] = useState<Record<number, number>>(loadOwned);

  const setOwned = useCallback((itemId: number, quantity: number) => {
    setOwnedMaterials(prev => {
      const next = { ...prev, [itemId]: quantity };
      saveOwned(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setOwnedMaterials({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getOwned = useCallback((itemId: number): number => {
    return ownedMaterials[itemId] ?? 0;
  }, [ownedMaterials]);

  return { ownedMaterials, setOwned, clearAll, getOwned };
}
