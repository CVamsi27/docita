"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { UseFormReturn } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Form,
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
import { Badge } from "@workspace/ui/components/indicators/badge";
import { User } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  MEMBER_ROLE_LABELS,
  type MemberFormValues,
  type MemberRole,
} from "@/features/settings/components/management/member-management-schemas";
import { ManageTeamMemberDoctorPanel } from "./manage-team-member-doctor-panel";

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
          <DialogTitle>Member Details</DialogTitle>
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
                <div className="rounded-lg border bg-muted/20 p-3 md:col-span-2">
                  <p className="text-base font-semibold text-foreground">
                    {member.name || "Unknown member"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {MEMBER_ROLE_LABELS[selectedMemberRole]}
                  </p>
                </div>
                <FormField
                  control={memberForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
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
                      <FormLabel>Role</FormLabel>
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
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="ADMIN_DOCTOR">
                              Admin Doctor
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-10 items-center rounded-md border bg-muted/20 px-3">
                          <Badge variant="outline">
                            {MEMBER_ROLE_LABELS[field.value]}
                          </Badge>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={memberForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={memberForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(member.createdAt)}</p>
              </div>

              <DialogFooter className="sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isManaging}
                  className="w-full sm:w-auto"
                >
                  Close
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
                    Save Changes
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
                    Remove
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
