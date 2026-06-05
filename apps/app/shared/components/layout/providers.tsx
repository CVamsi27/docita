"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { SocketProvider } from "@/lib/contexts/socket-context";
import { AppConfigProvider } from "@/lib/contexts/app-config-context";
import { ConfirmProvider } from "@/hooks/use-confirm";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { DialogStackProvider } from "@workspace/ui/components/overlay/dialog-stack";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";
import { AppearanceController } from "@/components/layout/appearance-controller";

export function Providers({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
      nonce={nonce}
    >
      <AppearanceController />
      <AppConfigProvider>
        <TooltipProvider delayDuration={300}>
          <DialogStackProvider>
            <ConfirmProvider>
              <NavigationHistoryProvider>{children}</NavigationHistoryProvider>
            </ConfirmProvider>
          </DialogStackProvider>
        </TooltipProvider>
      </AppConfigProvider>
    </NextThemesProvider>
  );
}

export function RealtimeProviders({ children }: { children: React.ReactNode }) {
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
