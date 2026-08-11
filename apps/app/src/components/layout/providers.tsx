import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AppConfigProvider } from "@/lib/contexts/app-config-context";
import { ConfirmProvider } from "@/hooks/use-confirm";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { DialogStackProvider } from "@workspace/ui/components/overlay/dialog-stack";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";
import { AskAiProvider } from "@/components/ask-ai/ask-ai-context";
import { ThemeProvider } from "@/components/layout/theme-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppConfigProvider>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>
          <DialogStackProvider>
            <ConfirmProvider>
              <NavigationHistoryProvider>
                <AskAiProvider>
                  {children}
                </AskAiProvider>
              </NavigationHistoryProvider>
            </ConfirmProvider>
          </DialogStackProvider>
        </TooltipProvider>
      </ThemeProvider>
      <Toaster
        richColors
        position="top-right"
        duration={4000}
        toastOptions={{
          classNames: {
            toast: "rounded-xl border shadow-lg",
            description: "text-sm",
          },
        }}
      />
    </AppConfigProvider>
  );
}