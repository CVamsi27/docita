"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateClinicMember,
  useDeleteClinicMember,
  useReverifyDoctorRegistration,
  useUpdateClinicMember,
} from "@workspace/data-access";
import { User } from "@workspace/types";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useFacilityLabel } from "@/lib/formatters/facility-label";
import { useAuth } from "@/lib/auth/auth-context";
import { useConfirm } from "@/hooks/use-confirm";
import {
  ADMIN_SWITCH_ROLES,
  DOCTOR_ROLES,
  INVITE_SUCCESS_LABELS,
  inviteTeamMemberFormSchema,
  memberManagementFormSchema,
  type InviteFormValues,
  type MemberFormValues,
} from "@/features/settings/components/management/member-management-schemas";
import { parseStringEnumMember } from "@workspace/utils";

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
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const facilityLabel = useFacilityLabel();
  const { user } = useAuth();

  const { mutate: createMember, isPending: isCreatingMember } =
    useCreateClinicMember(clinicId);
  const { mutate: updateMember, isPending: isUpdatingMember } =
    useUpdateClinicMember();
  const { mutate: deleteMember, isPending: isDeletingMember } =
    useDeleteClinicMember();
  const { mutate: reverifyDoctor, isPending: isReverifyingDoctor } =
    useReverifyDoctorRegistration();

  const isSaving = isCreatingMember;
  const isManaging =
    isUpdatingMember || isDeletingMember || isReverifyingDoctor;

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteTeamMemberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "NURSE",
      phoneNumber: "",
      specialization: "",
      qualification: "",
      registrationNumber: "",
    },
  });

  const memberForm = useForm<MemberFormValues>({
    resolver: zodResolver(memberManagementFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      role: "NURSE",
      specialization: "",
      qualification: "",
      registrationNumber: "",
    },
  });

  const selectedRole = form.watch("role");
  const selectedMemberRole = memberForm.watch("role");
  const isSelectedMemberDoctor = DOCTOR_ROLES.has(selectedMemberRole);
  const userCanChangeRoles =
    user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR";
  const canChangeSelectedMemberRole =
    !!selectedMember &&
    userCanChangeRoles &&
    selectedMember.id !== user?.id &&
    parseStringEnumMember(
      Array.from(ADMIN_SWITCH_ROLES),
      selectedMember.role,
    ) !== undefined;
  const memberDialogDescription = isSelectedMemberDoctor
    ? "Edit contact details, role eligibility, verification, and signature status."
    : "Edit contact details and review this member's role.";
  const canInvite = !!clinicId;

  const openMemberDialog = (member: User) => {
    setSelectedMember(member);
    memberForm.reset({
      name: member.name ?? "",
      email: member.email ?? "",
      phoneNumber: member.phoneNumber ?? "",
      role:
        member.role === "DOCTOR" ||
        member.role === "NURSE" ||
        member.role === "RECEPTIONIST" ||
        member.role === "ADMIN" ||
        member.role === "ADMIN_DOCTOR"
          ? member.role
          : "NURSE",
      specialization: member.specialization ?? "",
      qualification: member.qualification ?? "",
      registrationNumber: member.registrationNumber ?? "",
    });
  };

  const handleSaveMember = (data: MemberFormValues) => {
    if (!selectedMember) return;

    updateMember(
      {
        memberId: selectedMember.id,
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber || undefined,
        ...(canChangeSelectedMemberRole ? { role: data.role } : {}),
        ...(isSelectedMemberDoctor
          ? {
              specialization: data.specialization || undefined,
              qualification: data.qualification || undefined,
              registrationNumber: data.registrationNumber || undefined,
            }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success("Member updated successfully");
          setSelectedMember(null);
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            "We could not update this team member. Please try again.",
            "save",
          );
        },
      },
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
      {
        onSuccess: () => {
          toast.success("Member removed successfully");
          setSelectedMember(null);
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            "We could not remove this team member. Please try again.",
            "delete",
          );
        },
      },
    );
  };

  const handleReverifyDoctor = async (doctorId: string) => {
    const hasRegistrationNumber = await memberForm.trigger(
      "registrationNumber",
      { shouldFocus: true },
    );

    if (!hasRegistrationNumber) {
      showUserFacingErrorToast(
        "Please enter the highlighted registration number before reverifying.",
        "Please check the highlighted fields and try again.",
        "form",
      );
      return;
    }

    reverifyDoctor(
      { doctorId },
      {
        onSuccess: () => {
          toast.success("Doctor registration reverification triggered");
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            "We could not restart this doctor's verification. Please try again.",
            "save",
          );
        },
      },
    );
  };

  const handleCopyClinicCode = async () => {
    if (!clinicReferralCode) {
      showUserFacingErrorToast(
        `The ${facilityLabel.toLowerCase()} code is not ready yet. Please refresh and try again.`,
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(clinicReferralCode);
      toast.success(`${facilityLabel} code copied`);
    } catch {
      showUserFacingErrorToast(
        `We could not copy this ${facilityLabel.toLowerCase()} code. Please try again.`,
      );
    }
  };

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  );

  const onInviteSubmit = (data: InviteFormValues) => {
    if (!clinicId) {
      showUserFacingErrorToast(
        "We could not identify this facility. Please refresh and try again.",
      );
      return;
    }

    if (
      (data.role === "ADMIN" || data.role === "ADMIN_DOCTOR") &&
      !userCanChangeRoles
    ) {
      showUserFacingErrorToast(
        null,
        "Only facility administrators can invite Admin or Admin Doctor accounts.",
        "form",
      );
      return;
    }

    createMember(
      {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        phoneNumber: data.phoneNumber || undefined,
        specialization: data.specialization || undefined,
        qualification: data.qualification || undefined,
        registrationNumber: data.registrationNumber || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            `${INVITE_SUCCESS_LABELS[data.role]} invited successfully`,
          );
          setIsInviteOpen(false);
          form.reset();
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            "We could not send this invitation. Please try again.",
            "save",
          );
        },
      },
    );
  };

  return {
    facilityLabel,
    sortedMembers,
    isInviteOpen,
    setIsInviteOpen,
    selectedMember,
    setSelectedMember,
    form,
    memberForm,
    selectedRole,
    selectedMemberRole,
    memberDialogDescription,
    canChangeSelectedMemberRole,
    isSelectedMemberDoctor,
    canInvite,
    isSaving,
    isManaging,
    isUpdatingMember,
    isDeletingMember,
    isReverifyingDoctor,
    userCanChangeRoles,
    clinicReferralCode,
    openMemberDialog,
    handleSaveMember,
    handleRemoveMember,
    handleReverifyDoctor,
    handleCopyClinicCode,
    onInviteSubmit,
  };
}
