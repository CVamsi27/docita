/** Shared by the capture producer and baseline converter. */
export function captureTimingIssues(target) {
  if (!target || typeof target !== "object") return ["missing capture timing"];
  const issues = [];
  if (
    !Number.isFinite(target.durationMs) ||
    target.durationMs <= 0 ||
    !Number.isFinite(target.elapsedMs) ||
    target.elapsedMs < target.durationMs
  ) {
    issues.push(
      "actual elapsed time does not cover the requested observation window",
    );
  }
  if (
    !Number.isFinite(Date.parse(target.startedAt)) ||
    !Number.isFinite(Date.parse(target.finishedAt)) ||
    Date.parse(target.finishedAt) < Date.parse(target.startedAt)
  ) {
    issues.push("missing or invalid capture start/end timestamps");
  } else if (
    Math.abs(
      Date.parse(target.finishedAt) -
        Date.parse(target.startedAt) -
        target.elapsedMs,
    ) > 1_000
  ) {
    issues.push("capture timestamps disagree with actual elapsed time");
  }
  if (
    !Number.isInteger(target.plannedRequests) ||
    target.plannedRequests <= 0 ||
    target.completedRequests !== target.plannedRequests
  ) {
    issues.push("not every planned request completed within the capture");
  }
  return issues;
}
