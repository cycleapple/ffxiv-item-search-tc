// Crafting simulator types based on ffxiv-best-craft

// Crafter attributes
export interface CrafterAttributes {
  level: number;
  craftsmanship: number;
  control: number;
  craft_points: number;
}

// Recipe level data (from game data)
export interface RecipeLevel {
  id: number;
  class_job_level: number;
  stars: number;
  suggested_craftsmanship: number;
  suggested_control: number | null;
  difficulty: number;
  quality: number;
  progress_divider: number;
  quality_divider: number;
  progress_modifier: number;
  quality_modifier: number;
  durability: number;
  conditions_flag: number;
}

// Recipe for simulation (converted format)
export interface CraftingRecipe {
  rlv: RecipeLevel;
  job_level: number;
  difficulty: number;
  quality: number;
  durability: number;
  conditions_flag: number;
}

// Limited action state (for Heart and Soul, Trained Perfection)
export enum LimitedActionState {
  Unused = 'Unused',
  Active = 'Active',
  Used = 'Used',
}

// Buff state
export interface CraftingBuffs {
  muscle_memory: number;
  great_strides: number;
  veneration: number;
  innovation: number;
  inner_quiet: number;
  final_appraisal: number;
  manipulation: number;
  wast_not: number;  // Note: typo preserved from original
  heart_and_soul: LimitedActionState;
  trained_perfection: LimitedActionState;
  careful_observation_used: number;
  quick_innovation_used: number;
  touch_combo_stage: number;
  observed: number;
  expedience: number;
}

// Crafting condition (球色)
export enum CraftingCondition {
  Normal = 'Normal',       // 白：通常
  Good = 'Good',           // 紅：高品質
  Excellent = 'Excellent', // 彩：最高品質
  Poor = 'Poor',           // 黑：低品質
  Centered = 'Centered',   // 黃：成功率+25%
  Sturdy = 'Sturdy',       // 藍：耐久消耗-50%
  Pliant = 'Pliant',       // 綠：CP消耗-50%
  Malleable = 'Malleable', // 深藍：作業效率1.5倍
  Primed = 'Primed',       // 紫：技能持續+2回合
  GoodOmen = 'GoodOmen',   // 粉：下回合必為紅球
}

// Crafting status (current simulation state)
export interface CraftingStatus {
  buffs: CraftingBuffs;
  attributes: CrafterAttributes;
  recipe: CraftingRecipe;
  catches: unknown;
  durability: number;
  craft_points: number;
  progress: number;
  quality: number;
  step: number;
  condition: CraftingCondition;
}

// Crafting actions (技能)
export enum CraftingAction {
  // Basic actions
  BasicSynthesis = 'basic_synthesis',
  BasicTouch = 'basic_touch',
  MastersMend = 'masters_mend',

  // Touch actions
  HastyTouch = 'hasty_touch',
  StandardTouch = 'standard_touch',
  AdvancedTouch = 'advanced_touch',
  PrudentTouch = 'prudent_touch',
  PreparatoryTouch = 'preparatory_touch',
  PreciseTouch = 'precise_touch',
  TrainedFinesse = 'trained_finesse',
  RefinedTouch = 'refined_touch',
  DaringTouch = 'daring_touch',

  // Synthesis actions
  RapidSynthesis = 'rapid_synthesis',
  CarefulSynthesis = 'careful_synthesis',
  Groundwork = 'groundwork',
  PrudentSynthesis = 'prudent_synthesis',
  IntensiveSynthesis = 'intensive_synthesis',
  DelicateSynthesis = 'delicate_synthesis',

  // Buff actions
  Observe = 'observe',
  TricksOfTheTrade = 'tricks_of_the_trade',
  WasteNot = 'waste_not',
  WasteNotII = 'waste_not_ii',
  Veneration = 'veneration',
  GreatStrides = 'great_strides',
  Innovation = 'innovation',
  FinalAppraisal = 'final_appraisal',
  Manipulation = 'manipulation',

  // Opening actions
  MuscleMemory = 'muscle_memory',
  Reflect = 'reflect',
  TrainedEye = 'trained_eye',

  // Special actions
  ByregotsBlessing = 'byregot_s_blessing',
  CarefulObservation = 'careful_observation',
  HeartAndSoul = 'heart_and_soul',

  // 7.0 actions
  ImmaculateMend = 'immaculate_mend',
  QuickInnovation = 'quick_innovation',
  TrainedPerfection = 'trained_perfection',

  // Fail variants (for simulation display)
  RapidSynthesisFail = 'rapid_synthesis_fail',
  HastyTouchFail = 'hasty_touch_fail',
  DaringTouchFail = 'daring_touch_fail',
}

