/**
 * Resolves the next option index for the WAI-ARIA tabs keyboard pattern.
 * Returns `null` when the key is not part of the pattern, so callers can skip
 * `preventDefault` and let the browser handle the press.
 *
 * Tab strips pair this with a roving tabindex, which makes every tab except the
 * active one unreachable until a key moves focus.
 */
interface RovingTablistTargetParams {
  key: string;
  count: number;
  /** Index of the focused or selected option; -1 when it cannot be determined. */
  currentIndex: number;
  isDisabled?: (index: number) => boolean;
}

export function resolveRovingTablistTarget({
  key,
  count,
  currentIndex,
  isDisabled,
}: RovingTablistTargetParams): number | null {
  const isPrevious = key === "ArrowLeft";
  if (!isPrevious && key !== "ArrowRight" && key !== "Home" && key !== "End") {
    return null;
  }
  if (count <= 0) return null;

  const enabledIndexes: number[] = [];
  for (let index = 0; index < count; index += 1) {
    if (!isDisabled?.(index)) enabledIndexes.push(index);
  }
  if (enabledIndexes.length === 0) return null;

  const firstEnabledIndex = enabledIndexes[0] ?? null;
  const lastEnabledIndex = enabledIndexes[enabledIndexes.length - 1] ?? null;

  if (key === "Home") return firstEnabledIndex;
  if (key === "End") return lastEnabledIndex;

  const position = enabledIndexes.indexOf(currentIndex);
  if (position < 0) {
    return isPrevious ? lastEnabledIndex : firstEnabledIndex;
  }

  const offset = isPrevious ? -1 : 1;
  return (
    enabledIndexes[
      (position + offset + enabledIndexes.length) % enabledIndexes.length
    ] ?? null
  );
}
