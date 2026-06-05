export function hasImportFrom(content, patterns) {
  return patterns.some((pattern) => pattern.test(content));
}
