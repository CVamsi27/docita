"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { SocketProvider } from "@/lib/socket-context";
import { TierConfigProvider } from "@/lib/tier-config-context";
import { AppConfigProvider } from "@/lib/app-config-context";
import { ConfirmProvider } from "@/hooks/use-confirm";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { DialogStackProvider } from "@workspace/ui/components/dialog-stack";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";
import { AppearanceController } from "@/features/_shared/components/layout/appearance-controller";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <AppearanceController />
      <TierConfigProvider>
        <AppConfigProvider>
          <TooltipProvider delayDuration={300}>
            <DialogStackProvider>
              <ConfirmProvider>
                <NavigationHistoryProvider>{children}</NavigationHistoryProvider>
              </ConfirmProvider>
            </DialogStackProvider>
          </TooltipProvider>
        </AppConfigProvider>
      </TierConfigProvider>
    </NextThemesProvider>
  );
}

export function RealtimeProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const enabled = [
    "/dashboard",
    "/consultation",
    "/hospital",
    "/settings",
    "/whatsapp",
  ].some((prefix) => pathname?.startsWith(prefix));

  return <SocketProvider enabled={enabled}>{children}</SocketProvider>;
}
