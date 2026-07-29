import { PartnerShell } from "@/features/referral-partner/components/PartnerShell";

// Partner pages are client-side only (auth-dependent, localStorage session).
export const dynamic = "force-dynamic";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>;
}
