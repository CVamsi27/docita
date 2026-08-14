import type { ReactNode } from "react";
import { ToasterWrapper } from "@workspace/ui/components";
import { AppConfigProvider } from "@/lib/contexts/app-config-provider";
import { ConfirmProvider } from "@/hooks/confirm-provider";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { DialogStackProvider } from "@workspace/ui/components/overlay/dialog-stack";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";
import { AskAiProvider } from "@/components/ask-ai/ask-ai-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppConfigProvider>
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
      <ToasterWrapper />
    </AppConfigProvider>
  );
}