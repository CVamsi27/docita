import type { Feature, Tier } from "@workspace/types";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { LockedFeatureCard } from "@/components/auth/feature-gate-sections";

type LockedFeaturePageProps = {
  title: string;
  description?: string;
} & ({ feature: Feature; tier?: never } | { tier: Tier; feature?: never });

export function LockedFeaturePage({
  feature,
  tier,
  title,
  description,
}: LockedFeaturePageProps) {
  return (
    <AppPageScaffold
      header={<PageHeader title={title} description={description} />}
    >
      <LockedFeatureCard feature={feature} tier={tier} />
    </AppPageScaffold>
  );
}
