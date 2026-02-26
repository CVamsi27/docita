import dynamic from "next/dynamic";

const ClinicOnboardingWizard = dynamic(
  () =>
    import("@/features/onboarding/components").then((mod) => ({
      default: mod.ClinicOnboardingWizard,
    })),
  { ssr: true },
);

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
