"use client"

import { Card, CardContent } from "@workspace/ui/components/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/design-system"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
  icon: LucideIcon
  iconClassName?: string
  iconBgClassName?: string
  delay?: number
}

export function StatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  iconClassName,
  iconBgClassName,
  delay = 0,
}: StatCardProps) {
  const trendColors = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground",
  }

  return (
    <Card
      className="border-border/50 shadow-sm"
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight">
                {value}
              </h3>
              {change && (
                <span className={cn("text-sm font-medium", trendColors[trend])}>
                  {change}
                </span>
              )}
            </div>
          </div>
          
          <div
            className={cn(
              "rounded-xl p-3",
              iconBgClassName || "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                iconClassName || "text-primary"
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
