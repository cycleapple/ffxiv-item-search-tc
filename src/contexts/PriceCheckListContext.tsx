// Price check list context for shared state across components
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { PriceCheckListItem } from '../types';

const STORAGE_KEY = 'ffxiv-price-check-list';

function loadList(): PriceCheckListItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load price check list:', e);
  }
  return [];
}

function saveList(list: PriceCheckListItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save price check list:', e);
  }
}

interface PriceCheckListContextValue {
  list: PriceCheckListItem[];
  addItem: (itemId: number) => void;
  removeItem: (itemId: number) => void;
  clearList: () => void;
  isInList: (itemId: number) => boolean;
  toggleItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  itemCount: number;
}

const PriceCheckListContext = createContext<PriceCheckListContextValue | null>(null);

export function PriceCheckListProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<PriceCheckListItem[]>(loadList);

  // Save to localStorage when list changes
  useEffect(() => {
    saveList(list);
  }, [list]);

  // Add item to list
  const addItem = useCallback((itemId: number) => {
    setList(prev => {
      const existing = prev.find(item => item.itemId === itemId);
      if (existing) {
        return prev; // Already in list
      }
      return [...prev, { itemId, quantity: 1, addedAt: Date.now() }];
    });
  }, []);

  // Remove item from list
  const removeItem = useCallback((itemId: number) => {
    setList(prev => prev.filter(item => item.itemId !== itemId));
  }, []);

  // Clear entire list
  const clearList = useCallback(() => {
    setList([]);
  }, []);

  // Check if item is in list
  const isInList = useCallback((itemId: number): boolean => {
    return list.some(item => item.itemId === itemId);
  }, [list]);

  // Update quantity for an item
  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    setList(prev => prev.map(item =>
      item.itemId === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
    ));
  }, []);

  // Toggle item in list
  const toggleItem = useCallback((itemId: number) => {
    setList(prev => {
      const existing = prev.find(item => item.itemId === itemId);
      if (existing) {
        return prev.filter(item => item.itemId !== itemId);
      }
      return [...prev, { itemId, quantity: 1, addedAt: Date.now() }];
    });
  }, []);

  // Item count
  const itemCount = useMemo(() => list.length, [list]);

  const value = useMemo(() => ({
    list,
    addItem,
    removeItem,
    clearList,
    isInList,
    toggleItem,
    updateQuantity,
    itemCount,
  }), [list, addItem, removeItem, clearList, isInList, toggleItem, updateQuantity, itemCount]);

  return (
    <PriceCheckListContext.Provider value={value}>
      {children}
    </PriceCheckListContext.Provider>
  );
}

export function usePriceCheckList(): PriceCheckListContextValue {
  const context = useContext(PriceCheckListContext);
  if (!context) {
    throw new Error('usePriceCheckList must be used within a PriceCheckListProvider');
  }
  return context;
}
