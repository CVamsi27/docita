"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Form,
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
import { Percent } from "lucide-react";
import { type PricingOfferRow } from "@/lib/api/api";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentProcessingPricingOffersSectionProps = Pick<
  PaymentProcessingPageViewModel,
  | "clinics"
  | "pricingOffersQuery"
  | "deletePricingOfferMutation"
  | "pricingOfferForm"
  | "onSavePricingOffer"
  | "savePricingOfferMutation"
>;

export function PaymentProcessingPricingOffersSection({
  clinics,
  pricingOffersQuery,
  deletePricingOfferMutation,
  pricingOfferForm,
  onSavePricingOffer,
  savePricingOfferMutation,
}: PaymentProcessingPricingOffersSectionProps) {
  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" aria-hidden />
            Checkout discounts (subscription)
          </CardTitle>
          <CardDescription>
            Apply a percent-off offer to the facility&apos;s next subscription
            checkout (Razorpay). Separate from add-on charges. Remove the offer
            when it should no longer apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pricingOffersQuery.isLoading ? (
            <div className="flex justify-center py-6" role="status">
              <DocitaLoadingIndicator
                variant="section"
                withStatusRole={false}
                iconClassName="h-6 w-6 text-muted-foreground"
              />
            </div>
          ) : (pricingOffersQuery.data ?? []).length > 0 ? (
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
                {(pricingOffersQuery.data ?? []).map((row: PricingOfferRow) => (
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
                        disabled={deletePricingOfferMutation.isPending}
                        onClick={async () => {
                          try {
                            await deletePricingOfferMutation.mutateAsync(
                              row.clinicId,
                            );
                          } catch {
                            showUserFacingErrorToast(
                              "Could not remove checkout discount.",
                            );
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active checkout discounts.
            </p>
          )}

          <Form {...pricingOfferForm}>
            <form
              onSubmit={onSavePricingOffer}
              className="space-y-4 border-t border-border/60 pt-4"
              noValidate
            >
              <FormField
                control={pricingOfferForm.control}
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
                control={pricingOfferForm.control}
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
                control={pricingOfferForm.control}
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
                control={pricingOfferForm.control}
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
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
                        onChange={field.onChange}
                        placeholder="Select date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pricingOfferForm.control}
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
                <Button
                  type="submit"
                  disabled={savePricingOfferMutation.isPending}
                >
                  {savePricingOfferMutation.isPending && (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  )}
                  {savePricingOfferMutation.isPending
                    ? "Saving…"
                    : "Save discount"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}
