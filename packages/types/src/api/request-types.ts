import type { UserRole } from "../shared/users";

export interface AuthenticatedRequest {
  user: {
    id: string;
    userId: string;
    sub: string;
    name: string;
    clinicId: string;
    role: UserRole;
    email: string;
  };
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
}

export interface OptionalAuthRequest {
  user?: {
    id: string;
    clinicId: string;
    role: UserRole;
    email: string;
  };
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
}
