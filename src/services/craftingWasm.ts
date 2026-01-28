// WASM service wrapper for crafting simulation
import type {
  CrafterAttributes,
  CraftingRecipe,
  CraftingStatus,
  CraftingAction,
  SimulateResult,
  SimulateOneStepResult,
  SolverType,
  SolverOptions,
  SolverResult,
} from '../types/crafting';

// Lazy-loaded WASM module
let wasmModule: typeof import('../wasm/app_wasm') | null = null;
let wasmInitPromise: Promise<typeof import('../wasm/app_wasm')> | null = null;

/**
 * Load and initialize the WASM module
 */
export async function loadWasm(): Promise<typeof import('../wasm/app_wasm')> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  wasmInitPromise = (async () => {
    const wasm = await import('../wasm/app_wasm');
    // Bundler target auto-initializes via __wbindgen_start()
    wasmModule = wasm;
    return wasm;
  })();

  return wasmInitPromise;
}

/**
 * Create a new crafting status
 */
export async function createStatus(
  attrs: CrafterAttributes,
  recipe: CraftingRecipe
): Promise<CraftingStatus> {
  const wasm = await loadWasm();
  return wasm.new_status(attrs, recipe);
}

/**
 * Simulate a sequence of actions
 */
export async function simulate(
  status: CraftingStatus,
  actions: CraftingAction[]
): Promise<SimulateResult> {
  const wasm = await loadWasm();
  return wasm.simulate(status, actions);
}

/**
 * Simulate actions with detailed step-by-step results
 */
export async function simulateDetail(
  status: CraftingStatus,
  actions: CraftingAction[]
): Promise<CraftingStatus[]> {
  const wasm = await loadWasm();
  return wasm.simulate_detail(status, actions);
}

/**
 * Simulate a single action
 */
export async function simulateOneStep(
  status: CraftingStatus,
  action: CraftingAction,
  forceSuccess: boolean = true
): Promise<SimulateOneStepResult> {
  const wasm = await loadWasm();
  return wasm.simulate_one_step(status, action, forceSuccess);
}

/**
 * Get list of allowed actions for current status
 * Returns "ok" for allowed actions, error string otherwise
 */
export async function getAllowedActions(
  status: CraftingStatus,
  actions: CraftingAction[]
): Promise<string[]> {
  const wasm = await loadWasm();
  return wasm.allowed_list(status, actions);
}

/**
 * Get CP cost for each action at current status
 */
export async function getCraftPointsList(
  status: CraftingStatus,
  actions: CraftingAction[]
): Promise<number[]> {
  const wasm = await loadWasm();
  return wasm.craftpoints_list(status, actions);
}

/**
 * Get HQ probability for current status
 */
export async function getHQProbability(
  status: CraftingStatus
): Promise<number | null> {
  const wasm = await loadWasm();
  return wasm.high_quality_probability(status);
}

/**
 * Run DFS solver
 */
export async function solveDFS(
  status: CraftingStatus,
  depth: number,
  specialist: boolean
): Promise<CraftingAction[]> {
  const wasm = await loadWasm();
  return wasm.dfs_solve(status, depth, specialist);
}

/**
 * Run NQ solver (progress-only)
 */
export async function solveNQ(
  status: CraftingStatus,
  depth: number,
  specialist: boolean
): Promise<CraftingAction[]> {
  const wasm = await loadWasm();
  return wasm.nq_solve(status, depth, specialist);
}

/**
 * Run Reflect solver
 */
export async function solveReflect(
  status: CraftingStatus,
  useObserve: boolean
): Promise<CraftingAction[]> {
  const wasm = await loadWasm();
  return wasm.reflect_solve(status, useObserve);
}

/**
 * Run Raphael solver (best quality)
 */
