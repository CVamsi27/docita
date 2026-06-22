"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { ChecklistItemDef } from "@/features/guided-tour/config/checklist-items";

export function ChecklistItemRow({
  item,
  done,
}: {
  item: ChecklistItemDef;
  done: boolean;
}) {
  return (
    <li>
      <Link
        href={item.href}
        className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
      >
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
            done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 text-transparent",
          )}
          aria-hidden="true"
        >
          <Check className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block text-sm font-medium",
              done && "text-muted-foreground line-through",
            )}
          >
            {item.label}
          </span>
          <span className="block text-xs text-muted-foreground">
            {item.description}
          </span>
        </span>
      </Link>
    </li>
  );
}
