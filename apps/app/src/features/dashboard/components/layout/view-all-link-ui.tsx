import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface ViewAllLinkUIProps {
  to: string;
  text?: string;
  className?: string;
}

export function ViewAllLinkUI({
  to,
  text = "View all",
  className,
}: ViewAllLinkUIProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors",
        className,
      )}
    >
      {text}
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
}
