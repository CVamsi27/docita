import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@workspace/ui/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-sm hover:shadow-md hover:bg-foreground/92 active:bg-foreground/86",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:bg-primary/80",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 active:bg-destructive/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-border/70 bg-background/70 shadow-xs hover:bg-accent/60 hover:text-foreground active:bg-accent/75 dark:bg-input/20 dark:border-input/70 dark:hover:bg-input/35",
        secondary:
          "bg-secondary/70 text-foreground shadow-xs hover:bg-secondary/85 active:bg-secondary/75",
        ghost:
          "hover:bg-muted/60 hover:text-foreground active:bg-muted/75 dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 sm:h-11 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 sm:h-9 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 sm:h-12 rounded-xl px-8 has-[>svg]:px-6 text-base",
        pill: "h-12 sm:h-12 rounded-full px-10 text-base tracking-wide",
        icon: "size-10 sm:size-11",
        "icon-sm": "size-9 sm:size-9",
        "icon-lg": "size-12 sm:size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

type ButtonProps = React.ComponentProps<typeof Button>;

export { Button, buttonVariants };
export type { ButtonProps };
