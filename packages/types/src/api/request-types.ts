import type { UserRole } from './users';

/**
 * Authenticated Express Request
 * Used in NestJS controllers with @Request() decorator
 */
export interface AuthenticatedRequest {
  user: {
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

/**
 * Request with optional user (for public endpoints)
 */
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
