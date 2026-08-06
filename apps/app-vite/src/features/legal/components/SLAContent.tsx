import { useTranslation } from "react-i18next";

export function SLAContent() {
  const { t } = useTranslation("Legal");

  return (
    <div className="rounded-lg border bg-background p-4 md:p-5">
      <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:text-[var(--fs-2xl)] [&_h2]:font-semibold [&_h2]:leading-[var(--lh-tight)] [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-7 [&_p]:text-sm [&_p]:leading-6 [&_ol]:my-4 [&_ol]:space-y-6 [&_ol]:pl-6 [&_ul]:my-3 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_li]:text-sm [&_li]:leading-6 [&_table]:my-3 [&_th]:text-xs [&_td]:text-sm">
        <h2>{t("sla.title")}</h2>
        <p className="text-muted-foreground">{t("sla.effectiveDate")}</p>
        <ol>
          <li>
            <h3 className="mt-0 mb-2">{t("sla.s1Title")}</h3>
            <p>
              {t("sla.s1BodyPrefix")}{" "}
              <strong>{t("sla.s1BodyStrong")}</strong>{" "}
              {t("sla.s1BodySuffix")}
            </p>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("sla.s2Title")}</h3>
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="min-w-[32rem] w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium p-2">{t("sla.s2th1")}</th>
                    <th className="text-left text-xs font-medium p-2">{t("sla.s2th2")}</th>
                    <th className="text-left text-xs font-medium p-2">{t("sla.s2th3")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 text-sm">{t("sla.s2p1")}</td>
                    <td className="p-2 text-sm">{t("sla.s2p1r")}</td>
                    <td className="p-2 text-sm">{t("sla.s2p1t")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-sm">{t("sla.s2p2")}</td>
                    <td className="p-2 text-sm">{t("sla.s2p2r")}</td>
                    <td className="p-2 text-sm">{t("sla.s2p2t")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-sm">{t("sla.s2p3")}</td>
                    <td className="p-2 text-sm">{t("sla.s2p3r")}</td>
                    <td className="p-2 text-sm">{t("sla.s2p3t")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-sm">{t("sla.s2p4")}</td>
                    <td className="p-2 text-sm">{t("sla.s2p4r")}</td>
                    <td className="p-2 text-sm">{t("sla.s2p4t")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("sla.s3Title")}</h3>
            <ul>
              <li>{t("sla.s3r1")}</li>
              <li>{t("sla.s3r2")}</li>
              <li>{t("sla.s3r3")}</li>
              <li>{t("sla.s3r4")}</li>
              <li>{t("sla.s3r5")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("sla.s4Title")}</h3>
            <ul>
              <li>{t("sla.s4r1")}</li>
              <li>{t("sla.s4r2")}</li>
              <li>{t("sla.s4r3")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("sla.s5Title")}</h3>
            <ul>
              <li>{t("sla.s5r1")}</li>
              <li>{t("sla.s5r2")}</li>
              <li>{t("sla.s5r3")}</li>
            </ul>
          </li>
          <li>
            <h3 className="mt-0 mb-2">{t("sla.s6Title")}</h3>
            <p>{t("sla.s6Body")}</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
