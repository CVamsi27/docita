import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import type { LucideIcon } from "lucide-react";
import type { RevenueByCPT } from "@/features/analytics/hooks/use-analytics-logic";
import { EmptyState, LoadingSpinner } from "./chart-helpers";

interface RevenueChartShellProps {
  title: string;
  description: string;
  data: RevenueByCPT[];
  loading: boolean;
  emptyIcon: LucideIcon;
  emptyLabel: string;
  emptySublabel?: string;
  children: React.ReactNode;
}

export function RevenueChartShell({
  title,
  description,
  data,
  loading,
  emptyIcon,
  emptyLabel,
  emptySublabel,
  children,
}: RevenueChartShellProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {loading ? (
          <LoadingSpinner />
        ) : data.length > 0 ? (
          children
        ) : (
          <EmptyState
            icon={emptyIcon}
            label={emptyLabel}
            sublabel={emptySublabel}
          />
        )}
      </CardContent>
    </Card>
  );
}
