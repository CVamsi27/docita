export const metadata = {
  title: "Welcome to Docita",
};

/**
 * Onboarding pages render inside PreDashboardShell, which includes the shared support
 * footer (email, phone, WhatsApp). Do not add a duplicate strip here.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
