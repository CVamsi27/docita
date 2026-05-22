export interface JoinRequest {
  id: string;
  status: string;
  requestedRole: string;
  message?: string;
  requestedAt: string;
  expiresAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
  };
}

// check-as-cast-density: allow-file — typed API client returns Zod-inferred list; panel expects JoinRequest[]
export function fetchPendingJoinRequests(
  listPending: () => Promise<unknown>,
): Promise<JoinRequest[]> {
  return listPending() as Promise<JoinRequest[]>;
}
