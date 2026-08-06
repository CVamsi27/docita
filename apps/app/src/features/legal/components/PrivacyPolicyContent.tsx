import { useTranslation } from "react-i18next";
import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";

export function PrivacyPolicyContent() {
  const { t } = useTranslation("Legal");

  return (
    <div className="rounded-lg border bg-background p-4 md:p-5">
      <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-[var(--fs-2xl)] [&_h2]:font-semibold [&_h2]:leading-[var(--lh-tight)] [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-7 [&_p]:text-sm [&_p]:leading-6 [&_ol]:my-4 [&_ol]:space-y-6 [&_ol]:pl-6 [&_ul]:my-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:text-sm [&_li]:leading-6">
        <h2>{t("privacyPolicy.title")}</h2>
        <p className="text-muted-foreground">{t("privacyPolicy.lastUpdated")}</p>

        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 my-4">
          <h3 className="text-primary mt-0">{t("privacyPolicy.complianceTitle")}</h3>
          <p className="text-sm mb-0">
            {t("privacyPolicy.complianceBodyPrefix")}{" "}
            <strong>{t("privacyPolicy.complianceBodyProcessor")}</strong>{" "}
            {t("privacyPolicy.complianceBodyFor")}{" "}
            <strong>{t("privacyPolicy.complianceBodyFiduciary")}</strong>{" "}
            {t("privacyPolicy.complianceBodySuffix")}
          </p>
        </div>

        <ol>
          <li>
            <h3 className="mt-0 mb-2">{t("privacyPolicy.s1Title")}</h3>
            <p>{t("privacyPolicy.s1Intro")}</p>
            <ul>
              <li>
                <strong>{t("privacyPolicy.s1AccountLabel")}</strong>{" "}
                {t("privacyPolicy.s1AccountText")}
              </li>
              <li>
                <strong>{t("privacyPolicy.s1PatientLabel")}</strong>{" "}
                {t("privacyPolicy.s1PatientText")}
              </li>
              <li>
                <strong>{t("privacyPolicy.s1UsageLabel")}</strong>{" "}
                {t("privacyPolicy.s1UsageText")}
              </li>
              <li>
                <strong>{t("privacyPolicy.s1PaymentLabel")}</strong>{" "}
                {t("privacyPolicy.s1PaymentText")}
              </li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("privacyPolicy.s2Title")}</h3>
            <p>{t("privacyPolicy.s2Intro")}</p>
            <ul>
              <li>
                <strong>{t("privacyPolicy.s2MedicalLabel")}</strong>{" "}
                {t("privacyPolicy.s2MedicalText")}
              </li>
              <li>
                <strong>{t("privacyPolicy.s2CommLabel")}</strong>{" "}
                {t("privacyPolicy.s2CommText")}
              </li>
              <li>
                <strong>{t("privacyPolicy.s2StorageLabel")}</strong>{" "}
                {t("privacyPolicy.s2StorageText")}
              </li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("privacyPolicy.s3Title")}</h3>
            <p>{t("privacyPolicy.s3Intro")}</p>
            <ul>
              <li>{t("privacyPolicy.s3r1")}</li>
              <li>{t("privacyPolicy.s3r2")}</li>
              <li>{t("privacyPolicy.s3r3")}</li>
              <li>{t("privacyPolicy.s3r4")}</li>
              <li>{t("privacyPolicy.s3r5")}</li>
              <li>{t("privacyPolicy.s3r6")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("privacyPolicy.s4Title")}</h3>
            <ul>
              <li>{t("privacyPolicy.s4r1")}</li>
              <li>{t("privacyPolicy.s4r2")}</li>
              <li>
                {t("privacyPolicy.s4r3Prefix")}{" "}
                <strong>{t("privacyPolicy.s4r3Strong")}</strong>{" "}
                {t("privacyPolicy.s4r3Suffix")}
              </li>
              <li>{t("privacyPolicy.s4r4")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("privacyPolicy.s5Title")}</h3>
            <p>
              {t("privacyPolicy.s5BodyPrefix")}{" "}
              <strong>{t("privacyPolicy.s5BodyStrong")}</strong>
              {t("privacyPolicy.s5BodySuffix")}
            </p>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("privacyPolicy.s6Title")}</h3>
            <p>{t("privacyPolicy.s6Intro")}</p>
            <ul>
              <li>{t("privacyPolicy.s6r1")}</li>
              <li>{t("privacyPolicy.s6r2")}</li>
              <li>{t("privacyPolicy.s6r3")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("privacyPolicy.s7Title")}</h3>
            <p>{t("privacyPolicy.s7Intro")}</p>
            <div className="bg-muted p-3 rounded-md text-sm">
              <strong>{t("privacyPolicy.s7DpoLabel")}</strong>
              <br />
              {t("privacyPolicy.s7EmailLabel")}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              <br />
              {t("privacyPolicy.s7Address")}
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
