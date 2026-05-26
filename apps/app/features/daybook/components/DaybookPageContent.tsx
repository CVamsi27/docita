"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Feature } from "@workspace/types";
import { Banknote, BookOpen, CalendarCheck } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";

/**
 * Daybook — end-of-day cash reconciliation surface (Reception-focused).
 *
 * Visual prototype: docita-design-system/project/ui_kits/clinic-os/DaybookScreen.jsx
 *
 * Data wiring TODO:
 *   - Aggregate Invoice + Payment rows for the selected day in
 *     apps/api/src/domains/billing/application/services/daybook-query.service.ts
 *   - Expose via DaybookController, paginated by day
 *   - Add useDaybook(date) hook in packages/data-access/src/hooks/use-billing.ts
 *   - Replace the EmptyState below with the ledger + method-breakdown +
 *     cash-reconciliation panels from the prototype
 */
export function DaybookPageContent() {
  return (
    <FeatureGate feature={Feature.INVOICING} showLockedCard>
      <AppPageScaffold
        header={
          <PageHeader
            title="Daybook"
            description="End-of-day cash reconciliation — close the day with one button."
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">Collected today</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">Awaiting backend</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">Pending</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">Awaiting backend</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">Cash on hand</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">Awaiting backend</p>
            </CardContent>
          </Card>
        </div>

        <Card className="ui-card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground" aria-hidden />
              Ledger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Banknote}
              title="Daybook backend pending"
              description="The Daybook screen surfaces an end-of-day ledger, payment-method breakdown, and cash reconciliation. The Invoice and Payment models already exist; this view will light up once a daybook-query.service.ts is added to the billing domain and a useDaybook(date) hook is exposed from data-access."
              action={{
                label: "View today's invoices",
                href: "/invoices",
              }}
            />
          </CardContent>
        </Card>

        <Card className="ui-card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-muted-foreground" aria-hidden />
              Close the day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="ui-helper-text">
              Reconciliation actions appear here once the daybook query is wired
              in. The prototype shows a single primary CTA — Close day — which
              locks the day&apos;s collections and writes a settled-ledger row.
            </p>
          </CardContent>
        </Card>
      </AppPageScaffold>
    </FeatureGate>
  );
}
