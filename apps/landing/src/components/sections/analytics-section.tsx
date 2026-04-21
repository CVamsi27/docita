"use client";

import { BarChart3, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function AnalyticsSection() {
  return (
    <section className="px-6 py-24 bg-background">
      <div className="ui-page-shell">
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-4 py-2 text-sm text-foreground">
            <BarChart3 className="h-4 w-4 text-info" />
            <span className="font-medium text-foreground">
              Data-Driven Insights
            </span>
          </div>
          <SectionHeading
            align="center"
            size="section"
            title="Grow Your Practice with Analytics"
            description="Understand your facility's performance with comprehensive reports on revenue, patient trends, and operational efficiency."
            descriptionClassName="mx-auto max-w-2xl"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-linear-to-br from-info/10 to-background border-info/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Revenue
              </CardTitle>
              <div className="text-2xl font-bold flex items-baseline gap-2">
                $45,231
                <span className="text-xs text-success flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> +12%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-24 flex items-end gap-1">
                {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-info/20 rounded-t hover:bg-info transition-colors"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-primary/10 to-background border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Patient Growth
              </CardTitle>
              <div className="text-2xl font-bold flex items-baseline gap-2">
                1,204
                <span className="text-xs text-success flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> +8%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-24 flex items-end gap-1">
                {[30, 45, 55, 60, 75, 85, 95].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/20 rounded-t hover:bg-primary transition-colors"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-accent to-background border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Diagnoses
              </CardTitle>
              <div className="text-2xl font-bold">Disease Trends</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 pt-2">
                {[
                  { name: "Viral Fever", val: 45, color: "bg-primary" },
                  { name: "Hypertension", val: 30, color: "bg-info" },
                  { name: "Diabetes T2", val: 25, color: "bg-success" },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{item.name}</span>
                      <span>{item.val}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color}`}
                        style={{ width: `${item.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
