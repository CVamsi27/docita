import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input bg-background/70 h-11 sm:h-11 w-full min-w-0 rounded-xl border px-4 py-2 text-base shadow-sm transition-[color,box-shadow,border-color,background-color,ring] duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm touch-manipulation",
        "hover:bg-background/85 hover:border-border/80 focus-visible:bg-background focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:bg-destructive/5 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/35",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
