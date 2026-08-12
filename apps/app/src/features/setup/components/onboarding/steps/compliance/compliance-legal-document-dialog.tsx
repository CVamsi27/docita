"use client";

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Progress } from "@workspace/ui/components";

export function ComplianceLegalDocumentDialog({
  open,
  onClose,
  title,
  description,
  content,
  onAgree,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  content: ReactNode;
  onAgree: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateScrollProgress = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(100);
      return;
    }
    setScrollProgress(
      Math.min(100, Math.round((container.scrollTop / maxScroll) * 100)),
    );
  }, []);

  useEffect(() => {
    if (!open) {
      setScrolledToBottom(false);
      setScrollProgress(0);
      return;
    }
    let observer: IntersectionObserver | null = null;
    const timer = setTimeout(() => {
      const container = scrollRef.current;
      const sentinel = sentinelRef.current;
      if (!container || !sentinel) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setScrolledToBottom(true);
        },
        { root: container, threshold: 0 },
      );
      observer.observe(sentinel);
      updateScrollProgress();
    }, 200);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [open, updateScrollProgress]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none p-0 md:h-auto md:max-h-[90dvh] md:max-w-4xl md:rounded-lg">
        <DialogHeader className="shrink-0 border-b bg-muted/25 px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="text-base md:text-lg">
                {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="h-6 px-2.5 text-[var(--fs-2xs)]"
            >
              Required
            </Badge>
          </div>
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center justify-between text-[var(--fs-2xs)] text-muted-foreground">
              <span>Read progress</span>
              <span>{scrollProgress}%</span>
            </div>
            <Progress value={scrollProgress} className="h-1.5" />
          </div>
        </DialogHeader>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6"
          onScroll={updateScrollProgress}
        >
          {content}
          <div ref={sentinelRef} className="h-px" />
        </div>
        {!scrolledToBottom ? (
          <div className="shrink-0 px-4 pb-1 md:px-6">
            <p className="text-xs text-center text-muted-foreground">
              Scroll to the bottom to enable the I Agree button
            </p>
          </div>
        ) : null}
        <DialogFooter className="shrink-0 border-t px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
          <Button
            className="w-full md:w-auto"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            className="w-full md:w-auto"
            onClick={onAgree}
            disabled={!scrolledToBottom}
          >
            I Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
