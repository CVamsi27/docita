import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import type { ReactNode } from "react";

interface QueueConfigSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function QueueConfigSection({ title = "Queue configuration", description = "How the patient queue is managed in real time.", children }: QueueConfigSectionProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-5">
        {children}
      </CardContent>
    </Card>
  );
}
