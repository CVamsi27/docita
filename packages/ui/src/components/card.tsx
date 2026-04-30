import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@workspace/ui/lib/utils";

const cardVariants = cva(
  "ui-card-surface flex flex-col gap-4 py-4 sm:gap-5 sm:py-5",
  {
    variants: {
      interaction: {
        static: "transition-colors duration-150",
        interactive:
          "cursor-pointer transition-[background-color,border-color,box-shadow] duration-150 hover:bg-surface-2 hover:border-border/80 hover:shadow-md",
      },
      density: {
        compact: "gap-3 py-3 sm:py-4",
        default: "",
        spacious: "gap-5 sm:gap-6 py-5 sm:py-6",
      },
    },
    defaultVariants: {
      interaction: "static",
      density: "default",
    },
  },
);

function Card({
  className,
  interaction,
  density,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ interaction, density, className }))}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 sm:gap-2 px-4 sm:px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:border-border/60 [.border-b]:pb-4 sm:[.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("ui-section-title", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("ui-helper-text", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 sm:px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-4 sm:px-6 [.border-t]:pt-4 sm:[.border-t]:pt-6",
        className,
      )}
      {...props}
    />
  );
}

function InteractiveCard({ className, ...props }: React.ComponentProps<"div">) {
  return <Card interaction="interactive" className={className} {...props} />;
}

export {
  Card,
  cardVariants,
  InteractiveCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
