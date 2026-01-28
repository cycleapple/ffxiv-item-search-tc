// Web Worker for running crafting solvers in background
import type {
  CraftingStatus,
  CraftingAction,
  SolverType,
  SolverOptions,
  SolverResult,
} from '../types/crafting';

// Import WASM module (bundler target auto-initializes on import)
import {
  raphael_solve,
  dfs_solve,
  nq_solve,
  reflect_solve,
  simulate,
} from '../wasm/app_wasm';

interface WorkerMessage {
  status: CraftingStatus;
  solver: SolverType;
  options: SolverOptions;
}

function solve(
  status: CraftingStatus,
  solver: SolverType,
  options: SolverOptions
): SolverResult {
  let actions: CraftingAction[];

  switch (solver) {
    case 'raphael':
      actions = raphael_solve(
        status,
        options.targetQuality ?? null,
        options.useManipulation ?? true,
        options.useHeartAndSoul ?? false,
        options.useQuickInnovation ?? false,
        options.useTrainedEye ?? false,
        options.backloadProgress ?? false,
        options.adversarial ?? false
      );
      break;

    case 'dfs':
      actions = dfs_solve(
        status,
        options.depth ?? 6,
        options.specialist ?? false
      );
      break;

    case 'nq':
      actions = nq_solve(
        status,
        options.depth ?? 6,
        options.specialist ?? false
      );
      break;

    case 'reflect':
      actions = reflect_solve(
        status,
        options.useObserve ?? false
      );
      break;

    default:
      throw new Error(`Unknown solver type: ${solver}`);
  }

  // Simulate to get final status
  const result = simulate(status, actions);

  return {
    actions,
    solver,
    finalStatus: result.status,
  };
}

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const { status, solver, options } = e.data;
    const result = solve(status, solver, options);
    self.postMessage(result);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
