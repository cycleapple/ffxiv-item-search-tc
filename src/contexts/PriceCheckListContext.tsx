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

export type ImportMode = 'replace' | 'merge' | 'add';

interface PriceCheckListContextValue {
  list: PriceCheckListItem[];
  addItem: (itemId: number) => void;
  removeItem: (itemId: number) => void;
  clearList: () => void;
  isInList: (itemId: number) => boolean;
  toggleItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  itemCount: number;
  exportList: () => void;
  importList: (data: PriceCheckListItem[], mode: ImportMode) => { added: number; updated: number; skipped: number };
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

  // Export list to JSON file
  const exportList = useCallback(() => {
    const exportData = {
      version: 1,
      exportedAt: Date.now(),
      items: list,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-check-list-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [list]);

  // Import list from JSON data
  const importList = useCallback((data: PriceCheckListItem[], mode: ImportMode): { added: number; updated: number; skipped: number } => {
    let added = 0;
    let updated = 0;
    let skipped = 0;

    if (mode === 'replace') {
      // Replace: completely replace with imported data
      added = data.length;
      setList(data.map(item => ({
        ...item,
        addedAt: item.addedAt || Date.now(),
      })));
    } else {
      setList(prev => {
        const existingMap = new Map(prev.map(item => [item.itemId, item]));
        const newList = [...prev];

        for (const importItem of data) {
          const existing = existingMap.get(importItem.itemId);
          if (existing) {
            if (mode === 'merge') {
              // Merge: add quantities together
              const idx = newList.findIndex(item => item.itemId === importItem.itemId);
              newList[idx] = {
                ...existing,
                quantity: existing.quantity + importItem.quantity,
              };
              updated++;
            } else {
              // Add: skip existing items
              skipped++;
            }
          } else {
            // New item, add it
            newList.push({
              ...importItem,
              addedAt: importItem.addedAt || Date.now(),
            });
            added++;
          }
        }

        return newList;
      });
    }

    return { added, updated, skipped };
  }, []);

  const value = useMemo(() => ({
    list,
    addItem,
    removeItem,
    clearList,
    isInList,
    toggleItem,
    updateQuantity,
    itemCount,
    exportList,
    importList,
  }), [list, addItem, removeItem, clearList, isInList, toggleItem, updateQuantity, itemCount, exportList, importList]);

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
