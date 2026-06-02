"use client";

import { Button } from "@workspace/ui/components/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import type { JoinClinicSearchResult } from "@/features/onboarding/components/join-clinic-search-results";

export function JoinClinicRequestDialog({
  clinic,
  requestedRole,
  message,
  isSubmitting,
  onOpenChange,
  onRoleChange,
  onMessageChange,
  onSubmit,
}: {
  clinic: JoinClinicSearchResult | null;
  requestedRole: string;
  message: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleChange: (role: string) => void;
  onMessageChange: (message: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog
      open={!!clinic}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request to Join {clinic?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Role</label>
            <Select value={requestedRole} onValueChange={onRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOCTOR">Doctor</SelectItem>
                <SelectItem value="NURSE">Nurse</SelectItem>
                <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                <SelectItem value="ADMIN_DOCTOR">Admin Doctor</SelectItem>
              </SelectContent>
            </Select>
            <p className="ui-helper-text">
              Select the role you will have in this facility
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Message to Admin{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              placeholder="Enter message to admin"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="ui-helper-text text-right">{message.length}/500</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
