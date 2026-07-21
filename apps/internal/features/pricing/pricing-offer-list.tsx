"use client";

import type { InternalPricingOfferRow } from "@workspace/data-access/internal";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState
} from "@workspace/ui/components";
import { Sparkles, Trash2 } from "lucide-react";

interface Props {
  offers: InternalPricingOfferRow[];
  savingId: string | null;
  onDelete: (clinicId: string) => void;
}

export function PricingOfferList({ offers, savingId, onDelete }: Props) {
  if (offers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active offers</CardTitle>
          <CardDescription>
            These offers are automatically applied to the next checkout preview
            for each clinic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Sparkles}
            title="No active offers"
            description="Create a facility-specific offer to apply at checkout preview."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active offers</CardTitle>
        <CardDescription>
          These offers are automatically applied to the next checkout preview
          for each clinic.
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
                  <Badge variant="outline">{offer.percentOff}% off</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{offer.title}</p>
                <p className="text-xs text-muted-foreground">
                  {offer.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {offer.durationMonths
                    ? `${offer.durationMonths} month offer`
                    : "No fixed duration"}{" "}
                  {offer.validUntil ? ` • until ${offer.validUntil}` : ""}
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
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
