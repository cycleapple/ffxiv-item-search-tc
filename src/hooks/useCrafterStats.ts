// Hook for managing crafter attributes - uses shared settings
import { useCallback } from 'react';
import { useSettings, DEFAULT_CRAFTER_STATS } from './useSettings';
import type { CrafterAttributes } from '../types/crafting';

export function useCrafterStats() {
  const { crafterStats, setCrafterStats } = useSettings();

  // Wrapper to update stats with validation
  const setStats = useCallback((newStats: Partial<CrafterAttributes>) => {
    const updated = { ...crafterStats, ...newStats };
    // Clamp values to reasonable ranges
    updated.level = Math.max(1, Math.min(100, updated.level));
    updated.craftsmanship = Math.max(0, Math.min(9999, updated.craftsmanship));
    updated.control = Math.max(0, Math.min(9999, updated.control));
    updated.craft_points = Math.max(0, Math.min(9999, updated.craft_points));
    setCrafterStats(updated);
  }, [crafterStats, setCrafterStats]);

  // Reset to defaults
  const resetStats = useCallback(() => {
    setCrafterStats(DEFAULT_CRAFTER_STATS);
  }, [setCrafterStats]);

  return {
    stats: crafterStats,
    setStats,
    resetStats,
    DEFAULT_STATS: DEFAULT_CRAFTER_STATS,
  };
}

export type UseCrafterStatsReturn = ReturnType<typeof useCrafterStats>;
