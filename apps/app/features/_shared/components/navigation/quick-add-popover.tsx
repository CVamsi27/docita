"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, FileText, Plus, Stethoscope, UserPlus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Kbd } from "@workspace/ui/components/kbd";
import { canAccessTarget } from "@/lib/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth-context";
import {
  QUICK_ACTIONS,
  type QuickAction,
} from "./command-palette";

const ICONS: Record<string, typeof UserPlus> = {
  "new-patient": UserPlus,
  "new-appointment": Calendar,
  "new-invoice": FileText,
  "start-consultation": Stethoscope,
};

/**
 * Origin-style quick-add popover for the topbar `+` button. Each option
 * is keyboard-reachable and hides itself when the current role lacks
 * access. "Start consultation" delegates to the existing palette
 * handler via a custom window event so we keep a single source of
 * truth for queue-aware routing.
 */
export function QuickAddPopover() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { canAccess, workspaceProfile } = usePermissionStore();

  const handleSelect = useCallback(
    (action: QuickAction) => {
      setOpen(false);
      if (action.kind === "start-consultation") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("docita:start-consultation"));
        }
        return;
      }
      if (action.href) router.push(action.href);
    },
    [router],
  );

  const visibleActions = QUICK_ACTIONS.filter((action) => {
    if (!action.accessTarget) return true;
    return canAccessTarget(
      action.accessTarget,
      { role: user?.role, canAccessFeature: canAccess, workspaceProfile },
      "read",
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quick add"
          data-testid="topbar-quick-add"
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-64 p-1"
        data-testid="quick-add-popover"
      >
        <div className="px-2 py-1.5 text-[var(--fs-2xs)] uppercase tracking-wide text-muted-foreground">
          Quick add
        </div>
        <ul role="menu" className="flex flex-col">
          {visibleActions.map((action) => {
            const Icon = ICONS[action.id] ?? Plus;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  role="menuitem"
                  data-testid={`quick-add-${action.id}`}
                  onClick={() => handleSelect(action)}
                  className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left text-[var(--fs-sm)] transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    {action.label}
                  </span>
                  {action.shortcut ? <Kbd>{action.shortcut}</Kbd> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
