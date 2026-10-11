import type { Feature } from "@workspace/types";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { LockedFeatureCard } from "@/components/auth/feature-gate-sections";

interface LockedFeaturePageProps {
  feature: Feature;
  title: string;
  description?: string;
}

export function LockedFeaturePage({
  feature,
  title,
  description,
}: LockedFeaturePageProps) {
  return (
    <AppPageScaffold
      header={<PageHeader title={title} description={description} />}
    >
      <LockedFeatureCard feature={feature} />
    </AppPageScaffold>
  );
}
