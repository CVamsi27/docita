"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { SocketProvider } from "@/lib/socket-context";
import { TierConfigProvider } from "@/lib/tier-config-context";
import { AppConfigProvider } from "@/lib/app-config-context";
import { ConfirmProvider } from "@/hooks/use-confirm";
import { TooltipProvider } from "@workspace/ui/components/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        <TierConfigProvider>
          <AppConfigProvider>
            <TooltipProvider delayDuration={300}>
              <ConfirmProvider>{children}</ConfirmProvider>
            </TooltipProvider>
          </AppConfigProvider>
        </TierConfigProvider>
      </NextThemesProvider>
    </SocketProvider>
  );
}
