import { LabPortalLayoutShell } from "@/features/lab-portal/components/layout/lab-portal-layout-shell";

export default function LabPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LabPortalLayoutShell>{children}</LabPortalLayoutShell>;
}
