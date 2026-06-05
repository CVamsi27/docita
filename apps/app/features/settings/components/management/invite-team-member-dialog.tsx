"use client";

import type { UseFormReturn } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Form } from "@workspace/ui/components/form/form";

import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { InviteFormValues } from "@/features/settings/components/management/member-management-schemas";
import {
  InviteNameRoleFields,
  InviteContactFields,
  InvitePasswordField,
  InviteDoctorFields,
  InviteLabField,
  InviteDialogFooter,
} from "./invite-team-member-dialog-sections";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<InviteFormValues>;
  selectedRole: InviteFormValues["role"];
  userCanChangeRoles: boolean;
  canInvite: boolean;
  isSaving: boolean;
  onSubmit: (data: InviteFormValues) => void;
}

export function InviteTeamMemberDialog({
  open,
  onOpenChange,
  form,
  selectedRole,
  userCanChangeRoles,
  canInvite,
  isSaving,
  onSubmit,
}: InviteTeamMemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Add a team member to your facility. Doctor and Admin Doctor roles
            require a medical registration number.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, () => {
              showUserFacingErrorToast(
                "Please check the highlighted fields and try again.",
                "Please check the highlighted fields and try again.",
                "form",
              );
            })}
            className="space-y-4"
            noValidate
          >
            <InviteNameRoleFields form={form} userCanChangeRoles={userCanChangeRoles} />
            <InviteContactFields form={form} />
            <InvitePasswordField form={form} />
            {(selectedRole === "DOCTOR" || selectedRole === "ADMIN_DOCTOR") && (
              <InviteDoctorFields form={form} />
            )}
            {selectedRole === "LAB" && <InviteLabField form={form} />}
            <InviteDialogFooter
              onOpenChange={onOpenChange}
              canInvite={canInvite}
              isSaving={isSaving}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
