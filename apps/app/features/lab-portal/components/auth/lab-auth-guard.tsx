"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

  if (isLoading) return null;
  if (!user || user.role !== "LAB") return null;

  return <>{children}</>;
}
