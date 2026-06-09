import type { APIClient, PaginatedResponse } from "./types";

export function createCRUDResource<T extends { id?: string }>(
  client: APIClient,
  basePath: string,
) {
  return {
    getAll(
      params?: Record<string, string | number | boolean | undefined | null>,
    ): Promise<T[] | PaginatedResponse<T>> {
      if (!params) return client.get(basePath);

      return client.get(basePath, { params });
    },

    getOne(id: string): Promise<T> {
      return client.get(`${basePath}/${id}`);
    },

    create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
      return client.post(basePath, data);
    },

    update(
      id: string,
      data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>,
    ): Promise<T> {
      return client.patch(`${basePath}/${id}`, data);
    },

    delete(id: string): Promise<void> {
      return client.delete(`${basePath}/${id}`);
    },
  };
}
