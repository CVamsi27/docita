"use client";

import { useAuth } from "@workspace/auth";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function PatientAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/login?returnTo=/portal");
    }
    if (!isLoading && user && user.role !== "PATIENT") {
      redirect("/dashboard"); 
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "PATIENT") {
    return null;
  }

  return <>{children}</>;
}
