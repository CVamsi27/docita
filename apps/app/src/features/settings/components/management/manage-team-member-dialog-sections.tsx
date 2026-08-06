import type { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useTranslation } from "react-i18next";
import { User } from "@workspace/types";
import { type MemberFormValues, type MemberRole } from "@/features/settings/components/management/member-management-schemas";
import { TeamMemberContactFields, TeamMemberLabField, TeamMemberNameRoleFields } from "@/features/settings/components/management/team-member-form-fields";

export function ManageMemberLabField({
  memberForm,
}: {
  memberForm: UseFormReturn<MemberFormValues>;
}) {
  return <TeamMemberLabField form={memberForm} />;
}

interface ManageMemberInfoCardProps {
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

interface ManageMemberNameRoleFieldsProps {
  memberForm: UseFormReturn<MemberFormValues>;
  canChangeSelectedMemberRole: boolean;
  selectedMemberRole: MemberRole;
  roleLabels: Record<MemberRole, string>;
}

export function ManageMemberNameRoleFields({
  memberForm,
  canChangeSelectedMemberRole,
  selectedMemberRole,
  roleLabels,
}: ManageMemberNameRoleFieldsProps) {
  const { t } = useTranslation("Settings.manageMember");
  return (
    <TeamMemberNameRoleFields
      form={memberForm}
      t={t}
      roleItems={[
        { value: "ADMIN", label: t("roleAdmin") },
        { value: "ADMIN_DOCTOR", label: t("roleAdminDoctor") },
      ]}
      readOnly={!canChangeSelectedMemberRole}
      // Read-only: the form role is immutable and initialized from the
      // member, so the `selectedMemberRole` prop matches `field.value`.
      readOnlyValue={roleLabels[selectedMemberRole]}
    />
  );
}

interface ManageMemberContactFieldsProps {
  memberForm: UseFormReturn<MemberFormValues>;
}

export function ManageMemberContactFields({
  memberForm,
}: ManageMemberContactFieldsProps) {
  return <TeamMemberContactFields form={memberForm} />;
}

interface ManageMemberCreatedDateProps {
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

interface ManageMemberFooterProps {
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
