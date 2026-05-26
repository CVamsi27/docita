"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { AlertCircle, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useConfirm } from "@/hooks/use-confirm";
import { useRequestStaffAccountDeletion } from "@workspace/data-access";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function DangerZoneSettings() {
  const { logout } = useAuth();
  const { confirm } = useConfirm();
  const requestDeletion = useRequestStaffAccountDeletion();
  const [deletionReason, setDeletionReason] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState(false);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Sign out",
      description: "Are you sure you want to sign out of your account?",
      confirmText: "Sign out",
      cancelText: "Cancel",
    });
    if (confirmed) {
      logout();
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletionReason.trim()) {
      showUserFacingErrorToast(
        "Tell us why you want to delete your account before continuing",
      );
      return;
    }

    if (!confirmDeletion) {
      showUserFacingErrorToast(
        "Please confirm that you want to delete your account before submitting",
      );
      return;
    }

    try {
      await requestDeletion.mutateAsync({
        reason: deletionReason,
        confirmDeletion: true,
      });

      toast.success(
        "Account deletion requested. Your account will be processed within 30 days.",
      );
      setDeletionReason("");
      setConfirmDeletion(false);
    } catch (_error) {
      showUserFacingErrorToast(
        "We could not submit this deletion request. Please try again.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Sign out</CardTitle>
          <CardDescription>
            Sign out of your Docita account on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60 transition-colors duration-150"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">
            Delete account
          </CardTitle>
          <CardDescription>
            Request permanent closure of your staff account and removal of
            personal data associated with it, subject to legal and clinical
            retention requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This starts an irreversible process for your login access. Some
              clinical records may need to be retained where the law requires.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="staff-deletion-reason">
              Reason for deletion (required)
            </Label>
            <Textarea
              id="staff-deletion-reason"
              placeholder="Enter deletion reason"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="staff-confirm-deletion"
              checked={confirmDeletion}
              onCheckedChange={(checked) => setConfirmDeletion(!!checked)}
              className="mt-0.5"
            />
            <Label
              htmlFor="staff-confirm-deletion"
              className="text-sm font-normal leading-snug"
            >
              I understand this will remove my access and request deletion of
              my personal data where permitted.
            </Label>
          </div>

          <Button
            variant="destructive"
            className="transition-colors duration-150"
            onClick={handleDeleteAccount}
            disabled={
              requestDeletion.isPending || !deletionReason || !confirmDeletion
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {requestDeletion.isPending ? "Submitting…" : "Delete my account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
