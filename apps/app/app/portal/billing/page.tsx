'use client';

import { usePatientPortalInvoices } from '@/hooks/api/use-patient-portal';
import { Card, CardContent } from '@workspace/ui/components/card';

export default function PortalBillingPage() {
  const { data, isLoading } = usePatientPortalInvoices();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">My Billing & Invoices</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {data?.invoices.length || 0} invoices found
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
