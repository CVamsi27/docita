import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { Request } from 'express';

interface AuthUser {
  id: string;
  clinicId: string;
}

@Injectable()
export class PatientDataAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PatientDataAuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, method, url, params, query, body, ip } = request;

    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          (async () => {
            try {
              const patientId =
                params.patientId ||
                params.id ||
                query.patientId ||
                body?.patientId;

              if (!patientId || typeof patientId !== 'string') {
                return;
              }

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
              this.logger.error('Failed to log patient audit event', error);
            }
          })();
        },
      }),
    );
  }
}
