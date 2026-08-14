import { Card, CardContent, DataState } from "@workspace/ui/components";
import { User } from "@workspace/types";
import { InviteTeamMemberDialog } from "@/features/settings/components/management/invite-team-member-dialog";
import { ManageTeamMemberDialog } from "@/features/settings/components/management/manage-team-member-dialog";
import { formatDateSafe } from "@/lib/formatters";
import { MemberManagementLoadingSkeleton, MemberListRow, MemberCardHeader } from "./member-management-helpers";
import { getVerificationBadgeVariant, getVerificationBadgeLabel } from "./member-verification-badge";
import { useMemberManagement } from "./use-member-management";

interface MemberManagementUIProps {
  members: User[];
  isLoading: boolean;
  error: Error | null;
  clinicId?: string;
  clinicReferralCode?: string | null;
}

export function MemberManagementUI({
  members,
  isLoading,
  error,
  clinicId,
  clinicReferralCode,
}: MemberManagementUIProps) {
  const mgmt = useMemberManagement({ members, clinicId, clinicReferralCode });

  if (isLoading) {
    return (
      <MemberManagementLoadingSkeleton facilityLabel={mgmt.facilityLabel} />
    );
  }

  if (error) return (
      <DataState
        status="error"
        errorMessage="We could not load your team members. Please try again."
        className="min-h-[30vh]"
      />
    );

  return (
    <Card>
      <MemberCardHeader
        facilityLabel={mgmt.facilityLabel}
        clinicReferralCode={mgmt.clinicReferralCode}
        canInvite={mgmt.canInvite}
        onCopyCode={mgmt.handleCopyClinicCode}
        onInvite={() => mgmt.setIsInviteOpen(true)}
      />
      <CardContent className="pt-5">
        {mgmt.sortedMembers.length === 0 ? (
          <div className="rounded-[calc(var(--radius)-4px)] border border-dashed border-border/70 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
            No team members yet. Invite your first one.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
}
