// Web Worker for running crafting solvers
// Based on ffxiv-best-craft SolverWorker.ts

onmessage = async (e) => {
  const { dfs_solve, nq_solve, reflect_solve, raphael_solve } =
    await import('../wasm/app_wasm');

  const { name, args: argsJson } = e.data;
  const args = JSON.parse(argsJson);

  try {
    let result;
    switch (name) {
      case 'dfs_solve':
      case 'nq_solve':
        const solve = name === 'dfs_solve' ? dfs_solve : nq_solve;
        result = solve(args.status, args.depth, args.specialist);
        break;
      case 'reflect_solve':
        result = reflect_solve(args.status, args.useObserve);
        break;
      case 'raphael_solve':
        result = raphael_solve(
          args.status,
          args.targetQuality,
          args.useManipulation,
          args.useHeartAndSoul,
          args.useQuickInnovation,
          args.useTrainedEye,
          args.backloadProgress,
          args.adversarial
        );
        break;
      default:
        throw new Error(`Unknown solver: ${name}`);
    }
    postMessage(result);
  } catch (e: unknown) {
    postMessage({ error: String(e) });
  } finally {
    close();
  }
};
