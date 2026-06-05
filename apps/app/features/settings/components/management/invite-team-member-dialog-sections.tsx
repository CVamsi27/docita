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
import {
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useLabs } from "@workspace/data-access";
import type { InviteFormValues } from "@/features/settings/components/management/member-management-schemas";

interface InviteNameRoleFieldsProps {
  form: UseFormReturn<InviteFormValues>;
  userCanChangeRoles: boolean;
}

export function InviteNameRoleFields({
  form,
  userCanChangeRoles,
}: InviteNameRoleFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
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
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role</FormLabel>
            <Select
              value={field.value ?? "NURSE"}
              onValueChange={field.onChange}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="NURSE">Nurse</SelectItem>
                <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                <SelectItem value="DOCTOR">Doctor</SelectItem>
                <SelectItem value="LAB">Lab Technician</SelectItem>
                {userCanChangeRoles && (
                  <>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="ADMIN_DOCTOR">Admin Doctor</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface InviteContactFieldsProps {
  form: UseFormReturn<InviteFormValues>;
}

export function InviteContactFields({ form }: InviteContactFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        control={form.control}
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
        control={form.control}
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

interface InvitePasswordFieldProps {
  form: UseFormReturn<InviteFormValues>;
}

export function InvitePasswordField({ form }: InvitePasswordFieldProps) {
  return (
    <FormField
      control={form.control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Temporary password</FormLabel>
          <FormControl>
            <Input
              type="password"
              placeholder="Enter temporary password"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface InviteDoctorFieldsProps {
  form: UseFormReturn<InviteFormValues>;
}

export function InviteDoctorFields({ form }: InviteDoctorFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FormField
        control={form.control}
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
        control={form.control}
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
        control={form.control}
        name="registrationNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Registration #</FormLabel>
            <FormControl>
              <Input placeholder="Registration number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface InviteLabFieldProps {
  form: UseFormReturn<InviteFormValues>;
}

const LAB_UNASSIGNED_VALUE = "__unassigned__";

export function InviteLabField({ form }: InviteLabFieldProps) {
  const { data: labs = [] } = useLabs();
  const activeLabs = labs.filter((lab) => lab.active);

  return (
    <FormField
      control={form.control}
      name="labId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Lab</FormLabel>
          <Select
            value={field.value ?? LAB_UNASSIGNED_VALUE}
            onValueChange={(value) =>
              field.onChange(value === LAB_UNASSIGNED_VALUE ? undefined : value)
            }
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Assign to a lab" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={LAB_UNASSIGNED_VALUE}>
                Unassigned (all clinic orders)
              </SelectItem>
              {activeLabs.map((lab) => (
                <SelectItem key={lab.id} value={lab.id}>
                  {lab.name}
                  {lab.type === "EXTERNAL" ? " (External)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface InviteDialogFooterProps {
  onOpenChange: (open: boolean) => void;
  canInvite: boolean;
  isSaving: boolean;
}

export function InviteDialogFooter({
  onOpenChange,
  canInvite,
  isSaving,
}: InviteDialogFooterProps) {
  return (
    <DialogFooter className="flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="w-full sm:w-auto"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={!canInvite || isSaving}
        className="w-full sm:w-auto"
      >
        {isSaving && (
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="mr-2"
          />
        )}
        Invite Member
      </Button>
    </DialogFooter>
  );
}
