import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export const QueueSettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue Settings</CardTitle>
        <CardDescription>
          Manage your clinic&apos;s patient queue configuration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Queue settings configuration coming soon.
        </p>
      </CardContent>
    </Card>
  );
};
