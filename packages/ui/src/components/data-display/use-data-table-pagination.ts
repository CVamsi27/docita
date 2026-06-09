import { useMemo, useState } from "react";

export function useDataTablePagination<T>(sorted: T[], pageSize?: number) {
  const [page, setPage] = useState(0);

  const paginated = useMemo(() => {
    if (!pageSize) return sorted;
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = pageSize
    ? Math.max(1, Math.ceil(sorted.length / pageSize))
    : 1;

  return { page, setPage, paginated, totalPages };
}
