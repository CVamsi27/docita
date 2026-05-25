import { cn } from "@workspace/ui/lib/utils";

interface BulletStepListProps {
  items: string[];
  bulletClassName: string;
  className?: string;
}

export function BulletStepList({
  items,
  bulletClassName,
  className,
}: BulletStepListProps) {
  return (
    <ul
      className={cn(
        "space-y-2 text-sm text-muted-foreground",
        className,
      )}
    >
      {items.map((text) => (
        <li key={text} className="flex items-center gap-2">
          <div
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              bulletClassName,
            )}
            aria-hidden
          />
          {text}
        </li>
      ))}
    </ul>
  );
}
