"use client";

import { FC, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useClinicSettings,
  useCreateClinicMember,
  useDeleteClinicMember,
  useReverifyDoctorRegistration,
  useUpdateClinicMember,
} from "@/hooks/api/use-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Copy, UserPlus } from "lucide-react";
import { User } from "@workspace/types";
import { useMemberManagementLogic } from "@/features/settings/hooks/use-member-management-logic";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { useFacilityLabel } from "@/lib/facility-label";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/hooks/use-confirm";
import {
  ADMIN_SWITCH_ROLES,
  DOCTOR_ROLES,
  INVITE_SUCCESS_LABELS,
  MEMBER_ROLE_LABELS,
  inviteSchema,
  memberSchema,
  type InviteFormValues,
  type MemberFormValues,
  type MemberRole,
} from "@/features/settings/components/management/member-management-schemas";
import { InviteTeamMemberDialog } from "@/features/settings/components/management/invite-team-member-dialog";
import { ManageTeamMemberDialog } from "@/features/settings/components/management/manage-team-member-dialog";
import { formatDateSafe } from "@/lib/formatters";

interface MemberManagementUIProps {
  members: User[];
  isLoading: boolean;
  error: Error | null;
  clinicId?: string;
  clinicReferralCode?: string | null;
}

export const MemberManagementUI: FC<MemberManagementUIProps> = ({
  members,
  isLoading,
  error,
  clinicId,
  clinicReferralCode,
}) => {
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

  const getVerificationBadgeVariant = (
    status?: User["verificationStatus"],
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "VERIFIED") return "default";
    if (status === "FAILED" || status === "REJECTED") return "destructive";
    if (status === "PENDING") return "secondary";
    return "outline";
  };

  const getVerificationBadgeLabel = (status?: User["verificationStatus"]) => {
    if (!status) return "Unverified";
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
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
    resolver: zodResolver(memberSchema),
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
    ADMIN_SWITCH_ROLES.has(selectedMember.role as MemberRole);
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

  if (isLoading) {
    return (
      <Card
        role="status"
        aria-live="polite"
        aria-label="Loading team members"
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your {facilityLabel.toLowerCase()} staff
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton
                  animation="wave"
                  variant="circular"
                  className="h-10 w-10 rounded-full"
                />
                <div className="space-y-2">
                  <Skeleton animation="wave" className="h-4 w-32" />
                  <Skeleton animation="wave" className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          We could not load your team members. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage {facilityLabel.toLowerCase()} staff and permissions
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {facilityLabel} code
            </span>
            <code className="rounded bg-muted px-2 py-1 text-xs font-semibold tracking-wide">
              {clinicReferralCode || "Not available"}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyClinicCode}
              disabled={!clinicReferralCode}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground md:text-right">
            Share this code so staff can join from the{" "}
            {facilityLabel.toLowerCase()} selection page.
          </p>
          <Button
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            disabled={!canInvite}
            className="w-full md:w-auto"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedMembers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No team members found. Invite your first team member.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70 font-medium text-foreground">
                    {member.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium">{member.name || "Unknown"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{member.email}</span>
                      <Badge variant="outline">
                        {MEMBER_ROLE_LABELS[member.role as MemberRole] ||
                          member.role ||
                          "Staff"}
                      </Badge>
                      {(member.role === "DOCTOR" ||
                        member.role === "ADMIN_DOCTOR") && (
                        <>
                          <Badge
                            variant={getVerificationBadgeVariant(
                              member.verificationStatus,
                            )}
                          >
                            {getVerificationBadgeLabel(
                              member.verificationStatus,
                            )}
                          </Badge>
                          <Badge
                            variant={
                              member.signatureUploadedAt ? "default" : "outline"
                            }
                          >
                            Signature{" "}
                            {member.signatureUploadedAt ? "Ready" : "Missing"}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openMemberDialog(member)}
                >
                  Manage
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <InviteTeamMemberDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        form={form}
        selectedRole={selectedRole}
        userCanChangeRoles={userCanChangeRoles}
        canInvite={canInvite}
        isSaving={isSaving}
        onSubmit={onInviteSubmit}
      />

      <ManageTeamMemberDialog
        member={selectedMember}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
        }}
        memberForm={memberForm}
        selectedMemberRole={selectedMemberRole}
        memberDialogDescription={memberDialogDescription}
        canChangeSelectedMemberRole={canChangeSelectedMemberRole}
        isSelectedMemberDoctor={isSelectedMemberDoctor}
        isManaging={isManaging}
        isUpdatingMember={isUpdatingMember}
        isDeletingMember={isDeletingMember}
        isReverifyingDoctor={isReverifyingDoctor}
        onSave={handleSaveMember}
        onRemoveClick={handleRemoveMember}
        onReverifyDoctor={handleReverifyDoctor}
        getVerificationBadgeVariant={getVerificationBadgeVariant}
        getVerificationBadgeLabel={getVerificationBadgeLabel}
        formatDate={formatDateSafe}
      />
    </Card>
  );
};

export const MemberManagementSettings: FC = () => {
  const { data: clinic } = useClinicSettings();
  const { members, isLoading, error } = useMemberManagementLogic();

  return (
    <MemberManagementUI
      members={members}
      isLoading={isLoading}
      error={error}
      clinicId={clinic?.id}
      clinicReferralCode={clinic?.referralCode}
    />
  );
};
