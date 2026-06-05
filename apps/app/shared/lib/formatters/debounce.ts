export function debounce<
  T extends (
    ...args: Array<string | number | Record<string, unknown>>
  ) => void | Promise<void>,
>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
