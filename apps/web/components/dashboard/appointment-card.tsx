"use client"

import { Badge } from "@workspace/ui/components/badge"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { cn, getStatusColor } from "@/lib/design-system"

interface AppointmentCardProps {
  time: string
  patient: string
  type: string
  status: string
  delay?: number
}

export function AppointmentCard({
  time,
  patient,
  type,
  status,
  delay = 0,
}: AppointmentCardProps) {
  const statusColor = getStatusColor(status)
  
  const statusIcons = {
    confirmed: CheckCircle2,
    pending: AlertCircle,
    scheduled: Clock,
  }
  
  const StatusIcon = statusIcons[status as keyof typeof statusIcons] || Clock

  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg border border-border"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Time Badge */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{time}</span>
          </div>
        </div>

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {patient}
          </p>
          <p className="text-xs text-muted-foreground">{type}</p>
        </div>
      </div>

      {/* Status Badge */}
      <Badge
        variant={statusColor === 'success' ? 'default' : 'secondary'}
        className={cn(
          "flex items-center gap-1",
          statusColor === 'success' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400",
          statusColor === 'warning' && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400"
        )}
      >
        <StatusIcon className="h-3 w-3" />
        <span className="capitalize">{status}</span>
      </Badge>
    </div>
  )
}
