"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

import { SocketProvider } from "@/lib/socket-context"

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
        {children}
      </NextThemesProvider>
    </SocketProvider>
  )
}
