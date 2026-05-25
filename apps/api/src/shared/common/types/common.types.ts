import { Request as ExpressRequest } from 'express';
import { User } from '@workspace/db';

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
