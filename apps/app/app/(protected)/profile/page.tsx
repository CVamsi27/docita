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
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { useAuth } from "@/lib/auth/auth-context";
import { useUpdateProfile } from "@/hooks/api/use-settings";
import { toast } from "sonner";
import { ChangePasswordSettings } from "@/features/settings/components";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export default function ProfilePage() {
  return <ProfilePageContent />;
}
