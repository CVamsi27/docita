import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";

interface ComingSoonPreviewProps {
  children: ReactNode;
}

/**
 * Banner shown above AI surfaces whose backing services are not yet
 * implemented, so the illustrative sample data below is never mistaken for
 * live results. See docs/plan/NEXT_STEPS_2026-05.md §4.
 */
export const ComingSoonPreview = ({ children }: ComingSoonPreviewProps) => (
  <Alert>
    <Sparkles className="h-4 w-4" aria-hidden />
    <AlertTitle>Preview — coming soon</AlertTitle>
    <AlertDescription>{children}</AlertDescription>
  </Alert>
);
