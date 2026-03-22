import { AuthProvider } from "@workspace/auth";
import { PortalOtpLoginUI } from "@/features/patient-portal/components/auth/portal-otp-login-ui";

export default function PortalLoginPage() {
  return (
    <AuthProvider>
      <PortalOtpLoginUI />
    </AuthProvider>
  );
}
