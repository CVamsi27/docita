"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";

export function LoginLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login" || pathname?.startsWith("/login");

  if (isLoginRoute) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
          {children}
        </div>
      </AuthGuard>
    );
  }

  // For protected and other routes, just return children (they'll be wrapped by their own layouts)
  return <AuthGuard>{children}</AuthGuard>;
}
