"use client";

import { usePricingPage } from "./use-pricing-page";
import { PricingTierTable } from "./pricing-tier-table";
import { PricingOfferBuilder } from "./pricing-offer-builder";
import { PricingOfferList } from "./pricing-offer-list";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";

export default function PricingPage() {
  const {
    tiers,
    savingId,
    saveError,
    offerForm,
    offers,
    clinicOptions,
    isLoadingClinics,
    pageStatus,
    loadError,
    setOfferForm,
    handleTierFieldChange,
    saveTier,
    saveOffer,
    deleteOffer,
    applyTemplate,
    refetchAll,
  } = usePricingPage();

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Pricing Management"
          description="Manage tier pricing centrally and create facility-specific offers for requested hospitals."
        />
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage="Loading pricing…"
        errorMessage={loadError}
        onRetry={refetchAll}
      >
        {saveError && (
          <div className="surface-danger rounded-md px-4 py-2 text-sm">
            {saveError}
          </div>
        )}

        <Tabs defaultValue="tiers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tiers">Tier pricing</TabsTrigger>
            <TabsTrigger value="offers">Facility offers</TabsTrigger>
          </TabsList>

          <TabsContent value="tiers">
            <Card>
              <CardHeader>
                <CardTitle>Tier pricing</CardTitle>
                <CardDescription>
                  All prices are stored in cents/paise. The public pricing API
                  converts them for display.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PricingTierTable
                  tiers={tiers}
                  savingId={savingId}
                  onFieldChange={handleTierFieldChange}
                  onSave={saveTier}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            <PricingOfferBuilder
              offerForm={offerForm}
              clinicOptions={clinicOptions}
              isLoadingClinics={isLoadingClinics}
              savingId={savingId}
              onFormChange={setOfferForm}
              onSave={saveOffer}
              onReset={() => setOfferForm({
                clinicId: "",
                title: "",
                description: "",
                percentOff: 100,
                durationMonths: 3,
                validUntil: "",
                notes: "",
              })}
              onApplyTemplate={applyTemplate}
            />

            <PricingOfferList
              offers={offers}
              savingId={savingId}
              onDelete={deleteOffer}
            />
          </TabsContent>
        </Tabs>
      </DataState>
    </AppPageScaffold>
  );
}
