// Solver panel - UI for running crafting solvers
import { useState } from 'react';
import type { CraftingStatus, SolverType, SolverOptions, CraftingAction } from '../../types/crafting';

interface SolverPanelProps {
  status: CraftingStatus | null;
  onSolverResult: (actions: CraftingAction[]) => void;
  disabled?: boolean;
}

export function SolverPanel({ status, onSolverResult, disabled = false }: SolverPanelProps) {
  const [solverType, setSolverType] = useState<SolverType>('raphael');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solver options
  const [depth, setDepth] = useState(6);
  const [useManipulation, setUseManipulation] = useState(true);
  const [useHeartAndSoul, setUseHeartAndSoul] = useState(false);
  const [useQuickInnovation, setUseQuickInnovation] = useState(false);
  const [useTrainedEye, setUseTrainedEye] = useState(false);
  const [backloadProgress, setBackloadProgress] = useState(false);

  const handleSolve = async () => {
    if (!status || isRunning || disabled) return;

    setIsRunning(true);
    setError(null);

    try {
      // Import solver dynamically to avoid loading WASM until needed
      const { solveInWorker } = await import('../../services/craftingWasm');

      const options: SolverOptions = {
        depth,
        useManipulation,
        useHeartAndSoul,
        useQuickInnovation,
        useTrainedEye,
        backloadProgress,
        adversarial: false,
        specialist: false,
      };

      const result = await solveInWorker(status, solverType, options);
      onSolverResult(result.actions);
    } catch (err) {
      setError(err instanceof Error ? err.message : '求解失敗');
      console.error('Solver error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-[var(--ffxiv-card)] rounded-lg p-4 border border-[var(--ffxiv-border)]">
      <h3 className="text-sm font-medium text-[var(--ffxiv-text)] mb-3">自動求解</h3>

      {/* Solver type selection */}
      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="solver"
            value="raphael"
            checked={solverType === 'raphael'}
            onChange={() => setSolverType('raphael')}
            className="accent-[var(--ffxiv-accent)]"
          />
          <span className="text-sm text-[var(--ffxiv-text)]">Raphael (推薦)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="solver"
            value="dfs"
            checked={solverType === 'dfs'}
            onChange={() => setSolverType('dfs')}
            className="accent-[var(--ffxiv-accent)]"
          />
          <span className="text-sm text-[var(--ffxiv-text)]">DFS</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="solver"
            value="nq"
            checked={solverType === 'nq'}
            onChange={() => setSolverType('nq')}
            className="accent-[var(--ffxiv-accent)]"
          />
          <span className="text-sm text-[var(--ffxiv-text)]">NQ (只求進展)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="solver"
            value="reflect"
            checked={solverType === 'reflect'}
            onChange={() => setSolverType('reflect')}
            className="accent-[var(--ffxiv-accent)]"
          />
          <span className="text-sm text-[var(--ffxiv-text)]">閒靜起手</span>
        </label>
      </div>

      {/* Options based on solver type */}
      {(solverType === 'dfs' || solverType === 'nq') && (
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <span className="text-xs text-[var(--ffxiv-muted)]">搜尋深度:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value) || 6)}
              className="w-16 bg-[var(--ffxiv-bg)] border border-[var(--ffxiv-border)] rounded px-2 py-1 text-sm text-[var(--ffxiv-text)]"
            />
          </label>
        </div>
      )}

      {solverType === 'raphael' && (
        <div className="mb-4 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useManipulation}
              onChange={(e) => setUseManipulation(e.target.checked)}
              className="accent-[var(--ffxiv-accent)]"
            />
            <span className="text-xs text-[var(--ffxiv-text)]">使用掌握</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useHeartAndSoul}
              onChange={(e) => setUseHeartAndSoul(e.target.checked)}
              className="accent-[var(--ffxiv-accent)]"
            />
            <span className="text-xs text-[var(--ffxiv-text)]">使用專心致志</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useQuickInnovation}
              onChange={(e) => setUseQuickInnovation(e.target.checked)}
              className="accent-[var(--ffxiv-accent)]"
            />
            <span className="text-xs text-[var(--ffxiv-text)]">使用快速革新</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useTrainedEye}
              onChange={(e) => setUseTrainedEye(e.target.checked)}
              className="accent-[var(--ffxiv-accent)]"
            />
            <span className="text-xs text-[var(--ffxiv-text)]">允許工匠的神速技巧</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={backloadProgress}
              onChange={(e) => setBackloadProgress(e.target.checked)}
              className="accent-[var(--ffxiv-accent)]"
            />
            <span className="text-xs text-[var(--ffxiv-text)]">後置進展</span>
          </label>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-600 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Solve button */}
      <button
        onClick={handleSolve}
        disabled={!status || isRunning || disabled}
        className={`
          w-full py-2 rounded font-medium transition-colors
          ${!status || isRunning || disabled
            ? 'bg-[var(--ffxiv-border)] text-[var(--ffxiv-muted)] cursor-not-allowed'
            : 'bg-[var(--ffxiv-accent)] text-white hover:bg-[var(--ffxiv-accent)]/80'
          }
        `}
      >
        {isRunning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
            求解中...
          </span>
        ) : (
          '開始求解'
        )}
      </button>

      {!status && (
        <p className="mt-2 text-xs text-[var(--ffxiv-muted)] text-center">
          請先選擇配方
        </p>
      )}
    </div>
  );
}
