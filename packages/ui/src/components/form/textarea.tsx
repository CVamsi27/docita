import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-background/70 placeholder:text-muted-foreground flex field-sizing-content min-h-20 sm:min-h-16 w-full rounded-xl border px-4 py-3 sm:py-2.5 text-base shadow-sm transition-[color,box-shadow,border-color,background-color] duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm touch-manipulation",
        "hover:bg-background/85 hover:border-border/80 focus-visible:bg-background focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:bg-destructive/5 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/35",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
