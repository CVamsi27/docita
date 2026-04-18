import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

function Kbd({
  className,
  ...props
}: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.75em] font-medium text-foreground shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
