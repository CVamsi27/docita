import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { User, Role } from '@workspace/db';

export interface RequestWithUser extends ExpressRequest {
  user?: User & {
    requiredClinics?: string[];
    permissions?: string[];
    patientId?: string;
  };
  clinic?: {
    id: string;
    name?: string;
  };
  correlationId?: string;
}

export type ResponseWithUser = ExpressResponse;

export type ApiResponse<T = unknown> = {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
  path?: string;
};

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

export interface AuthContext {
  userId: string;
  userRole: Role;
  clinicIds: string[];
  permissions: string[];
}

export interface RequestContext {
  correlationId: string;
  userId?: string;
  clinicId?: string;
  method: string;
  path: string;
  timestamp: Date;
}

export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, string[]>;
}
