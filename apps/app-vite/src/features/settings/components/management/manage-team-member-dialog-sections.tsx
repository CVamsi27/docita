import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Badge, Button } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useTranslation } from "react-i18next";
import { User } from "@workspace/types";
import { type MemberFormValues, type MemberRole } from "@/features/settings/components/management/member-management-schemas";
import { TeamMemberContactFields, TeamMemberLabField } from "@/features/settings/components/management/team-member-form-fields";

export function ManageMemberLabField({
  memberForm,
}: {
  memberForm: UseFormReturn<MemberFormValues>;
}) {
  return <TeamMemberLabField form={memberForm} />;
}

export interface ManageMemberInfoCardProps {
  member: User;
  selectedMemberRole: MemberRole;
  roleLabels: Record<MemberRole, string>;
}

export function ManageMemberInfoCard({
  member,
  selectedMemberRole,
  roleLabels,
}: ManageMemberInfoCardProps) {
  const { t } = useTranslation("Settings.manageMember");
  return (
    <div className="rounded-lg border bg-muted/20 p-3 md:col-span-2">
      <p className="text-base font-semibold text-foreground">
        {member.name || t("unknownMember")}
      </p>
      <p className="text-sm text-muted-foreground">
        {roleLabels[selectedMemberRole]}
      </p>
    </div>
  );
}

export interface ManageMemberNameRoleFieldsProps {
  memberForm: UseFormReturn<MemberFormValues>;
  canChangeSelectedMemberRole: boolean;
  selectedMemberRole: MemberRole;
  roleLabels: Record<MemberRole, string>;
}

export function ManageMemberNameRoleFields({
  memberForm,
  canChangeSelectedMemberRole,
  selectedMemberRole: _selectedMemberRole,
  roleLabels,
}: ManageMemberNameRoleFieldsProps) {
  const { t } = useTranslation("Settings.manageMember");
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        control={memberForm.control}
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
        control={memberForm.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("roleLabel")}</FormLabel>
            {canChangeSelectedMemberRole ? (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
                  <SelectItem value="ADMIN_DOCTOR">
                    {t("roleAdminDoctor")}
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-10 items-center rounded-md border bg-muted/20 px-3">
                <Badge variant="outline">
                  {roleLabels[field.value]}
                </Badge>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export interface ManageMemberContactFieldsProps {
  memberForm: UseFormReturn<MemberFormValues>;
}

export function ManageMemberContactFields({
  memberForm,
}: ManageMemberContactFieldsProps) {
  return <TeamMemberContactFields form={memberForm} />;
}

export interface ManageMemberCreatedDateProps {
  member: User;
  formatDate: (value?: string | Date) => string;
}

export function ManageMemberCreatedDate({
  member,
  formatDate,
}: ManageMemberCreatedDateProps) {
  const { t } = useTranslation("Settings.manageMember");
  return (
    <div>
      <p className="text-muted-foreground">{t("createdLabel")}</p>
      <p className="font-medium">{formatDate(member.createdAt)}</p>
    </div>
  );
}

export interface ManageMemberFooterProps {
  onOpenChange: (open: boolean) => void;
  isManaging: boolean;
  isUpdatingMember: boolean;
  isDeletingMember: boolean;
  onRemoveClick: () => void;
}

export function ManageMemberFooter({
  onOpenChange,
  isManaging,
  isUpdatingMember,
  isDeletingMember,
  onRemoveClick,
}: ManageMemberFooterProps) {
  const { t } = useTranslation("Settings.manageMember");
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isManaging}
        className="w-full sm:w-auto"
      >
        {t("closeButton")}
      </Button>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
        <Button
          type="submit"
          disabled={isManaging}
          className="w-full sm:w-auto"
        >
          {isUpdatingMember ? (
            <DocitaLoadingIndicator
              variant="inline"
              decorative
              className="mr-2"
            />
          ) : null}
          {t("saveButton")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onRemoveClick}
          disabled={isManaging}
          className="w-full sm:w-auto"
        >
          {isDeletingMember ? (
            <DocitaLoadingIndicator
              variant="inline"
              decorative
              className="mr-2"
            />
          ) : null}
          {t("removeButton")}
        </Button>
      </div>
    </>
  );
}
