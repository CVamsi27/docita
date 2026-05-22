import type { Prisma } from '@workspace/db';

type Tx = Prisma.TransactionClient;

function assertRlsClinicId(clinicId: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(clinicId)) {
    throw new Error('Invalid clinicId for RLS scope');
  }
}

export async function applyRlsScope(tx: Tx, clinicId: string): Promise<void> {
  assertRlsClinicId(clinicId);
  await tx.$executeRawUnsafe(`SET LOCAL app.rls_enabled = 'on'`);
  await tx.$executeRawUnsafe(`SET LOCAL app.current_clinic_id = '${clinicId}'`);
}
