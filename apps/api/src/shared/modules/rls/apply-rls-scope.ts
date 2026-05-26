import { Prisma } from '@workspace/db';

type Tx = Prisma.TransactionClient;

/**
 * Defense in depth: even though clinicId originates from a verified JWT,
 * we never interpolate it into raw SQL. We use `set_config()` (the
 * function-call form of `SET LOCAL`) so the value rides as a bound
 * parameter and cannot break out of the string context. The regex check
 * is retained as a second wall — anything other than the known id shape
 * is a programming bug and we want to fail loudly.
 */
function assertRlsClinicId(clinicId: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(clinicId)) {
    throw new Error('Invalid clinicId for RLS scope');
  }
}

export async function applyRlsScope(tx: Tx, clinicId: string): Promise<void> {
  assertRlsClinicId(clinicId);
  // set_config(name, value, is_local) — is_local=true is the equivalent
  // of SET LOCAL: the value reverts at end of transaction.
  await tx.$executeRaw`SELECT set_config('app.rls_enabled', 'on', true)`;
  await tx.$executeRaw`SELECT set_config('app.current_clinic_id', ${clinicId}, true)`;
}
