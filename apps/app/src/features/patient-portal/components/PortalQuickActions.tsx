"use client";

import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components";
import { Calendar, FileText, Receipt } from "lucide-react";

export function PortalQuickActions() {
  const { t } = useTranslation("PatientPortal");
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">{t("quickActions.cardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/portal/appointments">
            <Calendar className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {t("quickActions.appointments")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/portal/prescriptions">
            <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {t("quickActions.prescriptions")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/portal/billing">
            <Receipt className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {t("quickActions.billing")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/portal/history">{t("quickActions.visitHistory")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
