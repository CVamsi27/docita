import prismaRaw from '../packages/db/src/index';
import { tenantExtension } from '../apps/api/src/common/extensions/tenant.extension';
import { tenantStorage } from '../apps/api/src/common/middleware/tenant.middleware';

// We need to mock the tenantStorage behavior since we can't easily import the actual middleware instance
// due to module boundaries/compilation in this script context if we run it with ts-node directly on this file.
// However, the extension imports 'getCurrentTenant' from middleware.
// So we rely on the implementation in the extension using the singleton from middleware.

async function main() {
  const prisma = prismaRaw.$extends(tenantExtension);

  try {
    // 1. Setup: Create 2 clinics
    const clinicA = await prismaRaw.clinic.create({
      data: {
        name: 'Clinic A',
        address: 'Addr A',
        phone: '111',
        email: 'a@test.com',
      },
    });
    const clinicB = await prismaRaw.clinic.create({
      data: {
        name: 'Clinic B',
        address: 'Addr B',
        phone: '222',
        email: 'b@test.com',
      },
    });

    console.log(`Created Clinic A: ${clinicA.id}`);
    console.log(`Created Clinic B: ${clinicB.id}`);

    // 2. Create Patient in Clinic A
    const patientA = await prismaRaw.patient.create({
      data: {
        firstName: 'Patient',
        lastName: 'A',
        phoneNumber: '1234567890',
        dateOfBirth: new Date(),
        gender: 'MALE',
        clinicId: clinicA.id,
      },
    });

    console.log(`Created Patient A: ${patientA.id} in Clinic A`);

    // 3. Try to find Patient A acting as Clinic B using findUnique
    console.log('--- Attempting cross-tenant access with findUnique ---');

    await tenantStorage.run(
      { clinicId: clinicB.id, userId: 'userB' },
      async () => {
        try {
          // @ts-expect-error - Testing tenant isolation enforcement
          const result = await prisma.patient.findUnique({
            where: { id: patientA.id },
          });

          if (result) {
            console.error(
              '❌ SECURITY FAILURE: Access allowed across tenants!',
            );
            console.log('Result:', result);
          } else {
            console.log(
              '✅ SECURITY SUCCESS: Patient not found (filtered out or error swallowed).',
            );
          }
        } catch (err: Error | { message: string }) {
          console.log(
            '✅ SECURITY SUCCESS: Error thrown during access (expected if findUnique fails on extra fields).',
          );
          console.log('Error:', (err as { message: string }).message);
        }
      },
    );

    // 4. Try to find Patient A acting as Clinic B using findFirst
    console.log('--- Attempting cross-tenant access with findFirst ---');
    await tenantStorage.run(
      { clinicId: clinicB.id, userId: 'userB' },
      async () => {
        try {
          // @ts-expect-error - Testing tenant isolation enforcement
          const result = await prisma.patient.findFirst({
            where: { id: patientA.id }, // The extension should inject clinicId: clinicB.id
          });

          if (result) {
            console.error(
              '❌ SECURITY FAILURE: Access allowed across tenants with findFirst!',
            );
          } else {
            console.log(
              '✅ SECURITY SUCCESS: Patient not found with findFirst.',
            );
          }
        } catch (err: any) {
          console.log('Error:', err.message);
        }
      },
    );

    // Cleanup
    await prismaRaw.patient.delete({ where: { id: patientA.id } });
    await prismaRaw.clinic.delete({ where: { id: clinicA.id } });
    await prismaRaw.clinic.delete({ where: { id: clinicB.id } });
  } catch (e) {
    console.error(e);
  } finally {
    await prismaRaw.$disconnect();
  }
}

main();
