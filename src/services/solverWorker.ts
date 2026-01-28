// Web Worker for running crafting solvers in background
import type {
  CraftingStatus,
  CraftingAction,
  SolverType,
  SolverOptions,
  SolverResult,
} from '../types/crafting';

interface WorkerMessage {
  status: CraftingStatus;
  solver: SolverType;
  options: SolverOptions;
}

// Worker message handler - dynamically load WASM on first use
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const { status, solver, options } = e.data;

    // Dynamically import and initialize WASM
    const wasm = await import('../wasm/app_wasm');
    await wasm.default();

    let actions: CraftingAction[];

    switch (solver) {
      case 'raphael':
        actions = wasm.raphael_solve(
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
        actions = wasm.dfs_solve(
          status,
          options.depth ?? 6,
          options.specialist ?? false
        );
        break;

      case 'nq':
        actions = wasm.nq_solve(
          status,
          options.depth ?? 6,
          options.specialist ?? false
        );
        break;

      case 'reflect':
        actions = wasm.reflect_solve(
          status,
          options.useObserve ?? false
        );
        break;

      default:
        throw new Error(`Unknown solver type: ${solver}`);
    }

    // Simulate to get final status
    const result = wasm.simulate(status, actions);

    const solverResult: SolverResult = {
      actions,
      solver,
      finalStatus: result.status,
    };

    self.postMessage(solverResult);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
