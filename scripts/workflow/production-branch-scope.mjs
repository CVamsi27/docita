// The explicitly authorized dashboard release targets API and internal only.
export function applyProductionBranchScope(targets, ref) {
  if (ref !== "refs/heads/fix/actual-operational-metrics") return targets;
  return {
    ...targets,
    api: true,
    internal: true,
    worker: false,
    app: false,
    landing: false,
  };
}
