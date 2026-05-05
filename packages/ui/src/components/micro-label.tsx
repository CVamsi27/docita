import * as React from "react";
import { cn } from "../lib/utils";

/**
 * Origin-style all-caps category prefix used above card headlines, modal headers,
 * and right-rail advisor cards. Renders semantic text (defaults to <span>); pass
 * `as="h2"` etc. when the label heads a region.
 */
export interface MicroLabelProps extends React.HTMLAttributes<HTMLElement> {
  as?: "span" | "p" | "h2" | "h3" | "div";
}

export const MicroLabel = React.forwardRef<HTMLElement, MicroLabelProps>(
  function MicroLabel({ as = "span", className, children, ...rest }, ref) {
    const Component = as as React.ElementType;
    return (
      <Component
        ref={ref}
        className={cn(
          "block text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground",
          className,
        )}
        {...rest}
      >
        {children}
      </Component>
    );
  },
) as <T extends HTMLElement = HTMLSpanElement>(
  props: MicroLabelProps & { ref?: React.Ref<T> },
) => React.ReactElement;
