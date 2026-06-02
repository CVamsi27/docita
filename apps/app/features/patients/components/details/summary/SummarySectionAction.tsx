import Link from "next/link";
import { Button } from "@workspace/ui/components/form/button";
import { ChevronRight } from "lucide-react";

interface SummarySectionActionProps {
  href: string;
  label: string;
}

export function SummarySectionAction({
  href,
  label,
}: SummarySectionActionProps) {
  return (
    <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
      <Link href={href}>
        {label}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  );
}
