// check-as-cast-density: allow-file — Object.keys on string enum label maps
export function labelMapKeys<T extends string>(
  labels: Record<T, string>,
): readonly T[] {
  return Object.keys(labels) as T[];
}
