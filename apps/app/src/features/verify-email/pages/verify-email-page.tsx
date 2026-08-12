import { PageMeta } from "@/components/layout/page-meta";
import VerifyEmailPageContent from "../components/VerifyEmailPageContent";
import VerifyEmailSentPageContent from "../components/VerifyEmailSentPageContent";
import { VerifyEmailVerifiedClient } from "../components/VerifyEmailVerifiedClient";

export function VerifyEmailPage() {
  return (
    <>
      <PageMeta title="Verify Email" noSuffix />
      <VerifyEmailPageContent />
    </>
  );
}

export function VerifyEmailSentPage() {
  return (
    <>
      <PageMeta title="Email Sent" noSuffix />
      <VerifyEmailSentPageContent />
    </>
  );
}

export function VerifiedPage() {
  return (
    <>
      <PageMeta title="Email Verified" noSuffix />
      <VerifyEmailVerifiedClient />
    </>
  );
}
