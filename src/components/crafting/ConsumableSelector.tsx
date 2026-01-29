// Consumable selector for crafting simulator (food, medicine, specialist)
import { useState, useEffect, useMemo } from 'react';
import { useItemData } from '../../hooks/useItemData';
import { getItemIconUrl } from '../../services/xivapiService';
import type { Item, FoodBonus } from '../../types';
import type { CraftingConsumables } from '../../hooks/useSettings';

interface ConsumableSelectorProps {
  consumables: CraftingConsumables;
  onChange: (consumables: Partial<CraftingConsumables>) => void;
  defaultCollapsed?: boolean;
}

// Filter items that have crafting-related stats (Craftsmanship=70, Control=71, CP=11)
function isCraftingConsumable(item: Item): boolean {
  if (!item.foodEffects?.bonuses) return false;
  return item.foodEffects.bonuses.some(b =>
    b.paramId === 70 || b.paramId === 71 || b.paramId === 11
  );
}

// Calculate bonus value from food effect
function calculateBonus(bonus: FoodBonus, baseValue: number, isHq: boolean): number {
  const percent = isHq ? bonus.valueHq : bonus.value;
  const max = isHq ? bonus.maxHq : bonus.max;

  if (bonus.isRelative) {
    // Percentage bonus, capped at max
    return Math.min(Math.floor(baseValue * percent / 100), max);
  } else {
    // Flat bonus
    return percent;
  }
}

