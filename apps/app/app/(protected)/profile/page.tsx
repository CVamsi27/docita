"use client";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useAuth } from "@/lib/auth-context";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";
import { ChangePasswordSettings } from "@/components/settings/change-password-settings";

export default function ProfilePage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || "Doctor",
  });
  const [isSaving, setIsSaving] = useState(false);
  const updateProfileMutation = apiHooks.useUpdateProfile();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleSaveChanges = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      setIsSaving(true);
      await updateProfileMutation.mutateAsync({
        name: formData.name,
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Your name"
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || "admin@docita.com"}
              disabled
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving || updateProfileMutation.isPending}
            >
              {isSaving || updateProfileMutation.isPending
                ? "Saving..."
                : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordSettings />
    </div>
  );
}
