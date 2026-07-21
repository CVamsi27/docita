"use client";

import { Badge, Label, RadioGroup, RadioGroupItem } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { getFieldError, hasFieldError, InlineFieldError } from "./AuthSharedFields";
import type { FieldErrors } from "@/features/auth/types/auth";
import { parseStringEnumMember } from "@workspace/utils";
import { OWNER_ROLE_OPTIONS, SIGNUP_OWNER_ROLE_VALUES } from "./auth-signup-step-constants";

export function AuthSignupOwnerRoleFields({
  ownerRole,
  fieldErrors,
  onChangeOwnerRole,
}: {
  ownerRole: "ADMIN" | "ADMIN_DOCTOR" | null;
  fieldErrors: FieldErrors;
  onChangeOwnerRole: (value: "ADMIN" | "ADMIN_DOCTOR") => void;
}) {
  const selectedOwnerRole =
    OWNER_ROLE_OPTIONS.find((option) => option.value === ownerRole) ?? null;
  const ownerRoleError = getFieldError(fieldErrors, "ownerRole");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label id="signup-owner-role-label">
          Will you personally treat patients with this account?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Choose the setup that matches how you will use Docita on day one
        </p>
      </div>

      <RadioGroup
        aria-labelledby="signup-owner-role-label"
        aria-invalid={hasFieldError(fieldErrors, "ownerRole")}
        aria-describedby={
          hasFieldError(fieldErrors, "ownerRole")
            ? "signup-owner-role-error"
            : "signup-owner-role-hint"
        }
        value={ownerRole ?? ""}
        onValueChange={(value) => {
          const parsed = parseStringEnumMember(SIGNUP_OWNER_ROLE_VALUES, value);
          if (parsed) onChangeOwnerRole(parsed);
        }}
        className="grid gap-2.5 xl:grid-cols-2"
      >
        {OWNER_ROLE_OPTIONS.map((option) => {
          const inputId = `signup-owner-role-${option.value.toLowerCase()}`;
          const isSelected = ownerRole === option.value;

          return (
            <Label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                "flex h-full cursor-pointer rounded-lg border border-border/60 bg-background/50 px-4 py-3 transition-colors",
                "hover:bg-muted/20",
                isSelected && "border-primary/40 bg-muted/30",
              )}
            >
              <div className="flex w-full items-start gap-3">
                <RadioGroupItem
                  id={inputId}
                  value={option.value}
                  className="mt-1 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {option.title}
                    </p>
                    {"badge" in option && option.badge ? (
                      <Badge variant="secondary">{option.badge}</Badge>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {option.roleLabel} account
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </Label>
          );
        })}
      </RadioGroup>

      <p id="signup-owner-role-hint" className="text-xs text-muted-foreground">
        {selectedOwnerRole
          ? `${selectedOwnerRole.helper} You can update permissions later in Settings`
          : "Choose one answer to continue and you can change roles later in Settings"}
      </p>

      {ownerRoleError ? (
        <InlineFieldError
          id="signup-owner-role-error"
          message={ownerRoleError}
        />
      ) : null}
    </div>
  );
}
