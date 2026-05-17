"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ShieldCheck, ShieldX } from "lucide-react";
import { User } from "@workspace/types";
import { getDoctorVerificationPublicNote } from "@/lib/doctor-verification-display";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  MEMBER_ROLE_LABELS,
  type MemberFormValues,
  type MemberRole,
} from "@/features/settings/components/management/member-management-schemas";

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
  const verificationPublicNote = member
    ? getDoctorVerificationPublicNote(
        member.verificationStatus,
        member.verificationReason,
      )
    : null;

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Member Details</DialogTitle>
          <DialogDescription>{memberDialogDescription}</DialogDescription>
        </DialogHeader>
        {member && (
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
                        <Input
                          type="email"
                          placeholder="Email"
                          {...field}
                        />
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

              {isSelectedMemberDoctor && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={memberForm.control}
                      name="specialization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialization</FormLabel>
                          <FormControl>
                            <Input placeholder="Cardiology" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={memberForm.control}
                      name="qualification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qualification</FormLabel>
                          <FormControl>
                            <Input placeholder="Qualification" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={memberForm.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration #</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Registration number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-lg border bg-surface-2 p-3">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={getVerificationBadgeVariant(
                            member.verificationStatus,
                          )}
                        >
                          {member.verificationStatus === "VERIFIED" ? (
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                          ) : (
                            <ShieldX className="mr-1 h-3.5 w-3.5" />
                          )}
                          {getVerificationBadgeLabel(member.verificationStatus)}
                        </Badge>
                        <Badge
                          variant={
                            member.signatureUploadedAt ? "default" : "outline"
                          }
                        >
                          Signature{" "}
                          {member.signatureUploadedAt ? "Ready" : "Missing"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          Last verification:{" "}
                          {formatDate(member.verificationCheckedAt)}
                        </p>
                        <p>
                          Signature uploaded:{" "}
                          {formatDate(member.signatureUploadedAt)}
                        </p>
                        {verificationPublicNote ? (
                          <p>Status details: {verificationPublicNote}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!member.signatureUploadedAt && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href="/verify-doctor">
                              Complete Doctor Verification
                            </Link>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onReverifyDoctor(member.id)}
                          disabled={isManaging}
                        >
                          {isReverifyingDoctor && (
                            <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                          )}
                          Reverify Registration
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

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
                    {isUpdatingMember && (
                      <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onRemoveClick}
                    disabled={isManaging}
                    className="w-full sm:w-auto"
                  >
                    {isDeletingMember && (
                      <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                    )}
                    Remove
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
