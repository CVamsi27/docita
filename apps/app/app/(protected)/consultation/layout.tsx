"use client";

import { AuthGuard } from "@/features/_shared/components/auth/auth-guard";

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
