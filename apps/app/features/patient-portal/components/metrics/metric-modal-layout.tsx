"use client";

import type { FormEvent, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";

interface MetricModalLayoutProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  handleSubmit: (e: FormEvent) => void;
  children: ReactNode;
}

export function MetricModalLayout({
  open,
  onClose,
  title,
  description,
  handleSubmit,
  children,
}: MetricModalLayoutProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {children}
        </form>
      </DialogContent>
    </Dialog>
  );
}
