"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardSharedWorkspace } from "@/features/dashboard/components/layout/dashboard-shared-workspace";
import { DashboardShortcutsSection } from "@/features/dashboard/components/layout/dashboard-shortcuts-section";
import { DashboardSkeletonUI } from "@/features/dashboard/components/layout/dashboard-skeleton-ui";
import { DashboardRefreshControl } from "@/features/dashboard/components/layout/dashboard-refresh-control";
import { TodayFollowUpsPanel } from "@/features/dashboard/components/follow-ups/today-follow-ups-panel";
import { TodayScheduleUI } from "@/features/dashboard/components/schedule/today-schedule-ui";
import { TodayAdvisorRail } from "@/features/dashboard/components/advisor/today-advisor-rail";
import { formatDashboardSummary } from "@/features/dashboard/lib/format-dashboard-summary";
import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { useClinicReferralShare } from "@/features/dashboard/hooks/use-clinic-referral-share";
import { ClinicReferralShareToolbar } from "@/features/dashboard/components/layout/clinic-referral-share-toolbar";
import { Feature } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/contexts/clinic-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useAskAi } from "@/features/_shared/components/ask-ai/ask-ai-context";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { PageHeader } from "@workspace/ui/components/page-header";
import { cn } from "@workspace/ui/lib/utils";
import { LayoutDashboard, Sparkles } from "lucide-react";

export default function TodayPage() {
  return <TodayPageContent />;
}
