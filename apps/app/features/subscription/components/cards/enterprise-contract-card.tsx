"use client";

import { useAPIQuery } from "@/lib/api-core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { formatCurrency, formatDate } from "@workspace/utils";
import {
  enterpriseContractEstimateSchema,
  enterpriseContractSchema,
  type EnterpriseContract,
  type EnterpriseContractEstimate,
} from "@workspace/types";
import { ExternalLink, Building2 } from "lucide-react";

const useEnterpriseContract = () =>
  useAPIQuery<EnterpriseContract | null>(
    ["clinic", "enterprise-contract"],
    "/subscription/enterprise-contract",
    {
      select: (data) =>
        data ? enterpriseContractSchema.parse(data) : null,
    },
  );

const useEnterpriseEstimate = (enabled: boolean) =>
  useAPIQuery<EnterpriseContractEstimate | null>(
    ["clinic", "enterprise-contract", "estimate"],
    "/subscription/enterprise-contract/estimate",
    {
      enabled,
      select: (data) =>
        data ? enterpriseContractEstimateSchema.parse(data) : null,
    },
  );

export function EnterpriseContractCard() {
  const { data: contract, isLoading } = useEnterpriseContract();
  const { data: estimate } = useEnterpriseEstimate(!!contract);

  if (isLoading) return null;
  if (!contract) return null;

  const currency = contract.currency;

  return (
    <Card className="surface-warning">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Enterprise contract
            </CardTitle>
            <CardDescription className="mt-1">
              Contract {contract.contractNumber} ·{" "}
              {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
            </CardDescription>
          </div>
          <Badge variant={contract.status === "ACTIVE" ? "default" : "secondary"}>
            {contract.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Platform fee</p>
            <p className="font-medium">
              {formatCurrency(contract.platformFeeCents / 100, { currency })}
              <span className="text-xs text-muted-foreground">
                {" "}
                / {contract.billingCycle.toLowerCase()}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Included users</p>
            <p className="font-medium">{contract.includedUsers}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Included consultations
            </p>
            <p className="font-medium">{contract.includedConsultations}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Included WhatsApp msgs
            </p>
            <p className="font-medium">{contract.includedWhatsappMessages}</p>
          </div>
        </div>

        {estimate && (
          <div className="rounded-md border bg-background/50 p-3 text-sm">
            <p className="mb-2 font-medium">
              Projected this month:{" "}
              {formatCurrency(estimate.projectedMonthTotalCents / 100, {
                currency: estimate.currency,
              })}
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Platform fee:{" "}
                {formatCurrency(estimate.platformFeeCents / 100, {
                  currency: estimate.currency,
                })}{" "}
                · Overage:{" "}
                {formatCurrency(estimate.overageTotalCents / 100, {
                  currency: estimate.currency,
                })}
              </p>
              <p>
                Users {estimate.meters.users.current}/
                {estimate.meters.users.included} · Consults{" "}
                {estimate.meters.consultations.current}/
                {estimate.meters.consultations.included} · WhatsApp{" "}
                {estimate.meters.whatsappMessages.current}/
                {estimate.meters.whatsappMessages.included}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Plan changes are managed by your account manager. To request a change,
          please contact support.
        </p>

        {contract.signedDocumentUrl && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={contract.signedDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View signed contract
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
