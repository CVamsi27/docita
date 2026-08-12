import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { PageMeta } from "@/components/layout/page-meta";
import { Button } from "@workspace/ui/components";
import { Beaker, ArrowLeft, Bug } from "lucide-react";

export function VisualTestPage() {
  const { fixture } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("DevTools");

  return (
    <>
      <PageMeta title={t("visualTest.title")} noSuffix />
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <Beaker className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{t("visualTest.fixtureTitle")}</h1>
        <p className="text-sm text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">{fixture || t("visualTest.none")}</p>
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          {t("visualTest.description")}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/today")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("visualTest.backToDashboard")}
        </Button>
      </div>
    </>
  );
}

export function E2ESessionSeedPage() {
  const navigate = useNavigate();
  const [seeded, setSeeded] = useState(false);
  const { t } = useTranslation("DevTools");

  return (
    <>
      <PageMeta title={t("e2eSeed.title")} noSuffix />
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <Bug className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">{t("e2eSeed.title")}</h1>
        <p className="text-sm text-muted-foreground max-w-sm text-center">
          {t("e2eSeed.description")}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/today")}>
            {t("e2eSeed.cancel")}
          </Button>
          <Button size="sm" onClick={() => setSeeded(true)} disabled={seeded}>
            {seeded ? t("e2eSeed.seeded") : t("e2eSeed.seedButton")}
          </Button>
        </div>
      </div>
    </>
  );
}
