// jscpd:ignore-start
"use client";

import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Button } from "@workspace/ui/components/form/button";
// jscpd:ignore-end
import {
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { InviteFormValues } from "@/features/settings/components/management/member-management-schemas";
import {
  TeamMemberContactFields,
  TeamMemberLabField,
} from "@/features/settings/components/management/team-member-form-fields";

/**
 * Phase 3 (per-feature): the Invite Member dialog in Settings
 * > Team Management. 12 literals converted to useTranslations
 * (\"Settings.invite\") — labels, placeholders, role select
 * options, the dialog footer buttons.
 */
function useInviteTranslations() {
  return useTranslations("Settings.invite");
}

interface InviteNameRoleFieldsProps {
  form: UseFormReturn<InviteFormValues>;
  userCanChangeRoles: boolean;
}

export function InviteNameRoleFields({
  form,
  userCanChangeRoles,
}: InviteNameRoleFieldsProps) {
  const t = useInviteTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
// jscpd:ignore-start
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("nameLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("namePlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
// jscpd:ignore-end
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("roleLabel")}</FormLabel>
            <Select
              value={field.value ?? "NURSE"}
              onValueChange={field.onChange}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="NURSE">{t("roleNurse")}</SelectItem>
                <SelectItem value="RECEPTIONIST">{t("roleReceptionist")}</SelectItem>
                <SelectItem value="DOCTOR">{t("roleDoctor")}</SelectItem>
                <SelectItem value="LAB">{t("roleLab")}</SelectItem>
                {userCanChangeRoles && (
                  <>
                    <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
                    <SelectItem value="ADMIN_DOCTOR">{t("roleAdminDoctor")}</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
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
  const t = useInviteTranslations();
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
  const t = useInviteTranslations();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FormField
        control={form.control}
        name="specialization"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("specializationLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("specializationPlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="qualification"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("qualificationLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("qualificationPlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="registrationNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("registrationNumberLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("registrationNumberPlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
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
  const t = useInviteTranslations();
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
