import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components";

interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Body content rendered between the header and the footer. */
  children?: ReactNode;
  /** Footer content — typically the action buttons. */
  footer: ReactNode;
}

/**
 * Shared chrome for the confirm/prompt/alert dialogs: title row with optional
 * icon, description, body slot, and footer. Keeps the three dialogs consistent
 * (no close button, matching header layout) without repeating the Dialog tree.
 */
export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
}: DialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription>{description || ""}</DialogDescription>
        </DialogHeader>

        {children}

        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
