// jscpd:ignore-start
import prisma from '@workspace/db';

function readVerificationEmail(): string {
  const email = process.env.VERIFICATION_EMAIL?.trim();
  if (!email) throw new Error('VERIFICATION_EMAIL is required');

  return email;
}

/**
 * E2E helper: deterministically marks a test account's email as verified.
 * The token round-trip in `verifyEmailIfNeeded` can race with registration
 * under load, leaving the onboarding admin unverified — which the protected
 * layout then bounces to the email-verification journey. This guarantees the
 * verified state the workspace test depends on.
 */
// jscpd:ignore-end
// jscpd:ignore-start
async function main() {
  const email = readVerificationEmail();
  try {
    await prisma.user.update({
      where: { email },
      data: { emailVerified: true, emailVerificationToken: null },
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
// jscpd:ignore-end
