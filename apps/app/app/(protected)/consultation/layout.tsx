"use client";

import { AuthGuard } from "@/components/auth/auth-guard";

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
