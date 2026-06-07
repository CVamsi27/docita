// jscpd:ignore-start
import prisma from '@workspace/db';

function readVerificationEmail(): string {
  const email = process.env.VERIFICATION_EMAIL?.trim();
  if (!email) throw new Error('VERIFICATION_EMAIL is required');

  return email;
}

async function main() {
  const email = readVerificationEmail();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        emailVerificationToken: true,
        emailVerified: true,
      },
    });

    process.stdout.write(JSON.stringify(user));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
// jscpd:ignore-end
