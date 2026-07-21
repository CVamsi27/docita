"use client";

import Link from "next/link";
import { BarChart3, BookOpen, ExternalLink } from "lucide-react";
import { AppPageScaffold, Card, CardContent, CardHeader, CardTitle, PageHeader } from "@workspace/ui/components";

const REPORTS = [
  {
    title: "Analytics",
    description:
      "Disease trends, revenue by CPT code, and compliance dashboard.",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Daybook",
    description:
      "Daily ledger, payment method breakdown, and close-of-day.",
    href: "/daybook",
    icon: BookOpen,
  },
] as const;

export function ReportsHubClient() {
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Reports"
          description="Unified reporting hub for analytics, financials, and compliance."
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="transition-colors duration-150 hover:bg-muted/40">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <Icon className="size-5 text-primary" />
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <ExternalLink className="ml-auto size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppPageScaffold>
  );
}
