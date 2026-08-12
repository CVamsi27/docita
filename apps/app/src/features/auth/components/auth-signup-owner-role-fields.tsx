import { useTranslation } from "react-i18next";
import { Badge, Label, RadioGroup, RadioGroupItem } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { hasFieldError, getFieldError } from "@/lib/utils/form-errors";
import { InlineFieldError } from "./AuthSharedFields";
import type { FieldErrors } from "../types/auth";
import { parseStringEnumMember } from "@workspace/utils";

const SIGNUP_OWNER_ROLE_VALUES = ["ADMIN", "ADMIN_DOCTOR"] as const;

function buildOwnerRoleOptions(tSignIn: (key: string) => string) {
  const options: Array<{
    value: "ADMIN" | "ADMIN_DOCTOR";
    roleLabel: string;
    title: string;
    description: string;
    helper: string;
    badge?: string;
  }> = [
    {
      value: "ADMIN_DOCTOR",
      roleLabel: tSignIn("ownerRoleAdminDoctor"),
      title: tSignIn("ownerRoleAdminDoctorTitle"),
      description: tSignIn("ownerRoleAdminDoctorDescription"),
      helper: tSignIn("ownerRoleAdminDoctorHelper"),
      badge: tSignIn("recommendedBadge"),
    },
    {
      value: "ADMIN",
      roleLabel: tSignIn("ownerRoleAdmin"),
      title: tSignIn("ownerRoleAdminTitle"),
      description: tSignIn("ownerRoleAdminDescription"),
      helper: tSignIn("ownerRoleAdminHelper"),
    },
  ];
  return options;
}

export function AuthSignupOwnerRoleFields({
  ownerRole,
  fieldErrors,
  onChangeOwnerRole,
}: {
  ownerRole: "ADMIN" | "ADMIN_DOCTOR" | null;
  fieldErrors: FieldErrors;
  onChangeOwnerRole: (value: "ADMIN" | "ADMIN_DOCTOR") => void;
}) {
  const { t } = useTranslation("Auth");
  const tSignIn = (key: string, options?: Record<string, unknown>) =>
    t(`signIn.${key}`, options);
  const ownerRoleOptions = buildOwnerRoleOptions(tSignIn);
  const selectedOwnerRole =
    ownerRoleOptions.find((option) => option.value === ownerRole) ?? null;
  const ownerRoleError = getFieldError(fieldErrors, "ownerRole");

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label id="signup-owner-role-label">
          {tSignIn("ownerRoleLabel")}
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">{tSignIn("ownerRoleHint")}</p>
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
        {ownerRoleOptions.map((option) => {
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
                    {tSignIn("ownerRoleAccountSuffix", {
                      roleLabel: option.roleLabel,
                    })}
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
          ? `${selectedOwnerRole.helper} ${tSignIn("ownerRoleHelperSuffix")}`
          : tSignIn("ownerRoleNoneHint")}
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