import { useTranslation } from "react-i18next";
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
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import type { JoinRequest } from "./join-requests-list.boundary";

export function JoinRequestReviewDialogs({
  selectedRequest,
  actionType,
  assignedRole,
  setAssignedRole,
  welcomeMessage,
  setWelcomeMessage,
  rejectionReason,
  setRejectionReason,
  isApproving,
  isRejecting,
  onClose,
  onApprove,
  onReject,
}: {
  selectedRequest: JoinRequest | null;
  actionType: "approve" | "reject" | null;
  assignedRole: string;
  setAssignedRole: (value: string) => void;
  welcomeMessage: string;
  setWelcomeMessage: (value: string) => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation("Settings.joinRequestReview");
  return (
    <>
      <Dialog
        open={actionType === "approve"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("approveTitle")}</DialogTitle>
            <DialogDescription>
              {t("approveDescription", { name: selectedRequest?.user.name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("assignedRoleLabel")}</label>
              <Select value={assignedRole} onValueChange={setAssignedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">{t("roleDoctor")}</SelectItem>
                  <SelectItem value="NURSE">{t("roleNurse")}</SelectItem>
                  <SelectItem value="RECEPTIONIST">{t("roleReceptionist")}</SelectItem>
                  <SelectItem value="ADMIN_DOCTOR">{t("roleAdminDoctor")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="ui-helper-text">
                {assignedRole !== selectedRequest?.requestedRole &&
                  t("roleDiffersHelper", { requested: selectedRequest?.requestedRole ?? "" })}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("welcomeMessageLabel")}{" "}
                <span className="text-muted-foreground">{t("optionalSuffix")}</span>
              </label>
              <Textarea
                placeholder={t("welcomeMessagePlaceholder")}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="ui-helper-text text-right">
                {t("charCount", { count: welcomeMessage.length })}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isApproving}>
              {t("cancelButton")}
            </Button>
            <Button onClick={onApprove} disabled={isApproving}>
              {isApproving ? t("approvingLabel") : t("approveRequestButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionType === "reject"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("rejectTitle")}</DialogTitle>
            <DialogDescription>
              {t("rejectDescription", { name: selectedRequest?.user.name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <label className="text-sm font-medium">{t("rejectionReasonLabel")}</label>
            <Textarea
              placeholder={t("rejectionReasonPlaceholder")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="ui-helper-text text-right">
              {t("charCount", { count: rejectionReason.length })}
            </p>
            <p className="ui-helper-text">
              {t("rejectionReasonHelper")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isRejecting}>
              {t("cancelButton")}
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? t("rejectingLabel") : t("rejectRequestButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
