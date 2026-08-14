/**
 * Runs async work over `items` with at most `concurrency` tasks in flight.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        break;
      }
      const item = items[index];
      if (item === undefined) {
        break;
      }
      results[index] = await mapper(item, index);
    }
  });

  await Promise.all(workers);
  return results;
}
