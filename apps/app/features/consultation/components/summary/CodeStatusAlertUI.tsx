import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

export type CodeStatus =
  | "FULL_CODE"
  | "DNR"
  | "DNI"
  | "DNR_DNI"
  | "COMFORT_CARE";

export const CODE_STATUS_LABELS: Record<CodeStatus, string> = {
  FULL_CODE: "Full Code",
  DNR: "DNR (Do Not Resuscitate)",
  DNI: "DNI (Do Not Intubate)",
  DNR_DNI: "DNR/DNI",
  COMFORT_CARE: "Comfort Care Only",
};

export const CODE_STATUS_COLORS: Record<
  CodeStatus,
  { container: string; text: string; icon: string; badge: string }
> = {
  FULL_CODE: {
    container: "surface-success",
    text: "text-success",
    icon: "text-success",
    badge: "badge-success",
  },
  DNR: {
    container: "surface-danger",
    text: "text-destructive",
    icon: "text-destructive",
    badge: "badge-danger",
  },
  DNI: {
    container: "surface-warning",
    text: "text-warning",
    icon: "text-warning",
    badge: "badge-warning",
  },
  DNR_DNI: {
    container: "surface-danger",
    text: "text-destructive",
    icon: "text-destructive",
    badge: "badge-danger",
  },
  COMFORT_CARE: {
    container: "surface-info",
    text: "text-info",
    icon: "text-info",
    badge: "badge-info",
  },
};

export function CodeStatusAlertUI({
  codeStatus,
  updatedAt,
  updatedBy,
  className,
  compact = false,
}: {
  codeStatus: CodeStatus;
  updatedAt?: Date | string;
  updatedBy?: string;
  className?: string;
  compact?: boolean;
}) {
  if (compact && codeStatus === "FULL_CODE") return null;

  const colors = CODE_STATUS_COLORS[codeStatus];
  const label = CODE_STATUS_LABELS[codeStatus];
  const isCritical = ["DNR", "DNI", "DNR_DNI", "COMFORT_CARE"].includes(
    codeStatus,
  );

  const Icon = codeStatus === "FULL_CODE" ? ShieldCheck : ShieldAlert;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        colors.container,
        colors.text,
        isCritical && "animate-pulse",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", colors.icon)} />
      <div className="flex-1 text-sm">
        <span className="font-bold uppercase tracking-wide">Code Status: </span>
        <span className="font-semibold">{label}</span>
        {!compact && updatedAt && (
          <span className="ml-2 text-xs opacity-75">
            (Updated:{" "}
            {typeof updatedAt === "string"
              ? new Date(updatedAt).toLocaleDateString()
              : updatedAt.toLocaleDateString()}
            {updatedBy && ` by ${updatedBy}`})
          </span>
        )}
      </div>
      {isCritical && (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold uppercase",
            colors.badge,
          )}
        >
          CRITICAL
        </Badge>
      )}
    </div>
  );
}
