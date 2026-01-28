// Rotation builder - displays and manages the action sequence
import { CraftingAction, type RotationSlot } from '../../types/crafting';
import { getActionIconUrl } from '../../utils/actionIcons';

interface RotationBuilderProps {
  rotation: RotationSlot[];
  onRemoveAction: (id: number) => void;
  onClear: () => void;
  onMoveAction?: (fromIndex: number, toIndex: number) => void;
}

// Action names in Traditional Chinese (abbreviated)
const ACTION_NAMES_SHORT: Record<CraftingAction, string> = {
  [CraftingAction.BasicSynthesis]: '製作',
  [CraftingAction.BasicTouch]: '加工',
  [CraftingAction.MastersMend]: '精修',
  [CraftingAction.HastyTouch]: '倉促',
  [CraftingAction.RapidSynthesis]: '高速',
  [CraftingAction.Observe]: '觀察',
  [CraftingAction.TricksOfTheTrade]: '秘訣',
  [CraftingAction.WasteNot]: '儉約',
  [CraftingAction.Veneration]: '崇敬',
  [CraftingAction.StandardTouch]: '中加',
  [CraftingAction.GreatStrides]: '闊步',
  [CraftingAction.Innovation]: '改革',
  [CraftingAction.FinalAppraisal]: '最終',
  [CraftingAction.WasteNotII]: '長儉',
  [CraftingAction.ByregotsBlessing]: '祝福',
  [CraftingAction.PreciseTouch]: '集加',
  [CraftingAction.MuscleMemory]: '堅信',
  [CraftingAction.CarefulSynthesis]: '謹慎',
  [CraftingAction.Manipulation]: '掌握',
  [CraftingAction.PrudentTouch]: '儉加',
  [CraftingAction.Reflect]: '閒靜',
  [CraftingAction.PreparatoryTouch]: '坯加',
  [CraftingAction.Groundwork]: '坯作',
  [CraftingAction.DelicateSynthesis]: '精密',
  [CraftingAction.IntensiveSynthesis]: '集作',
  [CraftingAction.TrainedEye]: '神速',
  [CraftingAction.AdvancedTouch]: '上加',
  [CraftingAction.PrudentSynthesis]: '儉作',
  [CraftingAction.TrainedFinesse]: '神技',
  [CraftingAction.CarefulObservation]: '審慎',
  [CraftingAction.HeartAndSoul]: '專心',
  [CraftingAction.RefinedTouch]: '精加',
  [CraftingAction.DaringTouch]: '冒進',
  [CraftingAction.ImmaculateMend]: '完精',
  [CraftingAction.QuickInnovation]: '快改',
  [CraftingAction.TrainedPerfection]: '奇技',
  [CraftingAction.RapidSynthesisFail]: '高速X',
  [CraftingAction.HastyTouchFail]: '倉促X',
  [CraftingAction.DaringTouchFail]: '冒進X',
};

// Get action color based on type
function getActionColor(action: CraftingAction): string {
  const synthActions = [
    CraftingAction.BasicSynthesis,
    CraftingAction.RapidSynthesis,
    CraftingAction.CarefulSynthesis,
    CraftingAction.Groundwork,
    CraftingAction.PrudentSynthesis,
    CraftingAction.IntensiveSynthesis,
    CraftingAction.MuscleMemory,
    CraftingAction.DelicateSynthesis,
  ];

  const touchActions = [
    CraftingAction.BasicTouch,
    CraftingAction.HastyTouch,
    CraftingAction.StandardTouch,
    CraftingAction.AdvancedTouch,
    CraftingAction.PrudentTouch,
    CraftingAction.PreparatoryTouch,
    CraftingAction.PreciseTouch,
    CraftingAction.RefinedTouch,
    CraftingAction.DaringTouch,
    CraftingAction.TrainedFinesse,
    CraftingAction.ByregotsBlessing,
    CraftingAction.Reflect,
    CraftingAction.TrainedEye,
  ];

  const buffActions = [
    CraftingAction.Veneration,
    CraftingAction.Innovation,
    CraftingAction.GreatStrides,
    CraftingAction.WasteNot,
    CraftingAction.WasteNotII,
    CraftingAction.Manipulation,
    CraftingAction.FinalAppraisal,
    CraftingAction.QuickInnovation,
    CraftingAction.TrainedPerfection,
    CraftingAction.HeartAndSoul,
  ];

  const repairActions = [
    CraftingAction.MastersMend,
    CraftingAction.ImmaculateMend,
  ];

  if (synthActions.includes(action)) return 'bg-blue-600/30 border-blue-500';
  if (touchActions.includes(action)) return 'bg-orange-600/30 border-orange-500';
  if (buffActions.includes(action)) return 'bg-green-600/30 border-green-500';
  if (repairActions.includes(action)) return 'bg-yellow-600/30 border-yellow-500';
  return 'bg-gray-600/30 border-gray-500';
}

export function RotationBuilder({
  rotation,
  onRemoveAction,
  onClear,
}: RotationBuilderProps) {
  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--ffxiv-text)]">
          動作序列 ({rotation.length} 步)
        </h3>
        {rotation.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            清除
          </button>
        )}
      </div>

      {rotation.length === 0 ? (
        <div className="text-center py-4 text-sm text-[var(--ffxiv-muted)]">
          點擊技能以添加到序列
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {rotation.map((slot, index) => (
            <div
              key={slot.id}
              className={`
                group relative w-10 h-10 rounded border transition-all cursor-pointer
                ${getActionColor(slot.action)}
              `}
              onClick={() => onRemoveAction(slot.id)}
              title={`${index + 1}. ${ACTION_NAMES_SHORT[slot.action] || slot.action} (點擊移除)`}
            >
              <img
                src={getActionIconUrl(slot.action)}
                alt={ACTION_NAMES_SHORT[slot.action] || slot.action}
                className="w-full h-full object-contain p-0.5"
              />
              <span className="absolute -top-1.5 -left-1.5 text-[9px] bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] px-1 rounded">
                {index + 1}
              </span>
              <span className="absolute -top-1 -right-1 text-[10px] bg-red-600 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                ×
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
