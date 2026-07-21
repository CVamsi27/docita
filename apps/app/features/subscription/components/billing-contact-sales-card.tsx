"use client";

import { Button, Card, CardContent } from "@workspace/ui/components";

export function ContactSalesCard({
  onContactSales,
}: {
  onContactSales: () => void;
}) {
  return (
    <Card className="border-border/70 bg-card">
      <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
        <div>
          <h3 className="ui-section-title text-[var(--fs-lg)]">
            Need help choosing?
          </h3>
          <p className="ui-page-subtitle">
            Our team can help you find the perfect plan for your practice
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onContactSales}>Contact Sales</Button>
        </div>
      </CardContent>
    </Card>
  );
}
