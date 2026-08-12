import { useEffect } from "react";
import { useNavigate } from "react-router";
import { PageMeta } from "@/components/layout/page-meta";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
import { PartnerAuthScreen } from "@/features/referral-partner/components/PartnerAuthScreen";
import { PartnerShell } from "@/features/referral-partner/components/PartnerShell";
import { PartnerDashboard } from "@/features/referral-partner/components/PartnerDashboard";
import { PartnerBankingForm } from "@/features/referral-partner/components/PartnerBankingForm";
import { PartnerPayoutsView } from "@/features/referral-partner/components/PartnerPayoutsView";
import { PartnerReferralsView } from "@/features/referral-partner/components/PartnerReferralsView";
import { PartnerShareCard } from "@/features/referral-partner/components/PartnerShareCard";
import { partnerSession } from "@/features/referral-partner/lib/partner-session";

/** Partner portal index — bounces to the dashboard when signed in, else to login. */
export function PartnerHomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(
      partnerSession.getAccessToken() ? "/partner/dashboard" : "/partner/login",
      { replace: true },
    );
  }, [navigate]);
  return null;
}

/** Partner login — bounces to the dashboard once the OTP flow signs in. */
export function PartnerLoginPage() {
  const navigate = useNavigate();
  const auth = usePartnerAuth();
  useEffect(() => {
    if (auth.signedIn) {
      navigate("/partner/dashboard", { replace: true });
    }
  }, [auth.signedIn, navigate]);
  return (
    <>
      <PageMeta title="Partner Login" noSuffix />
      <PartnerAuthScreen auth={auth} />
    </>
  );
}

export function PartnerDashboardPage() {
  return (
    <>
      <PageMeta title="Partner Dashboard" noSuffix />
      <PartnerShell>
        <PartnerDashboard />
      </PartnerShell>
    </>
  );
}

export function PartnerBankingPage() {
  return (
    <>
      <PageMeta title="Partner Banking" noSuffix />
      <PartnerShell>
        <PartnerBankingForm />
      </PartnerShell>
    </>
  );
}

export function PartnerPayoutsPage() {
  return (
    <>
      <PageMeta title="Partner Payouts" noSuffix />
      <PartnerShell>
        <PartnerPayoutsView />
      </PartnerShell>
    </>
  );
}

export function PartnerReferralsPage() {
  return (
    <>
      <PageMeta title="Partner Referrals" noSuffix />
      <PartnerShell>
        <PartnerReferralsView />
      </PartnerShell>
    </>
  );
}

export function PartnerSharePage() {
  return (
    <>
      <PageMeta title="Partner Share Kit" noSuffix />
      <PartnerShell>
        <PartnerShareCard />
      </PartnerShell>
    </>
  );
}
