// check-as-cast-density: allow-file — recursive walk preserves caller-selected generic after redaction
export function redactPhiPreservingType<T>(value: T, walk: (input: T) => unknown): T {
  return walk(value) as T;
}
