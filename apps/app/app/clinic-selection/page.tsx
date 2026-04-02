"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader2 } from "lucide-react";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { apiFetch } from "@/lib/api-client";

export default function ClinicSelectionPage() {
  const { user, isLoading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [clinicCode, setClinicCode] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [joinError, setJoinError] = useState("");
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  const canJoin = clinicCode.trim().length > 0 || clinicEmail.trim().length > 0;

  const joinClinicMutation = useMutation({
    mutationFn: async (payload: {
      clinicCode?: string;
      clinicEmail?: string;
    }) => {
      await apiFetch<unknown>("/clinic/join", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      let refreshedUser: unknown | null = null;
      try {
        const refreshResponse = await apiFetch<{ user?: unknown }>(
          "/auth/refresh",
          {
            method: "POST",
            body: JSON.stringify({}),
          },
        );
        refreshedUser = refreshResponse.user ?? null;
      } catch {
        refreshedUser = null;
      }

      return refreshedUser;
    },
  });

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setRedirectMessage("Taking you to login...");
      router.replace("/login?next=/clinic-selection");
      return;
    }

    if (user.clinicId) {
      setRedirectMessage("Your clinic is already linked. Redirecting to dashboard...");
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

  if (redirectMessage) {
    return (
      <PageTransitionLoader
        title="Redirecting..."
        description={redirectMessage}
      />
    );
  }

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-background px-4 py-12">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your clinic options...
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const joinClinic = async () => {
    const normalizedCode = clinicCode.trim();
    const normalizedEmail = clinicEmail.trim();

    if (!normalizedCode && !normalizedEmail) {
      setJoinError("Enter clinic code or clinic email to continue.");
      return;
    }

    setJoinError("");

    try {
      const refreshedUser = await joinClinicMutation.mutateAsync({
        ...(normalizedCode ? { clinicCode: normalizedCode } : {}),
        ...(normalizedEmail ? { clinicEmail: normalizedEmail } : {}),
      });

      if (refreshedUser) {
        localStorage.setItem("docita_user", JSON.stringify(refreshedUser));
      }
      await refreshUser();

      setRedirectMessage("Clinic linked successfully. Taking you to dashboard...");
      router.replace("/dashboard");
    } catch (error) {
      if (error instanceof Error) {
        setJoinError(error.message);
      } else {
        setJoinError("Unable to join clinic. Please try again.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Clinic Path</CardTitle>
            <CardDescription>
              {user?.name
                ? `Welcome ${user.name}. Your account is ready, but it is not linked to a clinic yet.`
                : "Your account is ready, but it is not linked to a clinic yet."}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create a New Clinic</CardTitle>
              <CardDescription>
                Start onboarding, accept SLA, and finish clinic setup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/onboarding">Continue to Onboarding</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join an Existing Clinic</CardTitle>
              <CardDescription>
                Enter your clinic code or clinic email to link your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="clinic-code">Clinic Code</Label>
                <Input
                  id="clinic-code"
                  placeholder="e.g. DOCITA123"
                  value={clinicCode}
                  onChange={(event) => setClinicCode(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic-email">Clinic Email</Label>
                <Input
                  id="clinic-email"
                  type="email"
                  placeholder="clinic@example.com"
                  value={clinicEmail}
                  onChange={(event) => setClinicEmail(event.target.value)}
                />
              </div>

              {joinError ? (
                <p className="text-sm text-destructive">{joinError}</p>
              ) : null}

              <Button
                className="w-full"
                onClick={joinClinic}
                disabled={joinClinicMutation.isPending || !canJoin}
              >
                {joinClinicMutation.isPending ? "Joining..." : "Join Clinic"}
              </Button>

              <Button variant="outline" className="w-full" onClick={logout}>
                Sign Out Instead
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
