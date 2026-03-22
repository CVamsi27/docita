import { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CLINIC_TYPE_LABELS, type ClinicType } from "@workspace/types";
import { cn } from "@workspace/ui/lib/utils";
import type { ClinicDetails } from "@/features/onboarding/components/types";

interface ClinicDetailsStepProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  onSubmit: (data: ClinicDetails) => void;
}

export function ClinicDetailsStep({
  clinicForm,
  onSubmit,
}: ClinicDetailsStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Clinic Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id="step1"
          onSubmit={clinicForm.handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Clinic Name</Label>
              <Input
                id="name"
                {...clinicForm.register("name")}
                placeholder="HealthPlus Clinic"
                aria-invalid={!!clinicForm.formState.errors.name}
                aria-describedby={
                  clinicForm.formState.errors.name
                    ? "clinic-name-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.name && (
                <p id="clinic-name-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Clinic Type</Label>
              <Select
                onValueChange={(val) =>
                  clinicForm.setValue("type", val as ClinicType, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                value={clinicForm.watch("type")}
              >
                <SelectTrigger
                  aria-invalid={!!clinicForm.formState.errors.type}
                  aria-describedby={
                    clinicForm.formState.errors.type
                      ? "clinic-type-error"
                      : undefined
                  }
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CLINIC_TYPE_LABELS) as ClinicType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {CLINIC_TYPE_LABELS[type]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {clinicForm.formState.errors.type && (
                <p id="clinic-type-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.type.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Clinic Email</Label>
              <Input
                id="email"
                type="email"
                {...clinicForm.register("email")}
                placeholder="contact@clinic.com"
                aria-invalid={!!clinicForm.formState.errors.email}
                aria-describedby={
                  clinicForm.formState.errors.email
                    ? "clinic-email-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.email && (
                <p id="clinic-email-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 9876543410"
                value={clinicForm.watch("phone") ?? ""}
                onChange={(event) =>
                  clinicForm.setValue("phone", event.target.value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                className={cn(
                  clinicForm.formState.errors.phone &&
                    "border-destructive focus-visible:ring-destructive/30",
                  clinicForm.formState.errors.phone && "focus-visible:ring-2",
                )}
                aria-invalid={!!clinicForm.formState.errors.phone}
                aria-describedby={
                  clinicForm.formState.errors.phone
                    ? "clinic-phone-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.phone && (
                <p id="clinic-phone-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...clinicForm.register("address")}
                placeholder="123 Medical Lane, City"
                aria-invalid={!!clinicForm.formState.errors.address}
                aria-describedby={
                  clinicForm.formState.errors.address
                    ? "clinic-address-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.address && (
                <p id="clinic-address-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                {...clinicForm.register("website")}
                placeholder="https://clinic.com"
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
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button className="w-full" form="step1" type="submit">
          Next: Choose Plan
        </Button>
      </CardFooter>
    </Card>
  );
}
