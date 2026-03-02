import { ChevronDown } from "lucide-react";

export const SectionToggle = ({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen?: boolean;
  onToggle: () => void;
  badge?: string;
}) => (
  <button
    onClick={onToggle}
    className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
  >
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      <span className="font-medium text-sm">{title}</span>
      {badge && (
        <span className="text-xs badge-danger px-2 py-1 rounded">
          {badge}
        </span>
      )}
    </div>
    <ChevronDown
      className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
    />
  </button>
);
