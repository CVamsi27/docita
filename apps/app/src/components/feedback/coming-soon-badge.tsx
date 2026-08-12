import { Sparkles } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Consistent "Coming soon" signal for planned features whose backing services
 * are not yet wired. Place it on a card title or next to a disabled action so
 * the surface reads as deliberately planned rather than unfinished. Use this
 * instead of ad-hoc inline "coming soon" copy so every preview surface matches.
 */
export function ComingSoonBadge({
  className,
  label = "Coming soon",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("font-medium", className)}>
      <Sparkles aria-hidden />
      {label}
    </Badge>
  );
}
