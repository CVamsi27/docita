import type { LucideIcon } from "lucide-react";

export function DifferentiatorIcon({
  icon: Icon,
  eyebrow,
}: {
  icon: LucideIcon;
  eyebrow: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="r2-eyebrow r2-eyebrow-accent">{eyebrow}</p>
    </div>
  );
}
