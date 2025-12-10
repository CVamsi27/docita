"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";

export function LoginLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login" || pathname?.startsWith("/login");
  const isMobileUploadRoute = pathname?.startsWith("/mobile-upload");

  if (isLoginRoute) {
    return (
      <AuthGuard>
        <div className="bg-muted/50 min-h-screen">{children}</div>
      </AuthGuard>
    );
  }

  if (isMobileUploadRoute) {
    return <>{children}</>;
  }

  return <AuthGuard>{children}</AuthGuard>;
}
