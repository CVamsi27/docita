import { PartnerShell } from "@/features/referral-partner/components/PartnerShell";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  // The login page is a full-bleed card; everything else is the shell.
  // We decide per-route via pathname on the client (PartnerShell itself
  // handles the redirect-to-login when the access token is missing).
  return <PartnerShell>{children}</PartnerShell>;
}
