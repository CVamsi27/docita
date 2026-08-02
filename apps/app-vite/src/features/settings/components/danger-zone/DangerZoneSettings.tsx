import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Label, Textarea } from "@workspace/ui/components";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { AlertCircle, LogOut, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/auth-context";
import { useConfirm } from "@/hooks/use-confirm";
import { useRequestStaffAccountDeletion } from "@workspace/data-access";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function DangerZoneSettings() {
  const { t } = useTranslation("Patients.dangerZone");
  const { logout } = useAuth();
  const { confirm } = useConfirm();
  const requestDeletion = useRequestStaffAccountDeletion();
  const [deletionReason, setDeletionReason] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState(false);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: t("signOutConfirmTitle"),
      description: t("signOutConfirmDescription"),
      confirmText: t("signOutConfirmAction"),
      cancelText: t("cancelAction"),
    });
    if (confirmed) {
      await logout();
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletionReason.trim()) {
      showUserFacingErrorToast(t("reasonMissing"));
      return;
    }

    if (!confirmDeletion) {
      showUserFacingErrorToast(t("confirmMissing"));
      return;
    }

    try {
      await requestDeletion.mutateAsync({
        reason: deletionReason,
        confirmDeletion: true,
      });

      toast.success(t("successToast"));
      setDeletionReason("");
      setConfirmDeletion(false);
    } catch (_error) {
      showUserFacingErrorToast(t("errorFallback"));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-destructive/30">
        <CardHeader className="border-b border-destructive/20 pb-5">
          <CardTitle className="text-destructive">{t("signOutTitle")}</CardTitle>
          <CardDescription>
            {t("signOutDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive transition-colors duration-150 hover:border-destructive/60 hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("signOutButton")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="border-b border-destructive/20 pb-5">
          <CardTitle className="text-destructive">{t("deleteTitle")}</CardTitle>
          <CardDescription>
            {t("deleteDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-5">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("warningTitle")}</AlertTitle>
            <AlertDescription>
              {t("warningBody")}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="staff-deletion-reason">
              {t("reasonLabel")}
            </Label>
            <Textarea
              id="staff-deletion-reason"
              placeholder={t("reasonPlaceholder")}
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
              {t("confirmCheckbox")}
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
              {requestDeletion.isPending ? t("deletingButton") : t("deleteButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
