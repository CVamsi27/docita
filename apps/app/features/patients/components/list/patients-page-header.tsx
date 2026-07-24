import { Button, PageHeader } from "@workspace/ui/components";
import { Stethoscope, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

export function PatientsPageHeader({
  onAddPatient,
  onOpenConsultationQueue,
}: {
  onAddPatient: () => void;
  onOpenConsultationQueue?: () => void;
}) {
  const t = useTranslations("Patients.list");
  return (
    <PageHeader
      title={t("pageTitle")}
      description={t("pageDescription")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {onOpenConsultationQueue ? (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenConsultationQueue}
              className="gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">{t("consultationQueueFull")}</span>
              <span className="sm:hidden">{t("consultationQueueShort")}</span>
            </Button>
          ) : null}
          <Button
            onClick={onAddPatient}
            className="gap-2"
            data-testid="patients-add-trigger"
          >
            <UserPlus className="h-4 w-4" />
            {t("addPatient")}
          </Button>
        </div>
      }
    />
  );
}
