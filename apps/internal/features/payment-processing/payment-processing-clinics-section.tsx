"use client";

import { Button } from "@workspace/ui/components/form/button";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
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
import { DEFAULT_CURRENCY, formatPlanLimitCount } from "@workspace/utils";
import { getInternalTierBadgeClass } from "@/lib/tier-display";
import { CreditCard, Receipt, TrendingUp } from "lucide-react";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentProcessingClinicsSectionProps = Pick<
  PaymentProcessingPageViewModel,
  "tierPricing" | "clinics" | "loadClinicTierInfo" | "openAdditionalChargeForClinic"
>;

export function PaymentProcessingClinicsSection({
  tierPricing,
  clinics,
  loadClinicTierInfo,
  openAdditionalChargeForClinic,
}: PaymentProcessingClinicsSectionProps) {
  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Facilities Payment Management
          </CardTitle>
          <CardDescription>
            Select a facility to change plan and record subscription payment, or
            record an add-on charge (for example guided setup)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clinics.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No facilities found"
              description="Facilities will appear here once they are provisioned for billing."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facility Name</TableHead>
                  <TableHead>Current Tier</TableHead>
                  <TableHead>Max Doctors</TableHead>
                  <TableHead>Max Patients</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Actions</TableHead>
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
                            Manage plan payment
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => openAdditionalChargeForClinic(clinic)}
                            className="gap-2"
                          >
                            <Receipt className="h-4 w-4" />
                            Add-on charge
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
