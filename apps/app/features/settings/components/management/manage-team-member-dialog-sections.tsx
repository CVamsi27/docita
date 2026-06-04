"use client";

import type { UseFormReturn } from "react-hook-form";
import {
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
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { User } from "@workspace/types";
import {
  type MemberFormValues,
  type MemberRole,
} from "@/features/settings/components/management/member-management-schemas";

export interface ManageMemberInfoCardProps {
  member: User;
  selectedMemberRole: MemberRole;
  roleLabels: Record<MemberRole, string>;
}

export function ManageMemberInfoCard({
  member,
  selectedMemberRole,
  roleLabels,
}: ManageMemberInfoCardProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 md:col-span-2">
      <p className="text-base font-semibold text-foreground">
        {member.name || "Unknown member"}
      </p>
      <p className="text-sm text-muted-foreground">
        {roleLabels[selectedMemberRole]}
      </p>
    </div>
  );
}

export interface ManageMemberNameRoleFieldsProps {
  memberForm: UseFormReturn<MemberFormValues>;
  canChangeSelectedMemberRole: boolean;
  selectedMemberRole: MemberRole;
  roleLabels: Record<MemberRole, string>;
}

export function ManageMemberNameRoleFields({
  memberForm,
  canChangeSelectedMemberRole,
  selectedMemberRole: _selectedMemberRole,
  roleLabels,
}: ManageMemberNameRoleFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  {roleLabels[field.value]}
                </Badge>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export interface ManageMemberContactFieldsProps {
  memberForm: UseFormReturn<MemberFormValues>;
}

export function ManageMemberContactFields({
  memberForm,
}: ManageMemberContactFieldsProps) {
  return (
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
  );
}

export interface ManageMemberCreatedDateProps {
  member: User;
  formatDate: (value?: string | Date) => string;
}

export function ManageMemberCreatedDate({
  member,
  formatDate,
}: ManageMemberCreatedDateProps) {
  return (
    <div>
      <p className="text-muted-foreground">Created</p>
      <p className="font-medium">{formatDate(member.createdAt)}</p>
    </div>
  );
}

export interface ManageMemberFooterProps {
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
  return (
    <>
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
    </>
  );
}
