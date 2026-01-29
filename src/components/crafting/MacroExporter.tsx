// Macro exporter - generates game macros from action sequence
import { useState } from 'react';
import { CraftingAction, ACTION_WAIT_TIMES, type MacroExportOptions } from '../../types/crafting';
import { CopyButton } from '../CopyButton';

interface MacroExporterProps {
  actions: CraftingAction[];
}

// Action names for macro output (Traditional Chinese)
const ACTION_MACRO_NAMES: Record<CraftingAction, string> = {
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
  [CraftingAction.Innovation]: '改革',
  [CraftingAction.FinalAppraisal]: '最終確認',
  [CraftingAction.WasteNotII]: '長期儉約',
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
  [CraftingAction.DaringTouch]: '倉促', // DaringTouch maps to HastyTouch in macro
  [CraftingAction.ImmaculateMend]: '巧奪天工',
  [CraftingAction.QuickInnovation]: '快速改革',
  [CraftingAction.TrainedPerfection]: '工匠的絕技',
  [CraftingAction.RapidSynthesisFail]: '高速製作',
  [CraftingAction.HastyTouchFail]: '倉促',
  [CraftingAction.DaringTouchFail]: '倉促',
};

function generateMacros(actions: CraftingAction[], options: MacroExportOptions): string[][] {
  const maxLinesPerMacro = 15;
  let linesPerMacro = maxLinesPerMacro;

  if (options.hasLock) linesPerMacro--;
  if (options.hasNotify && options.hasNotify !== 'auto') linesPerMacro--;

  // Auto-determine notification
  let hasNotify = options.hasNotify;
  if (hasNotify === 'auto') {
    const minChunksWithNotify = Math.ceil(actions.length / (linesPerMacro - 1));
    const minChunksWithoutNotify = Math.ceil(actions.length / linesPerMacro);
    hasNotify = minChunksWithNotify === minChunksWithoutNotify;
  }

  if (hasNotify) linesPerMacro--;

  const numMacros = options.sectionMethod === 'disable'
    ? 1
    : Math.ceil(actions.length / linesPerMacro);

  const macros: string[][] = [];

  for (let i = 0; i < numMacros; i++) {
    const lines: string[] = [];

    if (options.hasLock) {
      lines.push('/mlock');
    }

    // Get actions for this chunk
    let chunkActions: CraftingAction[];
    if (options.sectionMethod === 'avg') {
      const chunkSize = Math.ceil(actions.length / numMacros);
      chunkActions = actions.slice(i * chunkSize, (i + 1) * chunkSize);
    } else if (options.sectionMethod === 'greedy') {
      chunkActions = actions.slice(i * linesPerMacro, (i + 1) * linesPerMacro);
    } else {
      chunkActions = actions;
    }

    // Generate action lines
    for (const action of chunkActions) {
      // Convert DaringTouch to HastyTouch for macro
      let macroAction = action;
      if (action === CraftingAction.DaringTouch) {
        macroAction = CraftingAction.HastyTouch;
      }

      let actionName = ACTION_MACRO_NAMES[macroAction] || macroAction;

      // Quote action names with spaces
      if (actionName.includes(' ')) {
        actionName = `"${actionName}"`;
      }

      const waitTime = (ACTION_WAIT_TIMES[macroAction] || 3) + options.waitTimeInc;
      lines.push(`/ac ${actionName} <wait.${waitTime}>`);
    }

    // Add notification line
    if (hasNotify) {
      lines.push(`/e 巨集 #${i + 1} 完成！${options.notifySound}`);
    }

    macros.push(lines);
  }

  return macros;
}

export function MacroExporter({ actions }: MacroExporterProps) {
  const [options, setOptions] = useState<MacroExportOptions>({
    hasLock: true,
    hasNotify: 'auto',
    notifySound: '<se.1>',
    waitTimeInc: 0,
    sectionMethod: 'avg',
  });

  if (actions.length === 0) {
    return (
      <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
        <h3 className="text-sm font-medium text-[var(--ffxiv-text)] mb-3">巨集匯出</h3>
        <div className="text-center py-4 text-sm text-[var(--ffxiv-muted)]">
          請先添加動作序列
        </div>
      </div>
    );
  }

  const macros = generateMacros(actions, options);

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <h3 className="text-sm font-medium text-[var(--ffxiv-text)] mb-3">巨集匯出</h3>

      {/* Options */}
      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.hasLock}
            onChange={(e) => setOptions({ ...options, hasLock: e.target.checked })}
            className="accent-[var(--ffxiv-accent)]"
          />
          <span className="text-xs text-[var(--ffxiv-text)]">鎖定巨集 (/mlock)</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--ffxiv-muted)]">完成提示:</span>
          <select
            value={String(options.hasNotify)}
            onChange={(e) => setOptions({
              ...options,
              hasNotify: e.target.value === 'auto' ? 'auto' : e.target.value === 'true'
            })}
            className="text-xs bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-[var(--ffxiv-text)]"
          >
            <option value="auto">自動</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--ffxiv-muted)]">提示音:</span>
          <select
            value={options.notifySound}
            onChange={(e) => setOptions({ ...options, notifySound: e.target.value })}
            className="text-xs bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-[var(--ffxiv-text)]"
          >
            <option value="">無</option>
            <option value="<se>">隨機</option>
            {[...Array(16)].map((_, i) => (
              <option key={i + 1} value={`<se.${i + 1}>`}>{`<se.${i + 1}>`}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--ffxiv-muted)]">等待時間+:</span>
          <input
            type="number"
            min={0}
            max={5}
            value={options.waitTimeInc}
            onChange={(e) => setOptions({ ...options, waitTimeInc: parseInt(e.target.value) || 0 })}
            className="w-12 text-xs bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-[var(--ffxiv-text)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--ffxiv-muted)]">拆分方式:</span>
          <select
            value={options.sectionMethod}
            onChange={(e) => setOptions({ ...options, sectionMethod: e.target.value as MacroExportOptions['sectionMethod'] })}
            className="text-xs bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-[var(--ffxiv-text)]"
          >
            <option value="avg">平均</option>
            <option value="greedy">貪婪</option>
            <option value="disable">不拆分</option>
          </select>
        </div>
      </div>

      {/* Macros */}
      <div className="space-y-3">
        {macros.map((macro, i) => (
          <div key={i} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--ffxiv-muted)]">巨集 #{i + 1}</span>
              <CopyButton text={macro.join('\n')} />
            </div>
            <pre className="text-xs bg-[var(--ffxiv-bg)] rounded p-2 overflow-x-auto whitespace-pre-wrap text-[var(--ffxiv-text)] border border-[var(--ffxiv-border)]">
              {macro.join('\n')}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
