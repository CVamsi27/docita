"use client";

import { FC } from "react";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { User } from "@workspace/types";
import { InviteTeamMemberDialog } from "@/features/settings/components/management/invite-team-member-dialog";
import { ManageTeamMemberDialog } from "@/features/settings/components/management/manage-team-member-dialog";
import { formatDateSafe } from "@/lib/formatters";
import {
  getVerificationBadgeVariant,
  getVerificationBadgeLabel,
  MemberManagementLoadingSkeleton,
  MemberListRow,
  MemberCardHeader,
} from "./member-management-helpers";
import { useMemberManagement } from "./use-member-management";

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
  const mgmt = useMemberManagement({ members, clinicId, clinicReferralCode });

  if (isLoading) {
    return (
      <MemberManagementLoadingSkeleton facilityLabel={mgmt.facilityLabel} />
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
      <MemberCardHeader
        facilityLabel={mgmt.facilityLabel}
        clinicReferralCode={mgmt.clinicReferralCode}
        canInvite={mgmt.canInvite}
        onCopyCode={mgmt.handleCopyClinicCode}
        onInvite={() => mgmt.setIsInviteOpen(true)}
      />
      <CardContent>
        {mgmt.sortedMembers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No team members found. Invite your first team member.
          </div>
        ) : (
          <div className="space-y-3">
            {mgmt.sortedMembers.map((member) => (
              <MemberListRow
                key={member.id}
                member={member}
                onManage={mgmt.openMemberDialog}
              />
            ))}
          </div>
        )}
      </CardContent>

      <InviteTeamMemberDialog
        open={mgmt.isInviteOpen}
        onOpenChange={mgmt.setIsInviteOpen}
        form={mgmt.form}
        selectedRole={mgmt.selectedRole}
        userCanChangeRoles={mgmt.userCanChangeRoles}
        canInvite={mgmt.canInvite}
        isSaving={mgmt.isSaving}
        onSubmit={mgmt.onInviteSubmit}
      />

      <ManageTeamMemberDialog
        member={mgmt.selectedMember}
        onOpenChange={(open) => {
          if (!open) mgmt.setSelectedMember(null);
        }}
        memberForm={mgmt.memberForm}
        selectedMemberRole={mgmt.selectedMemberRole}
        memberDialogDescription={mgmt.memberDialogDescription}
        canChangeSelectedMemberRole={mgmt.canChangeSelectedMemberRole}
        isSelectedMemberDoctor={mgmt.isSelectedMemberDoctor}
        isManaging={mgmt.isManaging}
        isUpdatingMember={mgmt.isUpdatingMember}
        isDeletingMember={mgmt.isDeletingMember}
        isReverifyingDoctor={mgmt.isReverifyingDoctor}
        onSave={mgmt.handleSaveMember}
        onRemoveClick={mgmt.handleRemoveMember}
        onReverifyDoctor={mgmt.handleReverifyDoctor}
        getVerificationBadgeVariant={getVerificationBadgeVariant}
        getVerificationBadgeLabel={getVerificationBadgeLabel}
        formatDate={formatDateSafe}
      />
    </Card>
  );
};
