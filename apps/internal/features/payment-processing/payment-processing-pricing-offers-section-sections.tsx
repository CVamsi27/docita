"use client";

import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { Button, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Input, IsoDatePickerField, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components";
import type { PricingOfferRow } from "@/lib/api/api";

interface PricingOfferFormValues {
  clinicId: string;
  percentOff: string;
  title: string;
  validUntil: string;
  notes: string;
}

interface PricingOffersTableSectionProps {
  isLoading: boolean;
  offers: PricingOfferRow[];
  onRemove: (clinicId: string) => void;
  isRemoving: boolean;
}

/**
 * Phase 3 (per-feature): apps/internal Payment processing > Pricing
 * offers section. 9 literals converted to
 * useTranslations("InternalPaymentProcessing.pricingOffers").
 */
function usePricingOffersTranslations() {
  return useTranslations("InternalPaymentProcessing.pricingOffers");
}

export function PricingOffersTableSection({
  isLoading,
  offers,
  onRemove,
  isRemoving,
}: PricingOffersTableSectionProps) {
  const t = usePricingOffersTranslations();
  if (isLoading) {
    return (
      <div className="flex justify-center py-6" role="status">
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-6 w-6 text-muted-foreground"
        />
      </div>
    );
  }

  if (offers.length === 0) return (
      <p className="text-sm text-muted-foreground">
        {t("noActiveDiscounts")}
      </p>
    );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colFacility")}</TableHead>
          <TableHead>{t("colTitle")}</TableHead>
          <TableHead>{t("colPercentOff")}</TableHead>
          <TableHead>{t("colValidUntil")}</TableHead>
          <TableHead className="w-[100px]">{t("colActions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {offers.map((row: PricingOfferRow) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              {row.clinic?.name ?? row.clinicId}
            </TableCell>
            <TableCell className="text-sm">{row.title}</TableCell>
            <TableCell className="tabular-nums">
              {row.percentOff}%
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {row.validUntil ?? "—"}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRemoving}
                onClick={() => onRemove(row.clinicId)}
              >
                {t("removeButton")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface PricingOfferFormSectionProps {
  form: UseFormReturn<PricingOfferFormValues>;
  clinics: Array<{ id: string; name: string }>;
  isSaving: boolean;
}

export function PricingOfferFormSection({
  form,
  clinics,
  isSaving,
}: PricingOfferFormSectionProps) {
  const t = usePricingOffersTranslations();
  return (
    <>
      <FormField
        control={form.control}
        name="clinicId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("facilityLabel")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("facilityPlaceholder")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {clinics.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="percentOff"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("percentOffLabel")}</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={95}
                step={1}
                placeholder={t("percentOffPlaceholder")}
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t("percentOffDescription")}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("titleLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("titlePlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="validUntil"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="pricing-offer-valid-until">
              {t("validUntilLabel")}
            </FormLabel>
            <FormControl>
              <IsoDatePickerField
                id="pricing-offer-valid-until"
                label=""
                showLabel={false}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                placeholder={t("validUntilPlaceholder")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("notesLabel")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("notesPlaceholder")}
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving && (
            <DocitaLoadingIndicator
              variant="inline"
              decorative
              className="mr-2"
            />
          )}
          {isSaving ? t("savingLabel") : t("saveButton")}
        </Button>
      </div>
    </>
  );
}
