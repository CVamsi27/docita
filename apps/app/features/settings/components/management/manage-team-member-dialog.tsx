"use client";

import type { UseFormReturn } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Form } from "@workspace/ui/components";
import { User } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { MEMBER_ROLE_LABELS, type MemberFormValues, type MemberRole } from "@/features/settings/components/management/member-management-schemas";
import { ManageTeamMemberDoctorPanel } from "./manage-team-member-doctor-panel";
import { ManageMemberInfoCard, ManageMemberNameRoleFields, ManageMemberContactFields, ManageMemberLabField, ManageMemberCreatedDate, ManageMemberFooter } from "./manage-team-member-dialog-sections";

interface ManageTeamMemberDialogProps {
  member: User | null;
  onOpenChange: (open: boolean) => void;
  memberForm: UseFormReturn<MemberFormValues>;
  selectedMemberRole: MemberRole;
  memberDialogDescription: string;
  canChangeSelectedMemberRole: boolean;
  isSelectedMemberDoctor: boolean;
  isManaging: boolean;
  isUpdatingMember: boolean;
  isDeletingMember: boolean;
  isReverifyingDoctor: boolean;
  onSave: (data: MemberFormValues) => void;
  onRemoveClick: () => void;
  onReverifyDoctor: (doctorId: string) => void;
  getVerificationBadgeVariant: (
    status?: User["verificationStatus"],
  ) => "default" | "secondary" | "destructive" | "outline";
  getVerificationBadgeLabel: (status?: User["verificationStatus"]) => string;
  formatDate: (value?: string | Date) => string;
}

export function ManageTeamMemberDialog({
  member,
  onOpenChange,
  memberForm,
  selectedMemberRole,
  memberDialogDescription,
  canChangeSelectedMemberRole,
  isSelectedMemberDoctor,
  isManaging,
  isUpdatingMember,
  isDeletingMember,
  isReverifyingDoctor,
  onSave,
  onRemoveClick,
  onReverifyDoctor,
  getVerificationBadgeVariant,
  getVerificationBadgeLabel,
  formatDate,
}: ManageTeamMemberDialogProps) {
  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Member details</DialogTitle>
          <DialogDescription>{memberDialogDescription}</DialogDescription>
        </DialogHeader>
        {member ? (
          <Form {...memberForm}>
            <form
              onSubmit={memberForm.handleSubmit(onSave, () => {
                showUserFacingErrorToast(
                  "Please check the highlighted fields and try again.",
                  "Please check the highlighted fields and try again.",
                  "form",
                );
              })}
              className="flex flex-col gap-4 text-sm"
              noValidate
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ManageMemberInfoCard
                  member={member}
                  selectedMemberRole={selectedMemberRole}
                  roleLabels={MEMBER_ROLE_LABELS}
                />
                <ManageMemberNameRoleFields
                  memberForm={memberForm}
                  canChangeSelectedMemberRole={canChangeSelectedMemberRole}
                  selectedMemberRole={selectedMemberRole}
                  roleLabels={MEMBER_ROLE_LABELS}
                />
              </div>

              <ManageMemberContactFields memberForm={memberForm} />

              {selectedMemberRole === "LAB" ? (
                <ManageMemberLabField memberForm={memberForm} />
              ) : null}

              {isSelectedMemberDoctor ? (
                <ManageTeamMemberDoctorPanel
                  member={member}
                  memberForm={memberForm}
                  isManaging={isManaging}
                  isReverifyingDoctor={isReverifyingDoctor}
                  onReverifyDoctor={onReverifyDoctor}
                  getVerificationBadgeVariant={getVerificationBadgeVariant}
                  getVerificationBadgeLabel={getVerificationBadgeLabel}
                  formatDate={formatDate}
                />
              ) : null}

              <ManageMemberCreatedDate
                member={member}
                formatDate={formatDate}
              />

              <DialogFooter className="sm:justify-between">
                <ManageMemberFooter
                  onOpenChange={onOpenChange}
                  isManaging={isManaging}
                  isUpdatingMember={isUpdatingMember}
                  isDeletingMember={isDeletingMember}
                  onRemoveClick={onRemoveClick}
                />
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
