// Action palette - displays all available crafting actions
import { useEffect, useState } from 'react';
import { CraftingAction, ACTION_CATEGORIES, type CraftingStatus } from '../../types/crafting';
import { getAllowedActions, getCraftPointsList } from '../../services/craftingWasm';
import { getActionIconUrl } from '../../utils/actionIcons';

interface ActionPaletteProps {
  status: CraftingStatus | null;
  onActionClick: (action: CraftingAction) => void;
  disabled?: boolean;
  defaultCollapsed?: boolean;
}

// Action names in Traditional Chinese
const ACTION_NAMES_ZH: Record<CraftingAction, string> = {
  [CraftingAction.BasicSynthesis]: '製作',
  [CraftingAction.BasicTouch]: '加工',
  [CraftingAction.MastersMend]: '精修',
  [CraftingAction.HastyTouch]: '倉促',
  [CraftingAction.RapidSynthesis]: '高速製作',
  [CraftingAction.Observe]: '觀察',
  [CraftingAction.TricksOfTheTrade]: '秘訣',
  [CraftingAction.WasteNot]: '儉約',
  [CraftingAction.Veneration]: '崇敬',
  [CraftingAction.StandardTouch]: '中級加工',
  [CraftingAction.GreatStrides]: '闊步',
  [CraftingAction.Innovation]: '革新',
  [CraftingAction.FinalAppraisal]: '最終確認',
  [CraftingAction.WasteNotII]: '儉約II',
  [CraftingAction.ByregotsBlessing]: '比爾格的祝福',
  [CraftingAction.PreciseTouch]: '集中加工',
  [CraftingAction.MuscleMemory]: '堅信',
  [CraftingAction.CarefulSynthesis]: '模範製作',
  [CraftingAction.Manipulation]: '掌握',
  [CraftingAction.PrudentTouch]: '儉約加工',
  [CraftingAction.Reflect]: '閒靜',
  [CraftingAction.PreparatoryTouch]: '坯料加工',
  [CraftingAction.Groundwork]: '坯料製作',
  [CraftingAction.DelicateSynthesis]: '精密製作',
  [CraftingAction.IntensiveSynthesis]: '集中製作',
  [CraftingAction.TrainedEye]: '工匠的神速技巧',
  [CraftingAction.AdvancedTouch]: '上級加工',
  [CraftingAction.PrudentSynthesis]: '儉約製作',
  [CraftingAction.TrainedFinesse]: '工匠的神技',
  [CraftingAction.CarefulObservation]: '設計變動',
  [CraftingAction.HeartAndSoul]: '專心致志',
  [CraftingAction.RefinedTouch]: '精煉加工',
  [CraftingAction.DaringTouch]: '冒進',
  [CraftingAction.ImmaculateMend]: '工匠的苦行',
  [CraftingAction.QuickInnovation]: '快速革新',
  [CraftingAction.TrainedPerfection]: '巧奪天工',
  [CraftingAction.RapidSynthesisFail]: '高速製作(失敗)',
  [CraftingAction.HastyTouchFail]: '倉促(失敗)',
  [CraftingAction.DaringTouchFail]: '冒進(失敗)',
};

// Category names
const CATEGORY_NAMES: Record<string, string> = {
  opening: '起手',
  durability: '耐久',
  synthesis: '作業',
  touch: '加工',
  condition: '狀態',
  other: '其他',
};

// Action button component
function ActionButton({
  action,
  allowed,
  cp,
  onClick,
  disabled,
}: {
  action: CraftingAction;
  allowed: boolean;
  cp: number | undefined;
  onClick: () => void;
  disabled: boolean;
}) {
  const name = ACTION_NAMES_ZH[action] || action;
  const isDisabled = disabled || !allowed;
  const iconUrl = getActionIconUrl(action);

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={`${name}${cp ? ` (${cp} CP)` : ''}`}
      className={`
        relative flex flex-col items-center justify-center w-12 h-14 rounded border transition-all
        ${isDisabled
          ? 'bg-[var(--ffxiv-bg)] border-[var(--ffxiv-border)] opacity-40 cursor-not-allowed grayscale'
          : 'bg-[var(--ffxiv-bg)] border-[var(--ffxiv-accent)] hover:bg-[var(--ffxiv-accent)]/20 cursor-pointer'
        }
      `}
    >
      <img
        src={iconUrl}
        alt={name}
        className="w-8 h-8 object-contain"
        loading="lazy"
      />
      {cp !== undefined && cp > 0 && (
        <span className="absolute -top-1 -right-1 text-[9px] px-1 rounded bg-pink-600 text-white">
          {cp}
        </span>
      )}
    </button>
  );
}

export function ActionPalette({ status, onActionClick, disabled = false, defaultCollapsed }: ActionPaletteProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const [allowedMap, setAllowedMap] = useState<Map<CraftingAction, boolean>>(new Map());
  const [cpMap, setCpMap] = useState<Map<CraftingAction, number>>(new Map());

  // Update allowed actions and CP costs when status changes
  useEffect(() => {
    if (!status) {
      setAllowedMap(new Map());
      setCpMap(new Map());
      return;
    }

    const allActions = Object.values(CraftingAction).filter(
      (a) => !a.endsWith('_fail')
    );

    // Get allowed actions
    getAllowedActions(status, allActions).then((results) => {
      const newMap = new Map<CraftingAction, boolean>();
      allActions.forEach((action, i) => {
        newMap.set(action, results[i] === 'ok');
      });
      setAllowedMap(newMap);
    }).catch(console.error);

    // Get CP costs
    getCraftPointsList(status, allActions).then((results) => {
      const newMap = new Map<CraftingAction, number>();
      allActions.forEach((action, i) => {
        newMap.set(action, results[i]);
      });
      setCpMap(newMap);
    }).catch(console.error);
  }, [status]);

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 text-sm font-medium text-[var(--ffxiv-text)] hover:text-[var(--ffxiv-accent)] transition-colors mb-1"
      >
        <span className={`text-xs transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
        可用技能
      </button>

      {!collapsed && (
        <div className="space-y-3 mt-3">
          {Object.entries(ACTION_CATEGORIES).map(([category, actions]) => (
            <div key={category}>
              <div className="text-xs text-[var(--ffxiv-muted)] mb-1 border-b border-[var(--ffxiv-border)] pb-1">
                {CATEGORY_NAMES[category] || category}
              </div>
              <div className="flex flex-wrap gap-1">
                {actions.map((action) => (
                  <ActionButton
                    key={action}
                    action={action}
                    allowed={allowedMap.get(action) ?? false}
                    cp={cpMap.get(action)}
                    onClick={() => onActionClick(action)}
                    disabled={disabled || !status}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
