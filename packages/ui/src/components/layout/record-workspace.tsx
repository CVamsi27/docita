"use client";

import type { ReactNode, RefObject } from "react";
import { useMediaQuery } from "@workspace/hooks";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/overlay/sheet";

interface RecordWorkspaceProps {
  children: ReactNode;
  context: ReactNode;
  contextTitle: string;
  contextDescription: string;
  summary?: ReactNode;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

/** Shared worklist composition: desktop context, narrow-screen record preview. */
export function RecordWorkspace({
  children,
  context,
  contextTitle,
  contextDescription,
  summary,
  previewOpen,
  onPreviewOpenChange,
  returnFocusRef,
}: RecordWorkspaceProps) {
  const wide = useMediaQuery("(min-width: 1280px)");

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
      <div className="min-w-0 space-y-6">
        {!wide ? summary : null}
        {children}
      </div>
      {wide ? (
        <aside
          aria-label={contextTitle}
          className="min-w-0 self-start border-l border-border/70 pl-6"
        >
          <h2 className="mb-5 text-sm font-medium text-muted-foreground">
            {contextTitle}
          </h2>
          {context}
        </aside>
      ) : (
        <Sheet open={previewOpen} onOpenChange={onPreviewOpenChange}>
          <SheetContent
            className="w-full sm:max-w-md"
            onCloseAutoFocus={(event) => {
              if (returnFocusRef.current?.isConnected) {
                event.preventDefault();
                returnFocusRef.current.focus();
              }
            }}
          >
            <SheetHeader className="border-b border-border/70 pr-12">
              <SheetTitle>{contextTitle}</SheetTitle>
              <SheetDescription>{contextDescription}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 overflow-y-auto px-4 pb-6">{context}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
