"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  density = "default",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  density?: "compact" | "default" | "spacious";
}) {
  const densityClass =
    density === "compact"
      ? "p-4 md:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-5"
      : density === "spacious"
        ? "p-6 md:p-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-7"
        : "p-5 md:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-6";

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-surface-1 supports-[backdrop-filter]:bg-surface-1/95 supports-[backdrop-filter]:backdrop-blur-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "fixed z-50 flex flex-col gap-5 rounded-t-lg md:rounded-lg border border-border shadow-2xl duration-200",
          densityClass,
          "max-h-[92dvh] overflow-y-auto overscroll-contain",
          "bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2",
          "w-full md:w-[calc(100%-2rem)] md:max-w-lg",
          "data-[state=open]:slide-in-from-bottom md:data-[state=open]:slide-in-from-bottom-0",
          "data-[state=closed]:slide-out-to-bottom md:data-[state=closed]:slide-out-to-bottom-0",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="md:hidden mx-auto -mt-1 mb-1 h-1.5 w-10 rounded-full bg-muted-foreground/30"
        />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            aria-label="Close"
            className={cn(
              "absolute top-3 right-3 md:top-4 md:right-4",
              "inline-flex items-center justify-center rounded-lg",
              "size-9 md:size-8",
              "text-muted-foreground hover:text-foreground",
              "bg-transparent hover:bg-accent/60 active:bg-accent",
              "transition-colors duration-150",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "data-[state=open]:bg-accent/40",
              "disabled:pointer-events-none touch-manipulation",
              "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 md:[&_svg:not([class*='size-'])]:size-4",
            )}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-left pr-10 md:pr-8", className)}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("flex flex-col gap-5 min-w-0", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border/70 pt-4 md:flex-row md:justify-end md:gap-2",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("ui-section-title", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("ui-section-subtitle", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
