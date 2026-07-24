"use client";

import type { InternalPricingOfferRow } from "@workspace/data-access/internal";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@workspace/ui/components";
import { Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  offers: InternalPricingOfferRow[];
  savingId: string | null;
  onDelete: (clinicId: string) => void;
}

export function PricingOfferList({ offers, savingId, onDelete }: Props) {
  const t = useTranslations("InternalPricing.offerList");
  if (offers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("activeOffersTitle")}</CardTitle>
          <CardDescription>
            {t("activeOffersDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Sparkles}
            title={t("noActiveOffersTitle")}
            description={t("noActiveOffersDescription")}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("activeOffersTitle")}</CardTitle>
        <CardDescription>
          {t("activeOffersDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-[var(--radius)] border border-border/70 bg-background p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {offer.clinic?.name ?? offer.clinicId}
                  </p>
                  <Badge variant="outline">{t("percentOffBadge", { percent: offer.percentOff })}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{offer.title}</p>
                <p className="text-xs text-muted-foreground">
                  {offer.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {offer.durationMonths
                    ? t("durationMonths", { count: offer.durationMonths })
                    : t("noFixedDuration")}{" "}
                  {offer.validUntil ? t("validUntil", { date: offer.validUntil }) : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(offer.clinicId)}
                  disabled={savingId === offer.clinicId}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("removeButton")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
