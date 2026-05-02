"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStartConsultation, useQueueByDoctor } from "@/hooks/api/use-appointments";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/auth-context";
import { canAccessTarget } from "@/lib/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import type { UserRole, Feature } from "@workspace/types";
import {
  CommandPaletteShell,
  type CommandPaletteAction,
} from "@workspace/ui/components/command-palette-shell";
import { PlusCircle, Sparkles, Stethoscope } from "lucide-react";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { useAskAi } from "@/features/_shared/components/ask-ai/ask-ai-context";
import {
  AI_ASSISTANT_NAV_ITEM,
  HELP_NAV_ITEM,
  IPD_NAV_ITEM,
  navItems,
  SETTINGS_NAV_ITEM,
  type NavItem,
} from "./nav-config";

const GROUP_NAVIGATION = "Navigation";
const GROUP_ACTIONS = "Actions";
const GROUP_AI = "AI";

export interface QuickAction {
  id: string;
  label: string;
  href?: string;
  kind?: "navigate" | "start-consultation";
  accessTarget?: (typeof APP_ACCESS_TARGETS)[keyof typeof APP_ACCESS_TARGETS];
  keywords?: string[];
  shortcut?: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-patient",
    label: "New patient",
    href: "/patients?action=new",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS,
    keywords: ["create", "add", "register"],
    shortcut: "N P",
  },
  {
    id: "new-appointment",
    label: "New appointment",
    href: "/appointments?action=new",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
    keywords: ["schedule", "book"],
    shortcut: "N A",
  },
  {
    id: "new-invoice",
    label: "New invoice",
    href: "/invoices/new",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVOICES,
    keywords: ["bill", "create"],
    shortcut: "N I",
  },
  {
    id: "start-consultation",
    label: "Start consultation",
    kind: "start-consultation",
    keywords: ["queue", "next patient"],
  },
];

type CanAccessFeatureFn = (feature: Feature) => boolean;

function navItemIsAccessible(
  item: NavItem,
  args: { role: UserRole | undefined; canAccess: CanAccessFeatureFn },
): boolean {
  if (item.feature && !args.canAccess(item.feature)) return false;
  if (!item.accessTarget) return true;
  return canAccessTarget(
    item.accessTarget,
    { role: args.role, canAccessFeature: args.canAccess },
    "read",
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { canStartConsultation } = usePermissions();
  const { canAccess } = usePermissionStore();
  const { openOverlay } = useAskAi();

  const canAccessQueueApi = canAccessTarget(
    APP_ACCESS_TARGETS.API_QUEUE,
    { role: user?.role, canAccessFeature: canAccess },
    "read",
  );
  const startConsultation = useStartConsultation();
  const doctorQueue = useQueueByDoctor(
    canStartConsultation && canAccessQueueApi ? user?.id : undefined,
    undefined,
    open && canStartConsultation && canAccessQueueApi && !!user?.id,
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (e.key === "/") {
        const target = e.target as HTMLElement | null;
        const isEditable =
          !!target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!isEditable) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    const openFromEvent = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener("docita:open-command-palette", openFromEvent);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("docita:open-command-palette", openFromEvent);
    };
  }, []);

  const handleStartConsultation = useCallback(async () => {
    const queueItems = doctorQueue.data ?? [];
    const inProgress = queueItems.find(
      (item) => item.appointmentId && item.status.toUpperCase() === "IN_PROGRESS",
    )?.appointmentId;
    const waiting = queueItems.find(
      (item) => item.appointmentId && item.status.toUpperCase() === "WAITING",
    )?.appointmentId;
    const appointmentId = inProgress ?? waiting;
    if (!appointmentId) {
      router.push("/consultation");
      return;
    }
    try {
      const result = await startConsultation.mutateAsync({ appointmentId });
      router.push(`/consultation/${result.appointmentId}`);
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not open this consultation. Please try again.",
        "save",
      );
      router.push("/consultation");
    }
  }, [doctorQueue.data, router, startConsultation]);

  useEffect(() => {
    const startFromEvent = () => {
      void handleStartConsultation();
    };
    window.addEventListener("docita:start-consultation", startFromEvent);
    return () => {
      window.removeEventListener("docita:start-consultation", startFromEvent);
    };
  }, [handleStartConsultation]);

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const out: CommandPaletteAction[] = [];

    const allNav = [
      ...navItems,
      AI_ASSISTANT_NAV_ITEM,
      IPD_NAV_ITEM,
      SETTINGS_NAV_ITEM,
      HELP_NAV_ITEM,
    ];
    for (const item of allNav) {
      if (!navItemIsAccessible(item, { role: user?.role, canAccess })) continue;
      const Icon = item.icon;
      out.push({
        id: `nav-${item.href}`,
        label: item.label,
        group: GROUP_NAVIGATION,
        icon: <Icon className="size-4" />,
        onRun: () => router.push(item.href),
      });
    }

    out.push({
      id: "ai-ask",
      label: "Ask AI",
      group: GROUP_AI,
      icon: <Sparkles className="size-4" />,
      keywords: ["assistant", "chat", "prompt"],
      shortcut: "⌘J",
      onRun: () => openOverlay(),
    });

    for (const action of QUICK_ACTIONS) {
      if (action.accessTarget) {
        const ok = canAccessTarget(
          action.accessTarget,
          { role: user?.role, canAccessFeature: canAccess },
          "write",
        );
        if (!ok) continue;
      }
      if (action.kind === "start-consultation" && !canStartConsultation) continue;

      out.push({
        id: `action-${action.id}`,
        label: action.label,
        group: GROUP_ACTIONS,
        icon: action.kind === "start-consultation" ? (
          <Stethoscope className="size-4" />
        ) : (
          <PlusCircle className="size-4" />
        ),
        keywords: action.keywords,
        shortcut: action.shortcut,
        onRun: () => {
          if (action.kind === "start-consultation") {
            void handleStartConsultation();
          } else if (action.href) {
            router.push(action.href);
          }
        },
      });
    }

    return out;
  }, [
    canAccess,
    canStartConsultation,
    handleStartConsultation,
    openOverlay,
    router,
    user?.role,
  ]);

  return (
    <CommandPaletteShell
      open={open}
      onOpenChange={setOpen}
      actions={actions}
      placeholder="Enter command"
      groupOrder={[GROUP_NAVIGATION, GROUP_AI, GROUP_ACTIONS]}
    />
  );
}
