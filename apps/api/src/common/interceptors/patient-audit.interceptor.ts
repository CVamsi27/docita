import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { Request } from 'express';

interface AuthUser {
  id: string;
  clinicId: string;
}

@Injectable()
export class PatientDataAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PatientDataAuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, method, url, params, query, body, ip } = request;

    // Only proceed if authenticated user
    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // Fire and forget audit logging
          // We wrap in IIFE or just call async function without returning it to satisfy lint
          (async () => {
            try {
              // Identify if this is a patient-related operation
              // We look for patientId in params, query, or body
              const patientId =
                params.patientId ||
                params.id || // Common for /patients/:id
                query.patientId ||
                body?.patientId;

              // If no patient context found, skip detailed audit
              // (RequestLoggingInterceptor handles general logging)
              if (!patientId || typeof patientId !== 'string') {
                return;
              }

              // Check if the URL actually relates to patient data
              if (
                url.includes('/patients') ||
                url.includes('/appointments') ||
                url.includes('/prescriptions') ||
                url.includes('/invoices') ||
                url.includes('/documents') ||
                url.includes('/records')
              ) {
                const userId = (user as AuthUser).id;
                const clinicId = (user as AuthUser).clinicId;

                // Determine action type based on method
                let actionType = 'VIEW_RECORD';
                if (method === 'POST') actionType = 'CREATE_RECORD';
                if (method === 'PUT' || method === 'PATCH')
                  actionType = 'UPDATE_RECORD';
                if (method === 'DELETE') actionType = 'DELETE_RECORD';

                await this.auditService.logAction({
                  userId,
                  clinicId,
                  actionType,
                  resourceType: 'PATIENT_DATA',
                  resourceId: patientId,
                  ipAddress: ip || request.connection.remoteAddress,
                  metadata: {
                    method,
                    endpoint: url,
                    params,
                  },
                });
              }
            } catch (error) {
              // Don't fail the request if logging fails, but log the error
              this.logger.error('Failed to log patient audit event', error);
            }
          })();
        },
      }),
    );
  }
}
