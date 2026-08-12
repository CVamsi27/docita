import { Card, CardContent, CardHeader, Skeleton } from "@workspace/ui/components";

export function ClinicGeneralSettingsSkeleton() {
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-label="Loading facility information"
    >
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
