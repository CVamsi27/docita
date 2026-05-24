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
import { ClipboardList, Pill } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";

/**
 * Pharmacy — dispense queue + stock + reorder list (Reception-focused).
 *
 * Visual prototype: docita-design-system/project/ui_kits/clinic-os/PharmacyScreen.jsx
 *
 * Distinct from inventory: inventory is the catalogue, pharmacy is the
 * day-of-dispense workflow (active prescriptions waiting to be filled,
 * hand-off to patient via WhatsApp).
 *
 * Data wiring TODO:
 *   - Decide whether to extend inventory domain or carve a new pharmacy domain
 *   - Dispense queue derives from Prescription rows with status=PENDING that
 *     reference an in-house pharmacy
 *   - Stock + reorder views reuse InventoryItem rows with par-level joins
 *   - Add useDispenseQueue + useMarkDispensed + useStockBelowPar hooks
 *   - Replace EmptyState with the 3-tab UI from the prototype: Dispense /
 *     Stock (par-level highlighting) / Reorder
 */
export function PharmacyPageContent() {
  return (
    <FeatureGate feature={Feature.INVENTORY} showLockedCard>
      <AppPageScaffold
        header={
          <PageHeader
            title="Pharmacy"
            description="Dispense queue, stock visibility, and reorder list — keep the pharmacy moving."
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">Waiting to dispense</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">Awaiting backend</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">Below par</p>
            </CardHeader>
            <CardContent>
              <p className="ui-money text-[var(--fs-3xl)]">—</p>
              <p className="ui-helper-text mt-1">Awaiting backend</p>
            </CardContent>
          </Card>
          <Card className="ui-card-surface">
            <CardHeader className="pb-2">
              <p className="ui-eyebrow">Out of stock</p>
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
              <ClipboardList
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              Dispense queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Pill}
              title="Pharmacy workflow pending backend"
              description="The dispense queue derives from prescriptions awaiting in-house fulfillment. Once the pharmacy domain (or inventory extension) is wired with useDispenseQueue hooks, this view will show pending prescriptions, hand-off to WhatsApp, and stock par-level alerts."
              action={{
                label: "Open inventory",
                href: "/inventory",
              }}
            />
          </CardContent>
        </Card>
      </AppPageScaffold>
    </FeatureGate>
  );
}
