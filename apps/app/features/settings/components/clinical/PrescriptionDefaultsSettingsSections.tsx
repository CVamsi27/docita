"use client";

import { FileText, Save } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { Button } from "@workspace/ui/components/form/button";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form/form";
import type { UseFormReturn } from "react-hook-form";
import type { PrescriptionDefaultsFormValues } from "@workspace/types";

export function PrescriptionDefaultsSkeleton() {
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-label="Loading prescription defaults"
    >
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-1 h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function PrescriptionDefaultsCardHeader() {
  return (
    <CardHeader className="border-b border-border/60 pb-5">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <CardTitle>Prescription defaults</CardTitle>
      </div>
      <CardDescription>
        Pre-filled values that appear on every new prescription.
      </CardDescription>
    </CardHeader>
  );
}

export interface PrescriptionDefaultsFieldProps {
  form: UseFormReturn<PrescriptionDefaultsFormValues>;
}

export function PrescriptionDefaultsInstructionsField({
  form,
}: PrescriptionDefaultsFieldProps) {
  return (
    <FormField
      control={form.control}
      name="defaultInstructions"
      render={({ field }) => (
        <FormItem>
          <Label htmlFor="defaultInstructions">Default instructions</Label>
          <FormControl>
            <Textarea
              id="defaultInstructions"
              placeholder="Enter default instructions"
              rows={4}
              {...field}
            />
          </FormControl>
          <p className="text-xs text-muted-foreground">
            These instructions will be pre-filled in every new prescription
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PrescriptionDefaultsFooterField({
  form,
}: PrescriptionDefaultsFieldProps) {
  return (
    <FormField
      control={form.control}
      name="defaultFooterText"
      render={({ field }) => (
        <FormItem>
          <Label htmlFor="defaultFooterText">Footer text</Label>
          <FormControl>
            <Textarea
              id="defaultFooterText"
              placeholder="Enter contact message"
              rows={3}
              {...field}
            />
          </FormControl>
          <p className="text-xs text-muted-foreground">
            This text will appear at the bottom of every prescription
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PrescriptionDefaultsCheckboxGroup({
  form,
}: PrescriptionDefaultsFieldProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 p-4">
      <span className="ui-eyebrow">Prescription options</span>

      <FormField
        control={form.control}
        name="includeClinicHeader"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
            <FormControl>
              <Checkbox
                id="includeClinicHeader"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <label
              htmlFor="includeClinicHeader"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include clinic header with logo and contact details
            </label>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="includeDoctorSignature"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
            <FormControl>
              <Checkbox
                id="includeDoctorSignature"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <label
              htmlFor="includeDoctorSignature"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include doctor&apos;s signature and registration number
            </label>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="includeQRCode"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
            <FormControl>
              <Checkbox
                id="includeQRCode"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <label
              htmlFor="includeQRCode"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include QR code for verification
            </label>
          </FormItem>
        )}
      />
    </div>
  );
}

export interface PrescriptionDefaultsFormActionsProps {
  saving: boolean;
}

export function PrescriptionDefaultsFormActions({
  saving,
}: PrescriptionDefaultsFormActionsProps) {
  return (
    <div className="flex justify-end border-t border-border/60 pt-4">
      <Button type="submit" disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Saving\u2026" : "Save defaults"}
      </Button>
    </div>
  );
}
