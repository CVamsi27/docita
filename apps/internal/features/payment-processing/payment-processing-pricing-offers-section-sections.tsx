"use client";

// jscpd:ignore-start
import type { UseFormReturn } from "react-hook-form";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import {
  Select,
// jscpd:ignore-end
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
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

export function PricingOffersTableSection({
  isLoading,
  offers,
  onRemove,
  isRemoving,
}: PricingOffersTableSectionProps) {
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
        No active checkout discounts.
      </p>
    );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Facility</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Percent off</TableHead>
          <TableHead>Valid until</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
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
                Remove
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
  return (
    <>
      <FormField
        control={form.control}
        name="clinicId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Facility</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select facility" />
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
            <FormLabel>Percent off checkout</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={95}
                step={1}
                placeholder="Enter percent"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Applied to list price at subscription checkout (max 95).
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
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="Commercial discount" {...field} />
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
              Valid until (optional)
            </FormLabel>
            <FormControl>
              <IsoDatePickerField
                id="pricing-offer-valid-until"
                label=""
                showLabel={false}
                value={typeof field.value === "string" ? field.value : ""}
                onChange={field.onChange}
                placeholder="Select date"
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
            <FormLabel>Internal notes (optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Reason for discount, approval ref, etc."
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
          {isSaving ? "Saving…" : "Save discount"}
        </Button>
      </div>
    </>
  );
}
