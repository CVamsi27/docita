"use client";
import { useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { useAuth } from "@/lib/auth/auth-context";
import { useUpdateProfile } from "@workspace/data-access";
import { toast } from "sonner";
import { ChangePasswordSettings } from "@/features/settings/components";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function ProfilePageContent() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const updateProfileMutation = useUpdateProfile();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleSaveChanges = async () => {
    if (!formData.name.trim()) {
      showUserFacingErrorToast("Enter your name before saving");
      return;
    }

    try {
      setIsSaving(true);
      await updateProfileMutation.mutateAsync({
        name: formData.name,
      });
      toast.success("Profile updated successfully");
    } catch {
      showUserFacingErrorToast(
        "We could not save your profile changes. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppPageScaffold
      className="max-w-3xl"
      header={
        <PageHeader
          title="Profile"
          description="Manage your account settings and preferences."
        />
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Full name"
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || "admin@docita.work"}
              disabled
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving || updateProfileMutation.isPending}
            >
              {isSaving || updateProfileMutation.isPending
                ? "Saving…"
                : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordSettings />
    </AppPageScaffold>
  );
}
