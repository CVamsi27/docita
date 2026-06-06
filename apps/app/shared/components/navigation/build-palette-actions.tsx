import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { CommandPaletteAction } from "@workspace/ui/components/overlay/command-palette-shell";
import { Sparkles } from "lucide-react";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { resolveAskAiScopeFromPathname } from "@/components/ask-ai/resolve-ask-ai-scope-from-pathname";
import type { AskAiScope } from "@/components/ask-ai/ask-ai-context";
import {
  COMMAND_PALETTE_GROUP_ACTIONS,
  COMMAND_PALETTE_GROUP_AI,
  COMMAND_PALETTE_GROUP_NAVIGATION,
  QUICK_ACTIONS,
  navItemIsAccessible,
  quickActionRowIcon,
} from "./command-palette-config";
import type { Feature, PlanMode, Tier } from "@workspace/types/billing";
import type { UserRole } from "@workspace/types/shared";
import {
  AI_ASSISTANT_NAV_ITEM,
  HELP_NAV_ITEM,
  IPD_NAV_ITEM,
  SETTINGS_NAV_ITEM,
  navSections,
  type NavItem,
  type NavSection,
} from "./nav-config";

type Acl = {
  role: UserRole | undefined;
  canAccess: (feature: Feature) => boolean;
  currentTier: Tier;
  currentMode: PlanMode;
  hasIntelligence: boolean;
};

type PaletteNavOrder = {
  orderSections(sections: readonly NavSection[]): Array<{
    items: readonly NavItem[];
  }>;
};

interface BuildPaletteActionsParams {
  navOrder: PaletteNavOrder;
  userRole: UserRole | undefined;
  canAccess: (feature: Feature) => boolean;
  currentTier: Tier;
  currentMode: PlanMode;
  hasIntelligence: boolean;
  canStartConsultation: boolean;
  router: AppRouterInstance;
  openOverlay: (scope?: AskAiScope) => void;
  pathname: string;
  handleStartConsultation: () => void;
}

function buildNavActions(
  navOrder: PaletteNavOrder,
  acl: Acl,
  router: AppRouterInstance,
): CommandPaletteAction[] {
  const ordered = navOrder.orderSections(navSections).flatMap((s) => s.items);
  const allNav = [
    ...ordered,
    AI_ASSISTANT_NAV_ITEM,
    IPD_NAV_ITEM,
    SETTINGS_NAV_ITEM,
    HELP_NAV_ITEM,
  ];
  return allNav
    .filter((item) => navItemIsAccessible(item, acl))
    .map((item) => {
      const Icon = item.icon;
      return {
        id: `nav-${item.href}`,
        label: item.label,
        group: COMMAND_PALETTE_GROUP_NAVIGATION,
        icon: <Icon className="size-4" />,
        onRun: () => router.push(item.href),
      } satisfies CommandPaletteAction;
    });
}

function buildQuickActions(
  acl: Acl & { canStartConsultation: boolean },
  router: AppRouterInstance,
  handleStartConsultation: () => void,
): CommandPaletteAction[] {
  const targetAcl = {
    role: acl.role,
    canAccessFeature: acl.canAccess,
    currentTier: acl.currentTier,
    currentMode: acl.currentMode,
    hasIntelligence: acl.hasIntelligence,
  };
  return QUICK_ACTIONS.filter((action) => {
    if (
      action.accessTarget &&
      !canAccessTarget(action.accessTarget, targetAcl, action.accessMode ?? "write")
    ) {
      return false;
    }
    if (action.kind === "start-consultation" && !acl.canStartConsultation) return false;
    return true;
  }).map((action) => ({
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
  }));
}

export function buildPaletteActions(
  params: BuildPaletteActionsParams,
): CommandPaletteAction[] {
  const acl: Acl = {
    role: params.userRole,
    canAccess: params.canAccess,
    currentTier: params.currentTier,
    currentMode: params.currentMode,
    hasIntelligence: params.hasIntelligence,
  };

  return [
    ...buildNavActions(params.navOrder, acl, params.router),
    {
      id: "ai-ask",
      label: "Ask AI",
      group: COMMAND_PALETTE_GROUP_AI,
      icon: <Sparkles className="size-4" />,
      keywords: ["assistant", "chat", "prompt"],
      shortcut: "⌘J",
      onRun: () =>
        params.openOverlay(resolveAskAiScopeFromPathname(params.pathname)),
    },
    ...buildQuickActions(
      { ...acl, canStartConsultation: params.canStartConsultation },
      params.router,
      params.handleStartConsultation,
    ),
  ];
}
