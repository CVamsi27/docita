import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@workspace/ui/components";
import { useAuth } from "@/lib/auth/auth-context";
import { useUpdateProfile } from "@workspace/data-access";
import { toast } from "sonner";
import { ChangePasswordSettings } from "@/features/settings/components/security/ChangePasswordSettings";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

/**
 * Account profile (name + email + password). Lives in Settings → Account (M4):
 * the standalone `/profile` page was a near-orphaned single screen, so its
 * content now sits with the other account tabs. `/profile` redirects here.
 */
export function ProfileAccountSettings() {
  const { t } = useTranslation("Settings");
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const updateProfileMutation = useUpdateProfile();

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleSaveChanges = async () => {
    if (!formData.name.trim()) {
      showUserFacingErrorToast(t("account.nameRequired"));
      return;
    }

    try {
      setIsSaving(true);
      await updateProfileMutation.mutateAsync({
        name: formData.name,
      });
      toast.success(t("account.profileUpdated"));
    } catch {
      showUserFacingErrorToast(t("account.profileUpdateError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("account.personalInformation")}</CardTitle>
          <CardDescription>{t("account.personalInformationDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("account.fullName")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder={t("account.fullNamePlaceholder")}
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t("account.email")}</Label>
            <Input id="email" value={user?.email || ""} disabled />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving || updateProfileMutation.isPending}
            >
              {isSaving || updateProfileMutation.isPending
                ? t("account.saving")
                : t("account.saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordSettings />
    </div>
  );
}
