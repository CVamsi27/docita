import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";
import { usePartnerMe, usePartnerShareMessage } from "@workspace/data-access";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components";

export function PartnerShareCard() {
  const { t } = useTranslation("ReferralPartner.share");
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  const me = usePartnerMe(ctx.accessToken, ctx.baseUrl);
  const share = usePartnerShareMessage(ctx.accessToken, ctx.baseUrl);
  const [copied, setCopied] = useState<"message" | "signup" | null>(null);

  const copy = async (text: string, kind: "message" | "signup") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // best-effort; clipboard might be denied in some browsers
    }
  };

  if (me.isLoading || share.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("loading")}</div>;
  }
  if (!me.data || !share.data) {
    return <div className="text-sm text-muted-foreground">{t("unavailable")}</div>;
  }
  // Destructure so the closures below can read narrowed values without
  // re-checking or non-null asserting.
  const meData = me.data;
  const shareData = share.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("signupLinkTitle")}</CardTitle>
          <CardDescription>{t("signupLinkDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {meData.signupUrl}
          </pre>
          <Button
            type="button"
            onClick={() => void copy(meData.signupUrl, "signup")}
            variant="outline"
          >
            {copied === "signup" ? t("copied") : t("copyLink")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("whatsappTitle")}</CardTitle>
          <CardDescription>{t("whatsappDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
            {shareData.message}
          </pre>
          <Button
            type="button"
            onClick={() => void copy(shareData.message, "message")}
            variant="outline"
          >
            {copied === "message" ? t("copied") : t("copyMessage")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("pdfTitle")}</CardTitle>
          <CardDescription>{t("pdfDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href={meData.showcasePdfUrl} target="_blank" rel="noreferrer">
              {t("downloadPdf")}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
