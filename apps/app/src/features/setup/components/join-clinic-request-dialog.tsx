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
} from "@workspace/ui/components/overlay/dialog";
import type { JoinClinicSearchResult } from "@/features/setup/components/join-clinic-search-results";

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
  const { t } = useTranslation("Onboarding");
  return (
    <Dialog
      open={!!clinic}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t("joinClinicRequest.title", { name: clinic?.name ?? "" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("joinClinicRequest.roleLabel")}
            </label>
            <Select value={requestedRole} onValueChange={onRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOCTOR">
                  {t("joinClinicRequest.roleDoctor")}
                </SelectItem>
                <SelectItem value="NURSE">
                  {t("joinClinicRequest.roleNurse")}
                </SelectItem>
                <SelectItem value="RECEPTIONIST">
                  {t("joinClinicRequest.roleReceptionist")}
                </SelectItem>
                <SelectItem value="ADMIN_DOCTOR">
                  {t("joinClinicRequest.roleAdminDoctor")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="ui-helper-text">{t("joinClinicRequest.roleHelper")}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("joinClinicRequest.messageLabel")}{" "}
              <span className="text-muted-foreground">
                {t("joinClinicRequest.optionalSuffix")}
              </span>
            </label>
            <Textarea
              placeholder={t("joinClinicRequest.messagePlaceholder")}
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <p className="ui-helper-text text-right">
              {t("joinClinicRequest.charCount", { count: message.length })}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("joinClinicRequest.cancelButton")}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? t("joinClinicRequest.submittingLabel")
              : t("joinClinicRequest.submitButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
