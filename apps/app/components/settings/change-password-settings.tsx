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
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export function ChangePasswordSettings({ onSuccess }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password validation
  const passwordRequirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[@$!%*?&]/.test(newPassword),
  };

  const isPasswordValid =
    Object.values(passwordRequirements).every((req) => req) &&
    newPassword === confirmPassword;

  const canSubmit =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    isPasswordValid &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Get token from localStorage
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication token not found. Please login again.");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.message || "Failed to change password. Please try again.",
        );
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Password
        </CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800/30 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Password changed successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={loading}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Password Requirements:</p>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded border ${
                    passwordRequirements.length
                      ? "bg-green-500 border-green-600"
                      : "border-muted-foreground"
                  }`}
                />
                <span
                  className={
                    passwordRequirements.length
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  At least 8 characters
                </span>
              </li>
              <li className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded border ${
                    passwordRequirements.uppercase
                      ? "bg-green-500 border-green-600"
                      : "border-muted-foreground"
                  }`}
                />
                <span
                  className={
                    passwordRequirements.uppercase
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  One uppercase letter (A-Z)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded border ${
                    passwordRequirements.lowercase
                      ? "bg-green-500 border-green-600"
                      : "border-muted-foreground"
                  }`}
                />
                <span
                  className={
                    passwordRequirements.lowercase
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  One lowercase letter (a-z)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded border ${
                    passwordRequirements.number
                      ? "bg-green-500 border-green-600"
                      : "border-muted-foreground"
                  }`}
                />
                <span
                  className={
                    passwordRequirements.number
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  One number (0-9)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 rounded border ${
                    passwordRequirements.special
                      ? "bg-green-500 border-green-600"
                      : "border-muted-foreground"
                  }`}
                />
                <span
                  className={
                    passwordRequirements.special
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  One special character (@$!%*?&)
                </span>
              </li>
              {newPassword &&
                confirmPassword &&
                newPassword !== confirmPassword && (
                  <li className="flex items-center gap-2 text-red-600">
                    <div className="h-4 w-4 rounded border border-red-600 flex items-center justify-center">
                      <span className="text-xs">✕</span>
                    </div>
                    Passwords do not match
                  </li>
                )}
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || loading}>
              {loading ? "Changing Password..." : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
