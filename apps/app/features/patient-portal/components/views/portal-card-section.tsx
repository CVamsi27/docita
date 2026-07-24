"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, ListRowGroup } from "@workspace/ui/components";

interface PortalCardSectionProps {
  pageTitle: string;
  pageSubtitle: string;
  cardTitle: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  isEmpty: boolean;
  children: React.ReactNode;
  portalHomeHref: string;
  showHeader?: boolean;
}

export function PortalCardSection({
  pageTitle,
  pageSubtitle,
  cardTitle,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  isEmpty,
  children,
  portalHomeHref,
  showHeader = true,
}: PortalCardSectionProps) {
  const t = useTranslations("PatientPortal.common");
  return (
    <div className="space-y-4">
      {showHeader ? (
        <div>
          <h1 className="ui-page-title">{pageTitle}</h1>
          <p className="ui-page-subtitle">{pageSubtitle}</p>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
            />
          ) : (
            <div className="ui-card-surface overflow-hidden rounded-[var(--radius-md)] border border-border/70 pb-4">
              <ListRowGroup>
                {children}
              </ListRowGroup>
            </div>
          )}
          <div className="flex justify-center pb-4 pt-4">
            <Button asChild variant="outline" className="touch-manipulation">
              <Link href={portalHomeHref}>{t("backToHome")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
