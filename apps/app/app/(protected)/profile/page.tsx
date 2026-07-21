export const dynamic = "force-dynamic";

import {
  AppPageScaffold,
  PageHeader
} from "@workspace/ui/components";
import { ProfileAccountSettings } from "@/features/settings/components/account/ProfileAccountSettings";

/**
 * Account profile (name, email, password).
 *
 * M4 ("move profile into Settings") was intentionally NOT done: `PAGE_PROFILE`
 * is universal (DASHBOARD_ROLES incl. NURSE) while `PAGE_SETTINGS` is not
 * (SETTINGS_ROLES excludes NURSE), and `/settings/*` is gated by one prefix
 * target — so merging would either strand NURSE or over-broaden settings access
 * to admin sub-pages. Profile stays its own universally-accessible page; the
 * content is the shared `ProfileAccountSettings` panel.
 */
export default function Page() {
  return (
    <AppPageScaffold
      className="max-w-3xl"
      header={
        <PageHeader
          title="Profile"
          description="Manage your account settings and preferences."
        />
      }
    >
      <ProfileAccountSettings />
    </AppPageScaffold>
  );
}
