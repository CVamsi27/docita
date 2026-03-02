import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  clinicId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  constructor(
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  getClinicId(): string | null | undefined {
    return this.request.user?.clinicId;
  }

  getClinicIdOrFail(): string {
    const clinicId = this.getClinicId();
    if (!clinicId) {
      throw new Error('No tenant context available');
    }
    return clinicId;
  }

  getUserId(): string | undefined {
    return this.request.user?.id;
  }

  getUserRole(): string | undefined {
    return this.request.user?.role;
  }

  getUser(): AuthUser | undefined {
    return this.request.user;
  }
}
