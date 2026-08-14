import bcrypt from 'bcrypt';
import prisma from '@workspace/db';

function readPhoneNumber(): string {
  const raw = process.env.PORTAL_E2E_PHONE?.trim();
  if (!raw) throw new Error('PORTAL_E2E_PHONE is required');

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return raw.startsWith('+') ? raw : `+${digits}`;
}

async function main() {
  const phoneNumber = readPhoneNumber();
  const otp = process.env.PORTAL_E2E_OTP?.trim() || '123456';
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const now = new Date();

  await prisma.patientOtp.updateMany({
    where: {
      phoneNumber,
      usedAt: null,
    },
    data: {
      usedAt: now,
    },
  });

  await prisma.patientOtp.create({
    data: {
      phoneNumber,
      otpHash,
      expiresAt,
      attempts: 0,
    },
  });

  process.stdout.write(
    JSON.stringify({
      phoneNumber,
      expiresAt: expiresAt.toISOString(),
    }),
  );
}

async function run() {
  try {
    await main();
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
