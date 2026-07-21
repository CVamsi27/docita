"use client";

// jscpd:ignore-start
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Textarea
} from "@workspace/ui/components";
import {
  Alert,
// jscpd:ignore-end
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
    <div className="flex flex-col gap-6">
      <Card className="border-destructive/30">
        <CardHeader className="border-b border-destructive/20 pb-5">
          <CardTitle className="text-destructive">Sign out</CardTitle>
          <CardDescription>
            Sign out of your Docita account on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive transition-colors duration-150 hover:border-destructive/60 hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="border-b border-destructive/20 pb-5">
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            Request permanent closure of your staff account and removal of
            personal data associated with it, subject to legal and clinical
            retention requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-5">
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
              I understand this will remove my access and request deletion of my
              personal data where permitted.
            </Label>
          </div>

          <div className="flex justify-end border-t border-destructive/20 pt-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
