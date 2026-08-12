import { useTranslation } from "react-i18next";

export function DataProcessingAgreementContent() {
  const { t } = useTranslation("Legal");

  return (
    <div className="rounded-lg border bg-background p-4 md:p-5">
      <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-[var(--fs-2xl)] [&_h2]:font-semibold [&_h2]:leading-[var(--lh-tight)] [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-7 [&_p]:text-sm [&_p]:leading-6 [&_ol]:my-4 [&_ol]:space-y-6 [&_ol]:pl-6 [&_ul]:my-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:text-sm [&_li]:leading-6">
        <h2>{t("dpa.title")}</h2>
        <p className="text-muted-foreground">{t("dpa.lastUpdated")}</p>
        <ol>
          <li>
            <h3 className="mt-0 mb-2">{t("dpa.s1Title")}</h3>
            <p>{t("dpa.s1Body")}</p>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("dpa.s2Title")}</h3>
            <ul>
              <li>{t("dpa.s2r1")}</li>
              <li>{t("dpa.s2r2")}</li>
              <li>{t("dpa.s2r3")}</li>
              <li>{t("dpa.s2r4")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("dpa.s3Title")}</h3>
            <ul>
              <li>{t("dpa.s3r1")}</li>
              <li>{t("dpa.s3r2")}</li>
              <li>{t("dpa.s3r3")}</li>
              <li>{t("dpa.s3r4")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("dpa.s4Title")}</h3>
            <ul>
              <li>{t("dpa.s4r1")}</li>
              <li>{t("dpa.s4r2")}</li>
              <li>{t("dpa.s4r3")}</li>
              <li>{t("dpa.s4r4")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("dpa.s5Title")}</h3>
            <p>{t("dpa.s5Body")}</p>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("dpa.s6Title")}</h3>
            <p>{t("dpa.s6Body")}</p>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("dpa.s7Title")}</h3>
            <p>{t("dpa.s7Body")}</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
