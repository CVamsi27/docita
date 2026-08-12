import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form-primitives";
import { Input } from "@workspace/ui/components/form/input";
import { Button } from "@workspace/ui/components/form/button";
import {
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { InviteFormValues } from "./member-management-schemas";
import {
  DoctorRegistrationFields,
  TeamMemberContactFields,
  TeamMemberLabField,
  TeamMemberNameRoleFields,
} from "./team-member-form-fields";

function useInviteTranslations() {
  return useTranslation("Settings.invite");
}

interface InviteNameRoleFieldsProps {
  form: UseFormReturn<InviteFormValues>;
  userCanChangeRoles: boolean;
}

export function InviteNameRoleFields({
  form,
  userCanChangeRoles,
}: InviteNameRoleFieldsProps) {
  const { t } = useInviteTranslations();
  const roleItems = [
    { value: "NURSE", label: t("roleNurse") },
    { value: "RECEPTIONIST", label: t("roleReceptionist") },
    { value: "DOCTOR", label: t("roleDoctor") },
    { value: "LAB", label: t("roleLab") },
    ...(userCanChangeRoles
      ? [
          { value: "ADMIN", label: t("roleAdmin") },
          { value: "ADMIN_DOCTOR", label: t("roleAdminDoctor") },
        ]
      : []),
  ];
  return <TeamMemberNameRoleFields form={form} t={t} roleItems={roleItems} />;
}

interface InviteContactFieldsProps {
  form: UseFormReturn<InviteFormValues>;
}

export function InviteContactFields({ form }: InviteContactFieldsProps) {
  return <TeamMemberContactFields form={form} />;
}

interface InvitePasswordFieldProps {
  form: UseFormReturn<InviteFormValues>;
}

export function InvitePasswordField({ form }: InvitePasswordFieldProps) {
  const { t } = useInviteTranslations();
  return (
    <FormField
      control={form.control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("passwordLabel")}</FormLabel>
          <FormControl>
            <Input
              type="password"
              placeholder={t("passwordPlaceholder")}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface InviteDoctorFieldsProps {
  form: UseFormReturn<InviteFormValues>;
}

export function InviteDoctorFields({ form }: InviteDoctorFieldsProps) {
  const { t } = useInviteTranslations();
  return <DoctorRegistrationFields form={form} t={t} />;
}

interface InviteLabFieldProps {
  form: UseFormReturn<InviteFormValues>;
}

export function InviteLabField({ form }: InviteLabFieldProps) {
  return <TeamMemberLabField form={form} />;
}

interface InviteDialogFooterProps {
  onOpenChange: (open: boolean) => void;
  canInvite: boolean;
  isSaving: boolean;
}

export function InviteDialogFooter({
  onOpenChange,
  canInvite,
  isSaving,
}: InviteDialogFooterProps) {
  const { t } = useInviteTranslations();
  return (
    <DialogFooter className="flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="w-full sm:w-auto"
      >
        {t("cancel")}
      </Button>
      <Button
        type="submit"
        disabled={!canInvite || isSaving}
        className="w-full sm:w-auto"
      >
        {isSaving && (
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="mr-2"
          />
        )}
        {t("inviteButton")}
      </Button>
    </DialogFooter>
  );
}
