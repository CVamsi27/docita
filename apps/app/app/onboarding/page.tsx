import { ClinicOnboardingWizard } from "@/features/onboarding/components";

export const metadata = {
  title: "Clinic Onboarding | Docita",
  description:
    "Set up your clinic in minutes with our simple onboarding process",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen">
      <ClinicOnboardingWizard />
    </main>
  );
}
