import { Link, useNavigate, useSearchParams } from "react-router";
import { Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { AppPageScaffold, Button, PageHeader, PageTabs, type PageTabItem } from "@workspace/ui/components";
import { WhatsappTemplatesSettings } from "@/features/settings/components/whatsapp/WhatsappTemplatesSettings";
import { useAuth } from "@/lib/auth/auth-context";
import { isAdmin } from "@/lib/auth/permissions";
import { WhatsappCampaignsView } from "./WhatsappCampaignsView";
import { WhatsappRecentSentView } from "./WhatsappRecentSentView";
import { WhatsappDeliveryView } from "./WhatsappDeliveryView";

function WhatsappOperationsContent() {
  const { t } = useTranslation("WhatsApp");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canManageSender = isAdmin(user?.role);

  // Declared before the useMemo below: the memo factory runs synchronously
  // during the first render, so referencing TABS after its declaration line
  // would hit the temporal dead zone (ReferenceError on the WhatsApp page).
  const TABS: PageTabItem[] = [
    { id: "sent", label: t("tabs.sent") },
    { id: "campaigns", label: t("tabs.campaigns") },
    { id: "templates", label: t("tabs.templates") },
    { id: "delivery", label: t("tabs.delivery") },
  ];

  const activeTab = useMemo(() => {
    const requested = searchParams?.get("tab");
    return TABS.some((tab) => tab.id === requested)
      ? (requested ?? "sent")
      : "sent";
  }, [searchParams]);

  return (
    <AppPageScaffold
      contentClassName="space-y-5"
      header={
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
          actions={
            canManageSender ? (
              <Button variant="outline" asChild>
                <Link to="/settings/whatsapp-sender">
                  <Settings2 className="size-4" />
                  {t("senderSettings")}
                </Link>
              </Button>
            ) : undefined
          }
        />
      }
    >
      <PageTabs
        items={TABS}
        activeId={activeTab}
        onSelect={(tab) => navigate(`/whatsapp?tab=${tab}`)}
      />
      {activeTab === "sent" ? <WhatsappRecentSentView /> : null}
      {activeTab === "campaigns" ? <WhatsappCampaignsView /> : null}
      {activeTab === "templates" ? <WhatsappTemplatesSettings /> : null}
      {activeTab === "delivery" ? <WhatsappDeliveryView /> : null}
    </AppPageScaffold>
  );
}

export function WhatsappOperationsPageContent() {
  return (
    <Suspense>
      <WhatsappOperationsContent />
    </Suspense>
  );
}
