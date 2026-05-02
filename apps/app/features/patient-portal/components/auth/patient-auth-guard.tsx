"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export function PatientAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/portal/login");
    }
    if (!isLoading && user && user.role !== "PATIENT") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center px-4"
        role="status"
        aria-live="polite"
        aria-label="Loading patient portal"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-10 w-10 text-primary"
        />
      </div>
    );
  }

  if (!user || user.role !== "PATIENT") {
    return null;
  }

  return <>{children}</>;
}
