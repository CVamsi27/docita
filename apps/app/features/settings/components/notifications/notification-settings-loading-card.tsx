import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/indicators/card";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";

export function NotificationSettingsLoadingCard() {
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-label="Loading notification settings"
    >
      <CardHeader>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}