// Action categories for display
export const ACTION_CATEGORIES = {
  opening: [
    CraftingAction.Reflect,
    CraftingAction.MuscleMemory,
    CraftingAction.TrainedEye,
  ],
  durability: [
    CraftingAction.TrainedPerfection,
    CraftingAction.Manipulation,
    CraftingAction.WasteNot,
    CraftingAction.WasteNotII,
    CraftingAction.ImmaculateMend,
    CraftingAction.MastersMend,
  ],
  synthesis: [
    CraftingAction.FinalAppraisal,
    CraftingAction.Veneration,
    CraftingAction.PrudentSynthesis,
    CraftingAction.Groundwork,
    CraftingAction.BasicSynthesis,
    CraftingAction.CarefulSynthesis,
  ],
  touch: [
    CraftingAction.Innovation,
    CraftingAction.PreparatoryTouch,
    CraftingAction.PrudentTouch,
    CraftingAction.BasicTouch,
    CraftingAction.StandardTouch,
    CraftingAction.AdvancedTouch,
    CraftingAction.RefinedTouch,
    CraftingAction.TrainedFinesse,
    CraftingAction.GreatStrides,
    CraftingAction.QuickInnovation,
    CraftingAction.ByregotsBlessing,
  ],
  condition: [
    CraftingAction.HeartAndSoul,
    CraftingAction.TricksOfTheTrade,
    CraftingAction.IntensiveSynthesis,
    CraftingAction.PreciseTouch,
  ],
  other: [
    CraftingAction.DelicateSynthesis,
    CraftingAction.Observe,
    CraftingAction.RapidSynthesis,
    CraftingAction.HastyTouch,
  ],
} as const;

// Action wait times for macro generation
export const ACTION_WAIT_TIMES: Record<CraftingAction, number> = {
  [CraftingAction.BasicSynthesis]: 3,
  [CraftingAction.BasicTouch]: 3,
  [CraftingAction.MastersMend]: 3,
  [CraftingAction.HastyTouch]: 3,
  [CraftingAction.RapidSynthesis]: 3,
  [CraftingAction.Observe]: 3,
  [CraftingAction.TricksOfTheTrade]: 3,
  [CraftingAction.WasteNot]: 2,
  [CraftingAction.Veneration]: 2,
  [CraftingAction.StandardTouch]: 3,
  [CraftingAction.GreatStrides]: 2,
  [CraftingAction.Innovation]: 2,
  [CraftingAction.FinalAppraisal]: 2,
  [CraftingAction.WasteNotII]: 2,
  [CraftingAction.ByregotsBlessing]: 3,
  [CraftingAction.PreciseTouch]: 3,
  [CraftingAction.MuscleMemory]: 3,
  [CraftingAction.CarefulSynthesis]: 3,
  [CraftingAction.Manipulation]: 2,
  [CraftingAction.PrudentTouch]: 3,
  [CraftingAction.Reflect]: 3,
  [CraftingAction.PreparatoryTouch]: 3,
  [CraftingAction.Groundwork]: 3,
  [CraftingAction.DelicateSynthesis]: 3,
  [CraftingAction.IntensiveSynthesis]: 3,
  [CraftingAction.TrainedEye]: 3,
  [CraftingAction.AdvancedTouch]: 3,
  [CraftingAction.PrudentSynthesis]: 3,
  [CraftingAction.TrainedFinesse]: 3,
  [CraftingAction.CarefulObservation]: 3,
  [CraftingAction.HeartAndSoul]: 3,
  [CraftingAction.RefinedTouch]: 3,
  [CraftingAction.DaringTouch]: 3,
  [CraftingAction.ImmaculateMend]: 3,
  [CraftingAction.QuickInnovation]: 3,
  [CraftingAction.TrainedPerfection]: 3,
  [CraftingAction.RapidSynthesisFail]: 3,
  [CraftingAction.HastyTouchFail]: 3,
  [CraftingAction.DaringTouchFail]: 3,
};

// Simulation result
export interface SimulateResult {
  status: CraftingStatus;
  errors: {
    pos: number;
    err: string;
  }[];
}

// Simulate one step result
export interface SimulateOneStepResult {
  status: CraftingStatus;
  is_success: boolean;
}

// Solver types
export type SolverType = 'raphael' | 'dfs' | 'nq' | 'reflect';

export interface SolverOptions {
  // Raphael solver options
  targetQuality?: number;
  useManipulation?: boolean;
  useHeartAndSoul?: boolean;
  useQuickInnovation?: boolean;
  useTrainedEye?: boolean;
  backloadProgress?: boolean;
  adversarial?: boolean;

  // DFS/NQ solver options
  depth?: number;
  specialist?: boolean;

  // Reflect solver options
  useObserve?: boolean;
}

export interface SolverResult {
  actions: CraftingAction[];
  solver: SolverType;
  finalStatus?: CraftingStatus;
}

// Macro export options
export interface MacroExportOptions {
  hasLock: boolean;
  hasNotify: boolean | 'auto';
  notifySound: string;
  waitTimeInc: number;
  sectionMethod: 'avg' | 'greedy' | 'disable';
}

// Rotation slot (for rotation builder)
export interface RotationSlot {
  id: number;
  action: CraftingAction;
}

// Jobs
export enum CraftingJob {
  Carpenter = 'carpenter',
  Blacksmith = 'blacksmith',
  Armorer = 'armorer',
  Goldsmith = 'goldsmith',
  Leatherworker = 'leatherworker',
  Weaver = 'weaver',
  Alchemist = 'alchemist',
  Culinarian = 'culinarian',
}

// Job ID to Job mapping
export const CRAFT_TYPE_TO_JOB: Record<number, CraftingJob> = {
  0: CraftingJob.Carpenter,
  1: CraftingJob.Blacksmith,
  2: CraftingJob.Armorer,
  3: CraftingJob.Goldsmith,
  4: CraftingJob.Leatherworker,
  5: CraftingJob.Weaver,
  6: CraftingJob.Alchemist,
  7: CraftingJob.Culinarian,
};
