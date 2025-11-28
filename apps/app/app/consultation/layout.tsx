import { ClinicProvider } from "@/lib/clinic-context";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ClinicProvider>{children}</ClinicProvider>
    </AuthGuard>
  );
}
