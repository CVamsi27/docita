import { AlertOctagon, AlertTriangle } from "lucide-react";

export const ConfidenceIndicator = ({ score }: { score?: number }) => {
  if (!score) return null;
  const percentage = Math.round(score * 100);
  let color = "bg-green-500";
  let icon = null;

  if (percentage >= 80) {
    color = "bg-green-500";
  } else if (percentage >= 60) {
    color = "bg-yellow-500";
    icon = <AlertTriangle className="h-3 w-3" />;
  } else {
    color = "bg-red-500";
    icon = <AlertOctagon className="h-3 w-3" />;
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      {icon}
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-muted-foreground text-xs">{percentage}%</span>
    </div>
  );
};
