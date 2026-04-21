"use client";

import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface FormPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  stickyFooter?: boolean;
  noValidate?: boolean;
}

export function FormPage({
  title,
  description,
  actions,
  footer,
  children,
  className,
  onSubmit,
  stickyFooter = true,
  noValidate = true,
}: FormPageProps) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate={noValidate}
      className={cn("flex min-w-0 flex-col gap-6", className)}
    >
      {(title || description || actions) && (
        <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 ui-copy-stack">
            {title ? <h1 className="ui-page-title">{title}</h1> : null}
            {description ? (
              <p className="max-w-2xl ui-page-subtitle">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </header>
      )}
      <div className="min-w-0 space-y-6">{children}</div>
      {footer ? (
        <footer
          className={cn(
            "flex flex-wrap items-center justify-end gap-2 border-t border-border/60 bg-background/95 py-3",
            stickyFooter &&
              "sticky bottom-0 z-10 -mx-4 px-4 backdrop-blur md:-mx-6 md:px-6",
          )}
        >
          {footer}
        </footer>
      ) : null}
    </form>
  );
}
