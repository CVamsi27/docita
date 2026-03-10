"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { API_URL } from "@/lib/api-config";
import { parseApiErrorResponse } from "@/lib/api-error";
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

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  return token ? decodeURIComponent(token) : null;
}

export default function ClinicSelectionPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [clinicCode, setClinicCode] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const canJoin = clinicCode.trim().length > 0 || clinicEmail.trim().length > 0;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login?next=/clinic-selection");
      return;
    }

    if (user.clinicId) {
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

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
    setIsJoining(true);

    try {
      const csrfToken = getCsrfToken();

      const joinResponse = await fetch(`${API_URL}/clinic/join`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
        body: JSON.stringify({
          ...(normalizedCode ? { clinicCode: normalizedCode } : {}),
          ...(normalizedEmail ? { clinicEmail: normalizedEmail } : {}),
        }),
      });

      if (!joinResponse.ok) {
        throw await parseApiErrorResponse(
          joinResponse,
          "Unable to join clinic",
        );
      }

      // Refresh auth cookies so access token includes newly assigned clinicId.
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
        body: JSON.stringify({}),
      });

      if (refreshResponse.ok) {
        const refreshData = (await refreshResponse.json()) as {
          user?: unknown;
        };
        if (refreshData.user) {
          localStorage.setItem("docita_user", JSON.stringify(refreshData.user));
        }
      }

      router.push("/dashboard");
    } catch (error) {
      if (error instanceof Error) {
        setJoinError(error.message);
      } else {
        setJoinError("Unable to join clinic. Please try again.");
      }
    } finally {
      setIsJoining(false);
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
                disabled={isJoining || !canJoin}
              >
                {isJoining ? "Joining..." : "Join Clinic"}
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
