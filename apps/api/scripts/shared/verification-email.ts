export function readVerificationEmail(): string {
  const email = process.env.VERIFICATION_EMAIL?.trim();
  if (!email) throw new Error('VERIFICATION_EMAIL is required');

  return email;
}
