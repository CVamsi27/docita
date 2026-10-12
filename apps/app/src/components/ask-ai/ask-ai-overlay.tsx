import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { useAskAi } from "./ask-ai-context";

export function AskAiOverlay() {
  const { t } = useTranslation("AiAssistant");
  const { open, scope, closeOverlay } = useAskAi();
  const triggerRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeOverlay();
      }}
    >
      <DialogContent
        showCloseButton
        className="sm:max-w-[480px]"
        onOpenAutoFocus={() => {
          triggerRef.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          // Contextual triggers live outside this Dialog's Radix root.
          event.preventDefault();
          triggerRef.current?.focus();
          triggerRef.current = null;
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles
              className="size-4 shrink-0 text-accent-foreground"
              aria-hidden
            />
            {t("overlay.title")}
          </DialogTitle>
          <DialogDescription>{t("overlay.preview")}</DialogDescription>
        </DialogHeader>
        {scope ? (
          <div className="min-w-0 space-y-2">
            <MicroLabel as="p">{t("overlay.context")}</MicroLabel>
            <Badge
              variant="outline"
              className="max-w-full whitespace-normal break-words bg-accent/10 text-accent-foreground"
            >
              {scope.label}
            </Badge>
          </div>
        ) : null}
        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          {t("overlay.disclaimer")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
