import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

type Tx = Prisma.TransactionClient;

/**
 * Defense-in-depth row-level-security helper.
 *
 * The accompanying migration (20260502143500_add_rls_policies) creates a
 * tenant_isolation policy on every clinicId-bearing table whose USING clause
 * is short-circuited until `app.rls_enabled` is set to `'on'` for the
 * connection. This service centralizes the GUC handshake so callers that opt
 * into RLS can do so via a single `runScopedTransaction` entry point.
 *
 * The flag defaults to OFF in every environment. See `docs/RLS_ROLLOUT.md`
 * for the staged enablement plan.
 */
@Injectable()
export class RlsService implements OnModuleInit {
  private readonly logger = new Logger(RlsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.isRlsEnabled()) {
      this.logger.log('RLS_ENABLED=true: tenant_isolation policies enforced');
    } else {
      this.logger.log(
        'RLS_ENABLED=false: tenant_isolation policies are scaffolded but not enforced',
      );
    }
  }

  isEnabled(): boolean {
    return this.config.isRlsEnabled();
  }

  /**
   * Wraps `fn` in a transaction that announces the tenant scope to Postgres
   * via SET LOCAL. When `RLS_ENABLED` is false we still run inside a
   * transaction (to preserve identical behavior in tests and pg connection
   * locality), but we skip the SET LOCAL handshake.
   */
  async runScopedTransaction<T>(
    clinicId: string,
    fn: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      if (this.isEnabled()) {
        await this.applyScope(tx, clinicId);
      }
      return fn(tx);
    });
  }

  private async applyScope(tx: Tx, clinicId: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]+$/.test(clinicId)) {
      throw new Error('Invalid clinicId for RLS scope');
    }
    await tx.$executeRawUnsafe(`SET LOCAL app.rls_enabled = 'on'`);
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_clinic_id = '${clinicId}'`,
    );
  }
}
