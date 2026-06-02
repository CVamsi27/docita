"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";

interface SectionContainerProps {
  id: string;
  letter: string;
  title: string;
  subtitle?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const SectionContainer = forwardRef<HTMLElement, SectionContainerProps>(
  function SectionContainer(
    { id, letter, title, subtitle, description, children, actions, className },
    ref,
  ) {
    return (
      <section
        ref={ref}
        id={id}
        data-section-id={id}
        aria-labelledby={`${id}-title`}
        className={cn(
          "scroll-mt-24 rounded-[var(--radius)] border border-border/70 bg-background shadow-sm",
          className,
        )}
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5 md:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-sm font-bold text-primary"
              aria-hidden="true"
            >
              {letter}
            </span>
            <div className="min-w-0">
              <h2
                id={`${id}-title`}
                className="text-lg font-semibold leading-tight"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </header>
        <div className="space-y-4 p-4 md:p-5">{children}</div>
      </section>
    );
  },
);
