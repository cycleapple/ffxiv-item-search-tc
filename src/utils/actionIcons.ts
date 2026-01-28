// Action icon utilities
import { CraftingAction } from '../types/crafting';

// Action icon paths from XIVAPI
const ACTION_ICON_PATHS: Record<CraftingAction, string> = {
  [CraftingAction.BasicSynthesis]: '/i/001000/001501.png',
  [CraftingAction.BasicTouch]: '/i/001000/001502.png',
  [CraftingAction.MastersMend]: '/i/001000/001952.png',
  [CraftingAction.HastyTouch]: '/i/001000/001989.png',
  [CraftingAction.RapidSynthesis]: '/i/001000/001988.png',
  [CraftingAction.Observe]: '/i/001000/001954.png',
  [CraftingAction.TricksOfTheTrade]: '/i/001000/001990.png',
  [CraftingAction.WasteNot]: '/i/001000/001992.png',
  [CraftingAction.Veneration]: '/i/001000/001995.png',
  [CraftingAction.StandardTouch]: '/i/001000/001516.png',
  [CraftingAction.GreatStrides]: '/i/001000/001955.png',
  [CraftingAction.Innovation]: '/i/001000/001987.png',
  [CraftingAction.FinalAppraisal]: '/i/001000/001983.png',
  [CraftingAction.WasteNotII]: '/i/001000/001993.png',
  [CraftingAction.ByregotsBlessing]: '/i/001000/001975.png',
  [CraftingAction.PreciseTouch]: '/i/001000/001524.png',
  [CraftingAction.MuscleMemory]: '/i/001000/001994.png',
  [CraftingAction.CarefulSynthesis]: '/i/001000/001986.png',
  [CraftingAction.Manipulation]: '/i/001000/001985.png',
  [CraftingAction.PrudentTouch]: '/i/001000/001535.png',
  [CraftingAction.Reflect]: '/i/001000/001982.png',
  [CraftingAction.PreparatoryTouch]: '/i/001000/001507.png',
  [CraftingAction.Groundwork]: '/i/001000/001518.png',
  [CraftingAction.DelicateSynthesis]: '/i/001000/001503.png',
  [CraftingAction.IntensiveSynthesis]: '/i/001000/001514.png',
  [CraftingAction.TrainedEye]: '/i/001000/001981.png',
  [CraftingAction.AdvancedTouch]: '/i/001000/001519.png',
  [CraftingAction.PrudentSynthesis]: '/i/001000/001520.png',
  [CraftingAction.TrainedFinesse]: '/i/001000/001997.png',
  [CraftingAction.CarefulObservation]: '/i/001000/001984.png',
  [CraftingAction.HeartAndSoul]: '/i/001000/001996.png',
  [CraftingAction.RefinedTouch]: '/i/001000/001522.png',
  [CraftingAction.DaringTouch]: '/i/001000/001998.png',
  [CraftingAction.ImmaculateMend]: '/i/001000/001950.png',
  [CraftingAction.QuickInnovation]: '/i/001000/001999.png',
  [CraftingAction.TrainedPerfection]: '/i/001000/001926.png',
  // Failed versions use same icon as normal
  [CraftingAction.RapidSynthesisFail]: '/i/001000/001988.png',
  [CraftingAction.HastyTouchFail]: '/i/001000/001989.png',
  [CraftingAction.DaringTouchFail]: '/i/001000/001998.png',
};

/**
 * Get the icon URL for a crafting action
 * Uses XIVAPI for action icons
 */
export function getActionIconUrl(action: CraftingAction): string {
  const path = ACTION_ICON_PATHS[action];
  if (!path) {
    return '';
  }
  return `https://xivapi.com${path}`;
}
