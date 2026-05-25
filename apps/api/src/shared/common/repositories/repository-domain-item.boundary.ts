/** check-as-cast-density: allow-file — Prisma delegate rows are erased to `unknown` before domain mapping. */
export function mapRepositoryDomainItem<T>(item: unknown): T {
  return item as T;
}
