// Main crafting simulator component
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Item, Recipe } from '../../types';
import type {
  CraftingStatus,
  CraftingRecipe,
  CraftingAction,
  RotationSlot,
  RecipeLevel,
} from '../../types/crafting';
import { getItemById, getRecipesForItem } from '../../services/searchService';
import { getItemIconUrl } from '../../services/xivapiService';
import { useCrafterStats } from '../../hooks/useCrafterStats';
import { useSettings } from '../../hooks/useSettings';
import { useItemData } from '../../hooks/useItemData';
import { createStatus, simulate } from '../../services/craftingWasm';

import { CrafterStatsForm } from './CrafterStatsForm';
import { ConsumableSelector, calculateEffectiveStats } from './ConsumableSelector';
import { HqMaterialSelector, calculateInitialQuality } from './HqMaterialSelector';
import { StatusDisplay } from './StatusDisplay';
import { ActionPalette } from './ActionPalette';
import { RotationBuilder } from './RotationBuilder';
import { SolverPanel } from './SolverPanel';
import { MacroExporter } from './MacroExporter';

// Cached recipe level data
let cachedRecipeLevels: Record<number, RecipeLevel> | null = null;
let recipeLevelsPromise: Promise<Record<number, RecipeLevel>> | null = null;

// Fetch recipe level data with caching
async function fetchRecipeLevels(): Promise<Record<number, RecipeLevel>> {
  if (cachedRecipeLevels) {
    return cachedRecipeLevels;
  }
  if (recipeLevelsPromise) {
    return recipeLevelsPromise;
  }
  recipeLevelsPromise = (async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}data/recipe-levels.json`);
    cachedRecipeLevels = await response.json();
    return cachedRecipeLevels!;
  })();
  return recipeLevelsPromise;
}

// Convert our Recipe type to CraftingRecipe format
function convertRecipe(recipe: Recipe, recipeLevel: RecipeLevel): CraftingRecipe {
  return {
    rlv: recipeLevel,
    job_level: recipe.classJobLevel || recipeLevel.class_job_level,
    difficulty: recipe.difficulty || recipeLevel.difficulty,
    quality: recipe.quality || recipeLevel.quality,
    durability: recipe.durability || recipeLevel.durability,
    conditions_flag: recipeLevel.conditions_flag,
  };
}

export function CraftingSimulator() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { stats, setStats, resetStats } = useCrafterStats();
  const { craftingConsumables, setCraftingConsumables } = useSettings();
  const { items, loading: itemsLoading } = useItemData();

  // Detect mobile (single-column layout)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Calculate effective stats with consumables (only if items are loaded)
  const effectiveStats = itemsLoading
    ? { craftsmanship: stats.craftsmanship, control: stats.control, craft_points: stats.craft_points }
    : calculateEffectiveStats(stats, craftingConsumables, items);

  // Data loading state
  const [item, setItem] = useState<Item | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeLevels, setRecipeLevels] = useState<Record<number, RecipeLevel>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulation state
  const [craftingStatus, setCraftingStatus] = useState<CraftingStatus | null>(null);
  const [initialStatus, setInitialStatus] = useState<CraftingStatus | null>(null);
  const [rotation, setRotation] = useState<RotationSlot[]>([]);
  const [nextSlotId, setNextSlotId] = useState(1);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // HQ materials state
  const [hqMaterials, setHqMaterials] = useState<Record<number, number>>({});

  // Load item and recipe data
  useEffect(() => {
    const loadData = async () => {
      if (!itemId) return;

      setLoading(true);
      setError(null);

      try {
        const id = parseInt(itemId);
        const itemData = getItemById(id);

        if (!itemData) {
          setError('找不到物品');
          return;
        }

        setItem(itemData);

        const recipes = getRecipesForItem(id);
        if (recipes.length === 0) {
          setError('此物品無法製作');
          return;
        }

        setRecipe(recipes[0]);

        // Load recipe levels
        const levels = await fetchRecipeLevels();
        setRecipeLevels(levels);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [itemId]);

  // Initialize crafting status when recipe or stats change
  useEffect(() => {
    const initStatus = async () => {
      if (!recipe || Object.keys(recipeLevels).length === 0) return;

      try {
        const recipeLevel = recipeLevels[recipe.recipeLevel];
        if (!recipeLevel) {
          setSimulationError(`找不到配方等級 ${recipe.recipeLevel} 的資料`);
          return;
        }

        const craftingRecipe = convertRecipe(recipe, recipeLevel);
        // Use effective stats (with consumable bonuses applied)
        // Ensure player level is at least as high as recipe requirement
        const requiredLevel = craftingRecipe.job_level || recipeLevel.class_job_level || 1;
        const crafterAttrs = {
          level: Math.max(stats.level || 100, requiredLevel),
          craftsmanship: effectiveStats.craftsmanship || 0,
          control: effectiveStats.control || 0,
          craft_points: effectiveStats.craft_points || 0,
        };
        const status = await createStatus(crafterAttrs, craftingRecipe);

        // Calculate and apply initial quality from HQ materials
        const maxQuality = craftingRecipe.quality;
        const startQuality = calculateInitialQuality(recipe, hqMaterials, maxQuality);
        const statusWithStartQuality: CraftingStatus = {
          ...status,
          quality: startQuality,
        };

        setInitialStatus(statusWithStartQuality);
        setCraftingStatus(statusWithStartQuality);
        setRotation([]);
        setNextSlotId(1);
        setSimulationError(null);
      } catch (err) {
        console.error('Crafting init error:', err);
        setSimulationError(err instanceof Error ? err.message : '初始化失敗');
      }
    };

    initStatus();
  }, [recipe, recipeLevels, stats.level, effectiveStats.craftsmanship, effectiveStats.control, effectiveStats.craft_points, itemsLoading, hqMaterials]);

  // Re-simulate when rotation changes
  useEffect(() => {
    const runSimulation = async () => {
      if (!initialStatus || rotation.length === 0) {
        if (initialStatus) {
          setCraftingStatus(initialStatus);
        }
        return;
      }

      try {
        const actions = rotation.map((slot) => slot.action);
        const result = await simulate(initialStatus, actions);

        setCraftingStatus(result.status);

        if (result.errors.length > 0) {
          setSimulationError(`步驟 ${result.errors[0].pos + 1}: ${result.errors[0].err}`);
        } else {
          setSimulationError(null);
        }
      } catch (err) {
        setSimulationError(err instanceof Error ? err.message : '模擬失敗');
      }
    };

    runSimulation();
  }, [initialStatus, rotation]);

  // Action handlers
  const handleActionClick = useCallback((action: CraftingAction) => {
    setRotation((prev) => [...prev, { id: nextSlotId, action }]);
    setNextSlotId((id) => id + 1);
  }, [nextSlotId]);

  const handleRemoveAction = useCallback((id: number) => {
    setRotation((prev) => prev.filter((slot) => slot.id !== id));
  }, []);

  const handleClearRotation = useCallback(() => {
    setRotation([]);
    setNextSlotId(1);
  }, []);

  const handleSolverResult = useCallback((actions: CraftingAction[]) => {
    const slots = actions.map((action, i) => ({
      id: nextSlotId + i,
      action,
    }));
    setRotation(slots);
    setNextSlotId(nextSlotId + actions.length);
  }, [nextSlotId]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-[var(--ffxiv-border)] border-t-[var(--ffxiv-accent)] mb-4"></div>
        <div className="text-[var(--ffxiv-muted)]">載入中...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">{error}</div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--ffxiv-accent)] hover:underline"
        >
          返回搜尋
        </button>
      </div>
    );
  }

  const rotationActions = rotation.map((slot) => slot.action);
  const isComplete = !!(craftingStatus && craftingStatus.progress >= craftingStatus.recipe.difficulty);
  const isFailed = !!(craftingStatus && craftingStatus.durability <= 0 && !isComplete);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--ffxiv-accent)] hover:underline flex items-center gap-1"
        >
          <span>←</span>
          <span>返回</span>
        </button>
        <div className="flex items-center gap-3">
          {item && (
            <>
              <img
                src={getItemIconUrl(item.icon)}
                alt={item.name}
                className="w-10 h-10 rounded"
              />
              <div>
                <h1 className="text-lg font-bold text-[var(--ffxiv-text)]">
                  製作模擬器 - {item.name}
                </h1>
                {recipe && (
                  <p className="text-xs text-[var(--ffxiv-muted)]">
                    {recipe.craftTypeName} Lv.{recipe.classJobLevel || recipe.recipeLevel}
                    {recipe.stars > 0 && <span className="ml-1 text-yellow-400">{'★'.repeat(recipe.stars)}</span>}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Completion/failure banner */}
      {isComplete && (
        <div className="bg-green-900/30 border border-green-600 rounded-lg p-3 text-center">
          <span className="text-green-400 font-medium">製作完成！</span>
          {craftingStatus.quality >= craftingStatus.recipe.quality && (
            <span className="ml-2 text-yellow-400">品質最大化！</span>
          )}
        </div>
      )}
      {isFailed && (
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 text-center">
          <span className="text-red-400 font-medium">耐久歸零，製作失敗！</span>
        </div>
      )}

      {/* Simulation error */}
      {simulationError && !isFailed && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 text-sm text-yellow-400">
          {simulationError}
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left column - Stats and Status */}
        <div className="space-y-4">
          <CrafterStatsForm
            stats={stats}
            effectiveStats={effectiveStats}
            onStatsChange={setStats}
            onReset={resetStats}
            defaultCollapsed={isMobile}
          />
          <ConsumableSelector
            consumables={craftingConsumables}
            onChange={setCraftingConsumables}
            defaultCollapsed={isMobile}
          />
          {recipe && !itemsLoading && (
            <HqMaterialSelector
              recipe={recipe}
              items={items}
              hqMaterials={hqMaterials}
              onHqMaterialsChange={setHqMaterials}
              maxQuality={recipe.quality || 0}
            />
          )}
          <StatusDisplay status={craftingStatus} defaultCollapsed={isMobile} />
        </div>

        {/* Middle column - Actions and Rotation */}
        <div className="lg:col-span-2 space-y-4">
          <RotationBuilder
            rotation={rotation}
            onRemoveAction={handleRemoveAction}
            onClear={handleClearRotation}
            defaultCollapsed={isMobile}
          />
          <ActionPalette
            status={craftingStatus}
            onActionClick={handleActionClick}
            disabled={isComplete || isFailed}
            defaultCollapsed={isMobile}
          />
        </div>

        {/* Right column - Solver and Macro */}
        <div className="space-y-4">
          <SolverPanel
            status={initialStatus}
            onSolverResult={handleSolverResult}
            disabled={!initialStatus}
          />
          <MacroExporter actions={rotationActions} />
        </div>
      </div>
    </div>
  );
}