export async function solveRaphael(
  status: CraftingStatus,
  targetQuality: number | null,
  useManipulation: boolean,
  useHeartAndSoul: boolean,
  useQuickInnovation: boolean,
  useTrainedEye: boolean,
  backloadProgress: boolean,
  adversarial: boolean
): Promise<CraftingAction[]> {
  const wasm = await loadWasm();
  return wasm.raphael_solve(
    status,
    targetQuality,
    useManipulation,
    useHeartAndSoul,
    useQuickInnovation,
    useTrainedEye,
    backloadProgress,
    adversarial
  );
}

/**
 * Run random simulations for statistics
 */
export async function runRandomSimulation(
  status: CraftingStatus,
  actions: CraftingAction[],
  iterations: number,
  ignoreErrors: boolean
): Promise<unknown> {
  const wasm = await loadWasm();
  return wasm.rand_simulation(status, actions, iterations, ignoreErrors);
}

/**
 * Calculate attributes scope (min required stats)
 */
export async function calcAttributesScope(
  status: CraftingStatus,
  actions: CraftingAction[]
): Promise<unknown> {
  const wasm = await loadWasm();
  return wasm.calc_attributes_scope(status, actions);
}

/**
 * Unified solver function that runs in main thread
 * For background execution, use the Web Worker
 */
export async function solve(
  status: CraftingStatus,
  solver: SolverType,
  options: SolverOptions
): Promise<SolverResult> {
  let actions: CraftingAction[];

  switch (solver) {
    case 'raphael':
      actions = await solveRaphael(
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
      actions = await solveDFS(
        status,
        options.depth ?? 6,
        options.specialist ?? false
      );
      break;

    case 'nq':
      actions = await solveNQ(
        status,
        options.depth ?? 6,
        options.specialist ?? false
      );
      break;

    case 'reflect':
      actions = await solveReflect(
        status,
        options.useObserve ?? false
      );
      break;

    default:
      throw new Error(`Unknown solver type: ${solver}`);
  }

  // Simulate to get final status
  const result = await simulate(status, actions);

  return {
    actions,
    solver,
    finalStatus: result.status,
  };
}

/**
 * Invoke WASM solver in a Web Worker
 * Following the same pattern as ffxiv-best-craft
 */
function invokeWasmSolver(name: string, args: Record<string, unknown>): Promise<CraftingAction[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./solverWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      if (e.data.error === undefined) {
        resolve(e.data);
      } else {
        reject(new Error(e.data.error));
      }
      worker.terminate();
    };

    worker.onerror = (e) => {
      reject(new Error(e.message));
      worker.terminate();
    };

    // Send solver name and JSON-stringified args (same as original)
    worker.postMessage({ name, args: JSON.stringify(args) });
  });
}

/**
 * Solve using Web Worker for non-blocking operation
 */
export async function solveInWorker(
  status: CraftingStatus,
  solver: SolverType,
  options: SolverOptions
): Promise<SolverResult> {
  let actions: CraftingAction[];

  switch (solver) {
    case 'raphael':
      actions = await invokeWasmSolver('raphael_solve', {
        status,
        targetQuality: options.targetQuality ?? null,
        useManipulation: options.useManipulation ?? true,
        useHeartAndSoul: options.useHeartAndSoul ?? false,
        useQuickInnovation: options.useQuickInnovation ?? false,
        useTrainedEye: options.useTrainedEye ?? false,
        backloadProgress: options.backloadProgress ?? false,
        adversarial: options.adversarial ?? false,
      });
      break;

    case 'dfs':
      actions = await invokeWasmSolver('dfs_solve', {
        status,
        depth: options.depth ?? 6,
        specialist: options.specialist ?? false,
      });
      break;

    case 'nq':
      actions = await invokeWasmSolver('nq_solve', {
        status,
        depth: options.depth ?? 6,
        specialist: options.specialist ?? false,
      });
      break;

    case 'reflect':
      actions = await invokeWasmSolver('reflect_solve', {
        status,
        useObserve: options.useObserve ?? false,
      });
      break;

    default:
      throw new Error(`Unknown solver type: ${solver}`);
  }

  // Simulate to get final status
  const result = await simulate(status, actions);

  return {
    actions,
    solver,
    finalStatus: result.status,
  };
}
