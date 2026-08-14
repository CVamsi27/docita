import { Card, CardContent, CardHeader, Skeleton } from "@workspace/ui/components";

export function ReminderSettingsLoadingCard() {
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-label="Loading reminder settings"
    >
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
