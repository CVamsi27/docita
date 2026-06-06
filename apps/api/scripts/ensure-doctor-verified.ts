import prisma, { DoctorVerificationStatus } from '@workspace/db';

function readDoctorId(): string {
  const doctorId = process.env.VERIFICATION_DOCTOR_ID?.trim();
  if (!doctorId) throw new Error('VERIFICATION_DOCTOR_ID is required');

  return doctorId;
}

/**
 * E2E helper: deterministically marks a fixture doctor as verified after the
 * registration flow. Local E2E has no external NMC provider, so prescriptions
 * otherwise remain correctly blocked behind the production verification guard.
 */
async function main() {
  const doctorId = readDoctorId();
  try {
    await prisma.user.update({
      where: { id: doctorId },
      data: {
        verificationStatus: DoctorVerificationStatus.VERIFIED,
        verificationSource: 'E2E_FIXTURE',
        verificationReason: null,
        verificationCheckedAt: new Date(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
