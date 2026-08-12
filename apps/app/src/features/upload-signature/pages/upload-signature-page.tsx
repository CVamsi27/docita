import UploadSignaturePageContent from "@/features/upload-signature/components/UploadSignatureTokenPageContent";
import OnboardingSlaUploadPageContent from "@/features/upload-signature/components/UploadSignatureOnboardingPageContent";

/** Token-based signature upload route reached via QR code / SMS link from the Docita app. */
export function UploadSignatureTokenPage() {
  return <UploadSignaturePageContent />;
}

/** Onboarding SLA signature upload route reached from the onboarding flow. */
export function UploadSignatureOnboardingPage() {
  return <OnboardingSlaUploadPageContent />;
}
