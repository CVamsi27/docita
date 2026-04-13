import { PortalLayoutShell } from "@/features/patient-portal/components/layout/portal-layout-shell";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalLayoutShell>{children}</PortalLayoutShell>;
}
