import PhoneInput from "react-phone-number-input";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { AdminAccount } from "@/features/onboarding/components/types";

interface AdminAccountStepProps {
  adminForm: UseFormReturn<AdminAccount>;
  onBack: () => void;
  onSubmit: (data: AdminAccount) => void;
}

export function AdminAccountStep({
  adminForm,
  onBack,
  onSubmit,
}: AdminAccountStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Admin Account Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id="step2"
          onSubmit={adminForm.handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="adminName">Full Name</Label>
            <Input
              id="adminName"
              {...adminForm.register("name")}
              placeholder="Dr. John Doe"
              aria-invalid={!!adminForm.formState.errors.name}
              aria-describedby={
                adminForm.formState.errors.name ? "admin-name-error" : undefined
              }
            />
            {adminForm.formState.errors.name && (
              <p id="admin-name-error" className="text-sm text-destructive">
                {adminForm.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input
              id="adminEmail"
              type="email"
              {...adminForm.register("email")}
              placeholder="john@clinic.com"
              aria-invalid={!!adminForm.formState.errors.email}
              aria-describedby={
                adminForm.formState.errors.email
                  ? "admin-email-error"
                  : undefined
              }
            />
            {adminForm.formState.errors.email && (
              <p id="admin-email-error" className="text-sm text-destructive">
                {adminForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...adminForm.register("password")}
              aria-invalid={!!adminForm.formState.errors.password}
              aria-describedby={
                adminForm.formState.errors.password
                  ? "admin-password-error"
                  : undefined
              }
            />
            {adminForm.formState.errors.password && (
              <p id="admin-password-error" className="text-sm text-destructive">
                {adminForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPhone">Mobile Number</Label>
            <PhoneInput
              id="adminPhone"
              defaultCountry="IN"
              international
              value={adminForm.watch("phoneNumber")}
              onChange={(value) =>
                adminForm.setValue("phoneNumber", value || "", {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background [&>input]:outline-none [&>input]:bg-transparent",
                adminForm.formState.errors.phoneNumber &&
                  "border-destructive focus-within:ring-2 focus-within:ring-destructive/30",
              )}
              aria-invalid={!!adminForm.formState.errors.phoneNumber}
              aria-describedby={
                adminForm.formState.errors.phoneNumber
                  ? "admin-phone-error"
                  : undefined
              }
            />
            {adminForm.formState.errors.phoneNumber && (
              <p id="admin-phone-error" className="text-sm text-destructive">
                {adminForm.formState.errors.phoneNumber.message}
              </p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" form="step2" type="submit">
          Next: Select Plan
        </Button>
      </CardFooter>
    </Card>
  );
}
