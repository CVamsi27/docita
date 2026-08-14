import type { FC } from "react";
import { Link } from "react-router";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components";
import { CheckCircle2, FileText } from "lucide-react";

export const CodingQueue: FC<{
  items?: Array<{
    id: string;
    patientName: string;
    date: string;
    status: string;
    reviewHref?: string;
  }>;
}> = ({ items = [] }) => {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Coding queue</CardTitle>
          </div>
          <Badge>{items.length} pending</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mb-2 text-success" />
            <p>All caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{item.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.date} - {item.status}
                  </p>
                </div>
                {item.reviewHref ? (
                  <Button size="sm" asChild>
                    <Link to={item.reviewHref}>Review</Link>
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Review
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
