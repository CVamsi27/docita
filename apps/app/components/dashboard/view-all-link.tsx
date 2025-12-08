import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface ViewAllLinkProps {
  href: string;
  text?: string;
  className?: string;
}

export function ViewAllLink({
  href,
  text = "View all",
  className,
}: ViewAllLinkProps) {
  return (
    <Link
      href={href}
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