export function ConsumableSelector({ consumables, onChange, defaultCollapsed }: ConsumableSelectorProps) {
  const { items, loading } = useItemData();
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const [foodSearch, setFoodSearch] = useState('');
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);

  // Get crafting food items (category 46)
  const craftingFoods = useMemo(() => {
    if (loading || !items) return [];
    return Object.values(items)
      .filter(item => item.categoryId === 46 && isCraftingConsumable(item))
      .sort((a, b) => b.itemLevel - a.itemLevel);
  }, [items, loading]);

  // Get crafting medicine items (category 44)
  const craftingMedicines = useMemo(() => {
    if (loading || !items) return [];
    return Object.values(items)
      .filter(item => item.categoryId === 44 && isCraftingConsumable(item))
      .sort((a, b) => b.itemLevel - a.itemLevel);
  }, [items, loading]);

  // Filter foods by search
  const filteredFoods = useMemo(() => {
    if (!foodSearch) return craftingFoods.slice(0, 20);
    const search = foodSearch.toLowerCase();
    return craftingFoods.filter(f => f.name.toLowerCase().includes(search)).slice(0, 20);
  }, [craftingFoods, foodSearch]);

  // Filter medicines by search
  const filteredMedicines = useMemo(() => {
    if (!medicineSearch) return craftingMedicines.slice(0, 20);
    const search = medicineSearch.toLowerCase();
    return craftingMedicines.filter(m => m.name.toLowerCase().includes(search)).slice(0, 20);
  }, [craftingMedicines, medicineSearch]);

  // Get selected items
  const selectedFood = consumables.foodId ? items[consumables.foodId] : null;
  const selectedMedicine = consumables.medicineId ? items[consumables.medicineId] : null;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setShowFoodDropdown(false);
      setShowMedicineDropdown(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const renderBonuses = (item: Item | null, isHq: boolean) => {
    if (!item?.foodEffects?.bonuses) return null;

    const craftingBonuses = item.foodEffects.bonuses.filter(b =>
      b.paramId === 70 || b.paramId === 71 || b.paramId === 11
    );

    if (craftingBonuses.length === 0) return null;

    return (
      <div className="text-xs text-[var(--ffxiv-muted)] mt-1">
        {craftingBonuses.map((b, i) => {
          const percent = isHq ? b.valueHq : b.value;
          const max = isHq ? b.maxHq : b.max;
          return (
            <span key={i} className="mr-2">
              {b.paramName}: {percent}%({max})
            </span>
          );
        })}
      </div>
    );
  };

  const summaryParts: string[] = [];
  if (selectedFood) summaryParts.push(selectedFood.name);
  if (selectedMedicine) summaryParts.push(selectedMedicine.name);
  if (consumables.specialist) summaryParts.push('專家');

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 text-sm font-medium text-[var(--ffxiv-text)] hover:text-[var(--ffxiv-accent)] transition-colors mb-1"
      >
        <span className={`text-xs transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
        消耗品與專家
        {collapsed && summaryParts.length > 0 && (
          <span className="text-xs text-[var(--ffxiv-muted)] ml-1">{summaryParts.join(' / ')}</span>
        )}
        {collapsed && summaryParts.length === 0 && (
          <span className="text-xs text-[var(--ffxiv-muted)] ml-1">未設定</span>
        )}
      </button>

      {!collapsed && <div className="space-y-3 mt-3">
        {/* Food Selector */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs text-[var(--ffxiv-muted)] w-10">食物:</label>
            <div className="flex-1 relative" onClick={e => e.stopPropagation()}>
              <div
                className="flex items-center gap-2 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 cursor-pointer hover:border-[var(--ffxiv-accent)]"
                onClick={() => setShowFoodDropdown(!showFoodDropdown)}
              >
                {selectedFood ? (
                  <>
                    <img src={getItemIconUrl(selectedFood.icon)} alt="" className="w-5 h-5" />
                    <span className="text-sm text-[var(--ffxiv-text)] truncate flex-1">{selectedFood.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-[var(--ffxiv-muted)]">選擇食物...</span>
                )}
                {selectedFood && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ foodId: null });
                    }}
                    className="text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-error)]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {showFoodDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[var(--ffxiv-bg-secondary)] border border-[var(--ffxiv-border)] rounded shadow-lg max-h-60 overflow-auto">
                  <input
                    type="text"
                    value={foodSearch}
                    onChange={e => setFoodSearch(e.target.value)}
                    placeholder="搜尋食物..."
                    className="w-full px-2 py-1 text-sm bg-[var(--ffxiv-bg)] border-b border-[var(--ffxiv-border)] text-[var(--ffxiv-text)] focus:outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                  {filteredFoods.map(food => (
                    <div
                      key={food.id}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--ffxiv-accent)]/20 cursor-pointer"
                      onClick={() => {
                        onChange({ foodId: food.id });
                        setShowFoodDropdown(false);
                        setFoodSearch('');
                      }}
                    >
                      <img src={getItemIconUrl(food.icon)} alt="" className="w-5 h-5" />
                      <span className="text-sm text-[var(--ffxiv-text)]">{food.name}</span>
                      <span className="text-xs text-[var(--ffxiv-muted)] ml-auto">Lv.{food.itemLevel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={consumables.foodHq}
                onChange={e => onChange({ foodHq: e.target.checked })}
                className="rounded border-[var(--ffxiv-border)]"
              />
              <span className="text-[var(--ffxiv-highlight)]">HQ</span>
            </label>
          </div>
          {renderBonuses(selectedFood, consumables.foodHq)}
        </div>

        {/* Medicine Selector */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs text-[var(--ffxiv-muted)] w-10">藥水:</label>
            <div className="flex-1 relative" onClick={e => e.stopPropagation()}>
              <div
                className="flex items-center gap-2 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 cursor-pointer hover:border-[var(--ffxiv-accent)]"
                onClick={() => setShowMedicineDropdown(!showMedicineDropdown)}
              >
                {selectedMedicine ? (
                  <>
                    <img src={getItemIconUrl(selectedMedicine.icon)} alt="" className="w-5 h-5" />
                    <span className="text-sm text-[var(--ffxiv-text)] truncate flex-1">{selectedMedicine.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-[var(--ffxiv-muted)]">選擇藥水...</span>
                )}
                {selectedMedicine && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ medicineId: null });
                    }}
                    className="text-[var(--ffxiv-muted)] hover:text-[var(--ffxiv-error)]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {showMedicineDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[var(--ffxiv-bg-secondary)] border border-[var(--ffxiv-border)] rounded shadow-lg max-h-60 overflow-auto">
                  <input
                    type="text"
                    value={medicineSearch}
                    onChange={e => setMedicineSearch(e.target.value)}
                    placeholder="搜尋藥水..."
                    className="w-full px-2 py-1 text-sm bg-[var(--ffxiv-bg)] border-b border-[var(--ffxiv-border)] text-[var(--ffxiv-text)] focus:outline-none"
                    onClick={e => e.stopPropagation()}
                  />
                  {filteredMedicines.map(med => (
                    <div
                      key={med.id}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--ffxiv-accent)]/20 cursor-pointer"
                      onClick={() => {
                        onChange({ medicineId: med.id });
                        setShowMedicineDropdown(false);
                        setMedicineSearch('');
                      }}
                    >
                      <img src={getItemIconUrl(med.icon)} alt="" className="w-5 h-5" />
                      <span className="text-sm text-[var(--ffxiv-text)]">{med.name}</span>
                      <span className="text-xs text-[var(--ffxiv-muted)] ml-auto">Lv.{med.itemLevel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={consumables.medicineHq}
                onChange={e => onChange({ medicineHq: e.target.checked })}
                className="rounded border-[var(--ffxiv-border)]"
              />
              <span className="text-[var(--ffxiv-highlight)]">HQ</span>
            </label>
          </div>
          {renderBonuses(selectedMedicine, consumables.medicineHq)}
        </div>

        {/* Specialist Toggle */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--ffxiv-border)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consumables.specialist}
              onChange={e => onChange({ specialist: e.target.checked })}
              className="rounded border-[var(--ffxiv-border)]"
            />
            <span className="text-sm text-[var(--ffxiv-text)]">專家之證</span>
          </label>
          <span className="text-xs text-[var(--ffxiv-muted)]">(作業 +20, 加工 +20)</span>
        </div>
      </div>}
    </div>
  );
}

// Export utility function to calculate effective stats with consumables
export function calculateEffectiveStats(
  baseStats: { craftsmanship: number; control: number; craft_points: number },
  consumables: CraftingConsumables,
  items: Record<number, Item>
): { craftsmanship: number; control: number; craft_points: number } {
  let craftsmanship = baseStats.craftsmanship;
  let control = baseStats.control;
  let craft_points = baseStats.craft_points;

  // Apply specialist bonus
  if (consumables.specialist) {
    craftsmanship += 20;
    control += 20;
  }

  // Apply food bonuses
  if (consumables.foodId && items[consumables.foodId]?.foodEffects?.bonuses) {
    const bonuses = items[consumables.foodId].foodEffects!.bonuses;
    bonuses.forEach(bonus => {
      const value = calculateBonus(bonus,
        bonus.paramId === 70 ? craftsmanship :
        bonus.paramId === 71 ? control :
        craft_points,
        consumables.foodHq
      );

      if (bonus.paramId === 70) craftsmanship += value;
      else if (bonus.paramId === 71) control += value;
      else if (bonus.paramId === 11) craft_points += value;
    });
  }

  // Apply medicine bonuses
  if (consumables.medicineId && items[consumables.medicineId]?.foodEffects?.bonuses) {
    const bonuses = items[consumables.medicineId].foodEffects!.bonuses;
    bonuses.forEach(bonus => {
      const value = calculateBonus(bonus,
        bonus.paramId === 70 ? craftsmanship :
        bonus.paramId === 71 ? control :
        craft_points,
        consumables.medicineHq
      );

      if (bonus.paramId === 70) craftsmanship += value;
      else if (bonus.paramId === 71) control += value;
      else if (bonus.paramId === 11) craft_points += value;
    });
  }

  return { craftsmanship, control, craft_points };
}
