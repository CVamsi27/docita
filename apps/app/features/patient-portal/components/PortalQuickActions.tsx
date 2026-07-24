"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components";
import { Calendar, FileText, Receipt } from "lucide-react";

export function PortalQuickActions() {
  const t = useTranslations("PatientPortal.quickActions");
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">{t("cardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/appointments">
            <Calendar className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {t("appointments")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/prescriptions">
            <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {t("prescriptions")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/billing">
            <Receipt className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {t("billing")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/portal/history">{t("visitHistory")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
