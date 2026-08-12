import prismaRaw from '@workspace/db';
import { tenantExtension } from '@/shared/common/extensions/tenant.extension';
import { tenantStorage } from '@/shared/common/middleware/tenant.middleware';

async function main() {
  const prisma = prismaRaw.$extends(tenantExtension);

  try {
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

    await tenantStorage.run(
      { clinicId: clinicB.id, userId: 'userB' },
      async () => {
        try {
          const result = await prisma.patient.findUnique({
            where: { id: patientA.id },
          });

          if (result) {
            console.error(
              'TENANT ISOLATION BREACH: findUnique returned patient from Clinic A under Clinic B context',
            );
            process.exitCode = 1;
          }
        } catch (_err) {
          // Expected: tenant extension should deny cross-clinic access
        }
      },
    );

    await tenantStorage.run(
      { clinicId: clinicB.id, userId: 'userB' },
      async () => {
        try {
          const result = await prisma.patient.findFirst({
            where: { id: patientA.id },
          });

          if (result) {
            console.error(
              'TENANT ISOLATION BREACH: findFirst returned patient from Clinic A under Clinic B context',
            );
            process.exitCode = 1;
          }
        } catch (_err) {
          // Expected: tenant extension should deny cross-clinic access
        }
      },
    );

    await prismaRaw.patient.delete({ where: { id: patientA.id } });
    await prismaRaw.clinic.delete({ where: { id: clinicA.id } });
    await prismaRaw.clinic.delete({ where: { id: clinicB.id } });
  } catch (_e) {
    console.error('Tenant isolation test failed:', _e);
    process.exitCode = 1;
  } finally {
    await prismaRaw.$disconnect();
  }
}

main();
