"use client";

import { Button } from "@workspace/ui/components/form/button";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Badge } from "@workspace/ui/components/indicators/badge";
// jscpd:ignore-end
import { DEFAULT_CURRENCY, formatPlanLimitCount } from "@workspace/utils";
import { getInternalTierBadgeClass } from "@/lib/tier-display";
import { CreditCard, Receipt, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentProcessingClinicsSectionProps = Pick<
  PaymentProcessingPageViewModel,
  "tierPricing" | "clinics" | "loadClinicTierInfo" | "openAdditionalChargeForClinic"
>;

/**
 * Phase 3 (per-feature): apps/internal Payment processing > Clinics
 * section. 7 literals converted to
 * useTranslations("InternalPaymentProcessing.clinicsSection").
 */
function useClinicsSectionTranslations() {
  return useTranslations("InternalPaymentProcessing.clinicsSection");
}

export function PaymentProcessingClinicsSection({
  tierPricing,
  clinics,
  loadClinicTierInfo,
  openAdditionalChargeForClinic,
}: PaymentProcessingClinicsSectionProps) {
  const t = useClinicsSectionTranslations();
  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clinics.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colFacilityName")}</TableHead>
                  <TableHead>{t("colCurrentTier")}</TableHead>
                  <TableHead>{t("colMaxDoctors")}</TableHead>
                  <TableHead>{t("colMaxPatients")}</TableHead>
                  <TableHead>{t("colEmail")}</TableHead>
                  <TableHead>{t("colCurrency")}</TableHead>
                  <TableHead>{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(clinics) &&
                  clinics.map((clinic) => (
                    <TableRow key={clinic.id}>
                      <TableCell className="font-medium">
                        {clinic.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getInternalTierBadgeClass(clinic.tier)}
                        >
                          {clinic.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatPlanLimitCount(
                          tierPricing.find((t) => t.tier === clinic.tier)
                            ?.maxDoctors,
                        )}
                      </TableCell>
                      <TableCell>
                        {formatPlanLimitCount(
                          tierPricing.find((t) => t.tier === clinic.tier)
                            ?.maxPatients,
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{clinic.email}</TableCell>
                      <TableCell className="text-sm">
                        {clinic.currency || DEFAULT_CURRENCY}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => loadClinicTierInfo(clinic)}
                            className="gap-2"
                          >
                            <TrendingUp className="h-4 w-4" />
                            {t("managePlanButton")}
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => openAdditionalChargeForClinic(clinic)}
                            className="gap-2"
                          >
                            <Receipt className="h-4 w-4" />
                            {t("addOnChargeButton")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
  );
}
