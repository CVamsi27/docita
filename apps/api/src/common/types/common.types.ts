import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { User, Role } from '@workspace/db';

/**
 * Extended Express Request with authenticated user and clinic context
 * Replace all: @Request() req: any with @Request() req: RequestWithUser
 */
export interface RequestWithUser extends ExpressRequest {
  user?: User & {
    requiredClinics?: string[];
    permissions?: string[];
  };
  clinic?: {
    id: string;
    name?: string;
  };
  correlationId?: string;
}

/**
 * Extended Express Response with typed send
 */
export interface ResponseWithUser extends ExpressResponse {
  // Extend if needed
}

/**
 * Standard API Response wrapper
 */
export type ApiResponse<T = unknown> = {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
  path?: string;
};

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  statusCode: number;
  message: string;
  data: T[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    count: number;
    limit: number;
  };
}

/**
 * Authentication context
 */
export interface AuthContext {
  userId: string;
  userRole: Role;
  clinicIds: string[];
  permissions: string[];
}

/**
 * Request context for logging and tracing
 */
export interface RequestContext {
  correlationId: string;
  userId?: string;
  clinicId?: string;
  method: string;
  path: string;
  timestamp: Date;
}

/**
 * Error response with RFC 7807 format
 */
export interface ErrorResponse {
  type: string; // e.g., 'VALIDATION_ERROR'
  title: string; // e.g., 'Validation Failed'
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, string[]>;
}
