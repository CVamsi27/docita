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

export default function ProfilePage() {
  return <ProfilePageContent />;
}
