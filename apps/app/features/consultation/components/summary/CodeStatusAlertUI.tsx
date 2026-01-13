
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
  { bg: string; border: string; text: string; icon: string }
> = {
  FULL_CODE: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-600",
  },
  DNR: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-900",
    icon: "text-red-600",
  },
  DNI: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-900",
    icon: "text-orange-600",
  },
  DNR_DNI: {
    bg: "bg-red-100",
    border: "border-red-400",
    text: "text-red-900",
    icon: "text-red-700",
  },
  COMFORT_CARE: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-900",
    icon: "text-purple-600",
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
        "flex items-center gap-2 px-3 py-2 rounded-lg border",
        colors.bg,
        colors.border,
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
            "text-xs font-bold border-current uppercase",
            colors.text,
          )}
        >
          CRITICAL
        </Badge>
      )}
    </div>
  );
}
