// Settings hook with localStorage persistence
import { useState, useEffect, useCallback } from 'react';
import type { CrafterAttributes } from '../types/crafting';

// Tab types for ItemDetail page
export type TabType = 'obtain' | 'recipe' | 'gathering' | 'market' | 'craftcost' | 'usedfor';

// Tab configuration
export interface TabConfig {
  id: TabType;
  name: string;
  enabled: boolean;
}

// All available tabs with default order
export const DEFAULT_TAB_ORDER: TabConfig[] = [
  { id: 'obtain', name: '取得方式', enabled: true },
  { id: 'recipe', name: '製作配方', enabled: true },
  { id: 'gathering', name: '採集地點', enabled: true },
  { id: 'market', name: '市場價格', enabled: true },
  { id: 'craftcost', name: '製作成本', enabled: true },
  { id: 'usedfor', name: '用途', enabled: true },
];

// Default crafter stats
export const DEFAULT_CRAFTER_STATS: CrafterAttributes = {
  level: 100,
  craftsmanship: 4000,
  control: 4000,
  craft_points: 700,
};

// Settings interface
export interface Settings {
  crafterStats: CrafterAttributes;
  tabOrder: TabConfig[];
}

const SETTINGS_KEY = 'ffxiv-item-search-settings';

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new fields
      return {
        crafterStats: { ...DEFAULT_CRAFTER_STATS, ...parsed.crafterStats },
        tabOrder: parsed.tabOrder || DEFAULT_TAB_ORDER,
      };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {
    crafterStats: DEFAULT_CRAFTER_STATS,
    tabOrder: DEFAULT_TAB_ORDER,
  };
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  // Save to localStorage when settings change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Update crafter stats
  const setCrafterStats = useCallback((stats: CrafterAttributes) => {
    setSettings(prev => ({ ...prev, crafterStats: stats }));
  }, []);

  // Update tab order
  const setTabOrder = useCallback((tabOrder: TabConfig[]) => {
    setSettings(prev => ({ ...prev, tabOrder }));
  }, []);

  // Move tab up in order
  const moveTabUp = useCallback((index: number) => {
    if (index <= 0) return;
    setSettings(prev => {
      const newOrder = [...prev.tabOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return { ...prev, tabOrder: newOrder };
    });
  }, []);

  // Move tab down in order
  const moveTabDown = useCallback((index: number) => {
    setSettings(prev => {
      if (index >= prev.tabOrder.length - 1) return prev;
      const newOrder = [...prev.tabOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return { ...prev, tabOrder: newOrder };
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings({
      crafterStats: DEFAULT_CRAFTER_STATS,
      tabOrder: DEFAULT_TAB_ORDER,
    });
  }, []);

  // Get the first enabled tab
  const getDefaultTab = useCallback((): TabType => {
    const firstEnabled = settings.tabOrder.find(t => t.enabled);
    return firstEnabled?.id || 'obtain';
  }, [settings.tabOrder]);

  return {
    settings,
    crafterStats: settings.crafterStats,
    tabOrder: settings.tabOrder,
    setCrafterStats,
    setTabOrder,
    moveTabUp,
    moveTabDown,
    resetSettings,
    getDefaultTab,
  };
}
