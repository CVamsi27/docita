import { Award, Clock, Lock, Shield } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";

export function TrustSection() {
  const trustItems = [
    { icon: Shield, title: "Encrypted Infrastructure", description: "Modern encryption with role-based access and audit-aware workflows" },
    { icon: Clock, title: "99.9% Uptime", description: "Reliable infrastructure ensures your facility never stops" },
    { icon: Award, title: "Premium Support", description: "Priority 24/7 support for all paid tiers" },
    { icon: Lock, title: "Data Ownership", description: "You own your patient data completely. No lock-ins." },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {trustItems.map((item, index) => (
        <Card key={index} className="bg-muted/30 border-none shadow-none">
          <CardContent className="flex flex-col items-center text-center p-6 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/70">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
