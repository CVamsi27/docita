import { forwardRef, type ReactNode } from "react";
import { Check } from "lucide-react";
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
  completed?: boolean;
}

export const SectionContainer = forwardRef<HTMLElement, SectionContainerProps>(
  function SectionContainer(
    {
      id,
      letter,
      title,
      subtitle,
      description,
      children,
      actions,
      className,
      completed = false,
    },
    ref,
  ) {
    return (
      <section
        ref={ref}
        id={id}
        data-section-id={id}
        aria-labelledby={`${id}-title`}
        className={cn(
          "scroll-mt-24 overflow-hidden rounded-[var(--radius-md)] border border-border/60 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]",
          className,
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={cn(
                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors duration-150",
                completed
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-primary/30 bg-primary/8 text-primary",
              )}
              aria-hidden="true"
            >
              {completed ? (
                <Check className="h-4 w-4" />
              ) : (
                letter
              )}
              {completed ? (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-success-foreground ring-2 ring-card">
                  <Check className="h-2 w-2" />
                </span>
              ) : null}
            </span>
            <div className="min-w-0">
              <h2
                id={`${id}-title`}
                className="text-base font-semibold leading-tight text-foreground"
              >
                {title}
                {subtitle ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    · {subtitle}
                  </span>
                ) : null}
              </h2>
              {description ? (
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          ) : null}
        </header>
        <div className="space-y-5 p-4 md:p-5">{children}</div>
      </section>
    );
  },
);
