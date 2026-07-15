"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useAuth } from "@/lib/auth/auth-context";

export function LabAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/lab-portal/login");
    }
    if (!isLoading && user && user.role !== "LAB") {
      router.replace("/today");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center px-4"
        role="status"
        aria-live="polite"
        aria-label="Loading lab portal"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-10 w-10 text-primary"
        />
      </div>
    );
  }

  if (!user || user.role !== "LAB") return null;

  return <>{children}</>;
}
