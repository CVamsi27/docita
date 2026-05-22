import { UseFormReturn } from "react-hook-form";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { cn } from "@workspace/ui/lib/utils";
import type { ClinicDetails } from "@/features/onboarding/components/types";

interface ClinicBusinessSectionProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function ClinicBusinessSection({
  clinicForm,
}: ClinicBusinessSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/20 p-4 shadow-sm md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          {...clinicForm.register("website")}
          placeholder="Website"
          aria-invalid={!!clinicForm.formState.errors.website}
          aria-describedby={
            clinicForm.formState.errors.website
              ? "clinic-website-error"
              : undefined
          }
        />
        {clinicForm.formState.errors.website && (
          <p id="clinic-website-error" className="text-sm text-destructive">
            {clinicForm.formState.errors.website.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gstin">GSTIN for invoices</Label>
        <Input
          id="gstin"
          {...clinicForm.register("gstin")}
          placeholder="GSTIN"
          aria-invalid={!!clinicForm.formState.errors.gstin}
          aria-describedby={
            clinicForm.formState.errors.gstin
              ? "clinic-gstin-error"
              : "clinic-gstin-help"
          }
          className={cn(
            clinicForm.formState.errors.gstin &&
              "border-destructive focus-visible:ring-destructive/30",
            clinicForm.formState.errors.gstin && "focus-visible:ring-2",
          )}
        />
        {clinicForm.formState.errors.gstin ? (
          <p id="clinic-gstin-error" className="text-sm text-destructive">
            {clinicForm.formState.errors.gstin.message}
          </p>
        ) : (
          <p id="clinic-gstin-help" className="text-xs text-muted-foreground">
            Required for GST invoices before charging paid Indian plans
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="legalName">
          Legal name on tax invoice (optional)
        </Label>
        <Input
          id="legalName"
          {...clinicForm.register("legalName")}
          placeholder="Registered legal name (e.g. Apollo Multispecialty Pvt. Ltd.)"
          aria-describedby="clinic-legal-name-help"
        />
        <p
          id="clinic-legal-name-help"
          className="text-xs text-muted-foreground"
        >
          Used for the bill-to name on Docita tax invoices. Leave blank to use
          your facility name.
        </p>
      </div>
    </div>
  );
}
