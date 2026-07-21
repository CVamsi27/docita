"use client";

import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@workspace/ui/components";
import { Calendar, FileText, Receipt } from "lucide-react";

export function PortalQuickActions() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/appointments">
            <Calendar className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Appointments
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/prescriptions">
            <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Prescriptions
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/billing">
            <Receipt className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Billing
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/history">Visit history</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
