"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { SocketProvider } from "@/lib/socket-context";
import { TierConfigProvider } from "@/lib/tier-config-context";
import { AppConfigProvider } from "@/lib/app-config-context";
import { ConfirmProvider } from "@/hooks/use-confirm";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        <TierConfigProvider>
          <AppConfigProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </AppConfigProvider>
        </TierConfigProvider>
      </NextThemesProvider>
    </SocketProvider>
  );
}
