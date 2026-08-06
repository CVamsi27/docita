import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateClinicMember, useDeleteClinicMember, useReverifyDoctorRegistration, useUpdateClinicMember } from "@workspace/data-access";
import { User } from "@workspace/types";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useFacilityLabel } from "@/lib/formatters/facility-label";
import { useAuth } from "@/lib/auth/auth-context";
import { useConfirm } from "@/hooks/use-confirm";
import { memberRoleLabel } from "@/features/settings/components/management/member-role-label";
import { inviteTeamMemberFormSchema, memberManagementFormSchema, type InviteFormValues, type MemberFormValues } from "@/features/settings/components/management/member-management-schemas";
import { buildCreateMemberPayload, buildUpdateMemberPayload, computeCanChangeSelectedMemberRole, computeMemberDialogDescription, computeUserCanChangeRoles, computeIsSelectedMemberDoctor, createToastCallbacks, getEmptyMemberFormDefaultValues, getInviteFormDefaultValues, getInviteGuardError, getMemberFormDefaultValues } from "./member-management-logic";

export function useMemberManagement({
  members,
  clinicId,
  clinicReferralCode,
}: {
  members: User[];
  clinicId?: string;
  clinicReferralCode?: string | null;
}) {
  const { confirm } = useConfirm();
  const { t } = useTranslation("Settings");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const facilityLabel = useFacilityLabel();
  const { user } = useAuth();
  const { mutate: createMember, isPending: isCreatingMember } = useCreateClinicMember(clinicId);
  const { mutate: updateMember, isPending: isUpdatingMember } = useUpdateClinicMember();
  const { mutate: deleteMember, isPending: isDeletingMember } = useDeleteClinicMember();
  const { mutate: reverifyDoctor, isPending: isReverifyingDoctor } = useReverifyDoctorRegistration();
  const isSaving = isCreatingMember;
  const isManaging = isUpdatingMember || isDeletingMember || isReverifyingDoctor;
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteTeamMemberFormSchema),
    defaultValues: getInviteFormDefaultValues(),
  });
  const memberForm = useForm<MemberFormValues>({
    resolver: zodResolver(memberManagementFormSchema),
    defaultValues: getEmptyMemberFormDefaultValues(),
  });
  const selectedRole = form.watch("role");
  const selectedMemberRole = memberForm.watch("role");
  const userCanChangeRoles = computeUserCanChangeRoles(user?.role);
  const isSelectedMemberDoctor = computeIsSelectedMemberDoctor(selectedMemberRole);
  const canChangeSelectedMemberRole = computeCanChangeSelectedMemberRole({
    selectedMember,
    userCanChangeRoles,
    currentUserId: user?.id,
  });
  const memberDialogDescription = computeMemberDialogDescription(isSelectedMemberDoctor);
  const canInvite = !!clinicId;
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  );

  const openMemberDialog = (member: User) => {
    setSelectedMember(member);
    memberForm.reset(getMemberFormDefaultValues(member));
  };

  const handleSaveMember = (data: MemberFormValues) => {
    if (!selectedMember) return;
    updateMember(
      buildUpdateMemberPayload(selectedMember.id, data, canChangeSelectedMemberRole, isSelectedMemberDoctor),
      createToastCallbacks("Member updated successfully", "We could not update this team member. Please try again.", "save", () => setSelectedMember(null)),
    );
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    const confirmed = await confirm({
      title: "Remove team member",
      description: `Remove ${selectedMember.name || "this member"} from ${facilityLabel.toLowerCase()}? This cannot be undone.`,
      variant: "destructive",
      confirmText: "Remove",
      cancelText: "Cancel",
    });
    if (!confirmed) return;
    deleteMember(
      { memberId: selectedMember.id },
      createToastCallbacks("Member removed successfully", "We could not remove this team member. Please try again.", "delete", () => setSelectedMember(null)),
    );
  };

  const handleReverifyDoctor = async (doctorId: string) => {
    const hasRegistrationNumber = await memberForm.trigger("registrationNumber", { shouldFocus: true });
    if (!hasRegistrationNumber) {
      showUserFacingErrorToast("Please enter the highlighted registration number before reverifying.", "Please check the highlighted fields and try again.", "form");
      return;
    }
    reverifyDoctor(
      { doctorId },
      createToastCallbacks("Doctor registration reverification triggered", "We could not restart this doctor's verification. Please try again.", "save"),
    );
  };

  const handleCopyClinicCode = async () => {
    if (!clinicReferralCode) {
      showUserFacingErrorToast(`The ${facilityLabel.toLowerCase()} code is not ready yet. Please refresh and try again.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(clinicReferralCode);
      toast.success(`${facilityLabel} code copied`);
    } catch {
      showUserFacingErrorToast(`We could not copy this ${facilityLabel.toLowerCase()} code. Please try again.`);
    }
  };

  const onInviteSubmit = (data: InviteFormValues) => {
    const guardError = getInviteGuardError(clinicId, data.role, userCanChangeRoles);
    if (guardError) {
      showUserFacingErrorToast(null, guardError, "form");
      return;
    }
    createMember(
      buildCreateMemberPayload(data),
      createToastCallbacks(t("roles.inviteSuccess", { role: memberRoleLabel(data.role, t) }), "We could not send this invitation. Please try again.", "save", () => {
        setIsInviteOpen(false);
        form.reset();
      }),
    );
  };

  return {
    facilityLabel, sortedMembers, isInviteOpen, setIsInviteOpen,
    selectedMember, setSelectedMember, form, memberForm, selectedRole,
    selectedMemberRole, memberDialogDescription, canChangeSelectedMemberRole,
    isSelectedMemberDoctor, canInvite, isSaving, isManaging,
    isUpdatingMember, isDeletingMember, isReverifyingDoctor,
    userCanChangeRoles, clinicReferralCode, openMemberDialog,
    handleSaveMember, handleRemoveMember, handleReverifyDoctor,
    handleCopyClinicCode, onInviteSubmit,
  };
}
