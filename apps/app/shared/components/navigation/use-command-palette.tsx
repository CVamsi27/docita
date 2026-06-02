"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStartConsultation, useQueueByDoctor } from "@workspace/data-access";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import type { CommandPaletteAction } from "@workspace/ui/components/overlay/command-palette-shell";
import { Sparkles } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { resolveAskAiScopeFromPathname } from "@/components/ask-ai/resolve-ask-ai-scope-from-pathname";
import { useSidebarNavOrder } from "@/hooks/use-sidebar-nav-order";
import { useClinic } from "@/lib/contexts/clinic-context";
import {
  AI_ASSISTANT_NAV_ITEM,
  HELP_NAV_ITEM,
  IPD_NAV_ITEM,
  navSections,
  SETTINGS_NAV_ITEM,
} from "./nav-config";
import {
  COMMAND_PALETTE_GROUP_ACTIONS,
  COMMAND_PALETTE_GROUP_AI,
  COMMAND_PALETTE_GROUP_NAVIGATION,
  QUICK_ACTIONS,
  navItemIsAccessible,
  quickActionRowIcon,
} from "./command-palette-config";

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { clinicId } = useClinic();
  const { canStartConsultation } = usePermissions();
  const { canAccess, currentTier, currentMode, hasIntelligence } =
    usePermissionStore();
  const { openOverlay } = useAskAi();
  const navOrder = useSidebarNavOrder({
    clinicId,
    userId: user?.id ?? null,
    canEditClinicDefault: false,
  });

  const canAccessQueueApi = canAccessTarget(
    APP_ACCESS_TARGETS.API_QUEUE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      currentTier,
      currentMode,
      hasIntelligence,
    },
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
        const target = e.target instanceof HTMLElement ? e.target : null;
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
      (item) =>
        item.appointmentId && item.status.toUpperCase() === "IN_PROGRESS",
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

    const primaryNavOrdered = navOrder
      .orderSections(navSections)
      .flatMap((s) => s.items);

    const allNav = [
      ...primaryNavOrdered,
      AI_ASSISTANT_NAV_ITEM,
      IPD_NAV_ITEM,
      SETTINGS_NAV_ITEM,
      HELP_NAV_ITEM,
    ];
    for (const item of allNav) {
      if (
        !navItemIsAccessible(item, {
          role: user?.role,
          canAccess,
          currentTier,
          currentMode,
          hasIntelligence,
        })
      )
        continue;
      const Icon = item.icon;
      out.push({
        id: `nav-${item.href}`,
        label: item.label,
        group: COMMAND_PALETTE_GROUP_NAVIGATION,
        icon: <Icon className="size-4" />,
        onRun: () => router.push(item.href),
      });
    }

    out.push({
      id: "ai-ask",
      label: "Ask AI",
      group: COMMAND_PALETTE_GROUP_AI,
      icon: <Sparkles className="size-4" />,
      keywords: ["assistant", "chat", "prompt"],
      shortcut: "⌘J",
      onRun: () => openOverlay(resolveAskAiScopeFromPathname(pathname)),
    });

    for (const action of QUICK_ACTIONS) {
      if (action.accessTarget) {
        const ok = canAccessTarget(
          action.accessTarget,
          {
            role: user?.role,
            canAccessFeature: canAccess,
            currentTier,
            currentMode,
            hasIntelligence,
          },
          action.accessMode ?? "write",
        );
        if (!ok) continue;
      }
      if (action.kind === "start-consultation" && !canStartConsultation)
        continue;

      out.push({
        id: `action-${action.id}`,
        label: action.label,
        group: COMMAND_PALETTE_GROUP_ACTIONS,
        icon: quickActionRowIcon(action),
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
    currentTier,
    currentMode,
    handleStartConsultation,
    hasIntelligence,
    navOrder,
    openOverlay,
    pathname,
    router,
    user?.role,
  ]);

  return {
    open,
    setOpen,
    actions,
    groupOrder: [
      COMMAND_PALETTE_GROUP_NAVIGATION,
      COMMAND_PALETTE_GROUP_AI,
      COMMAND_PALETTE_GROUP_ACTIONS,
    ] as const,
  };
}
