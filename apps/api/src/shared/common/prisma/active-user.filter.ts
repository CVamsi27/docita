/** Excludes soft-deleted users from auth and directory reads. */
export const activeUserWhere = { deletedAt: null } as const;
