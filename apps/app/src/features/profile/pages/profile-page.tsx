import { useTranslation } from "react-i18next";
import { PageMeta } from "@/components/layout/page-meta";
import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import { User, Shield, Bell, Palette, Smartphone, LogOut } from "lucide-react";

export function ProfilePage() {
  const { t } = useTranslation("Profile");
  const sections = [
    { title: t("sections.personalInformation"), desc: t("sections.personalInformationDesc"), icon: User, href: "#" },
    { title: t("sections.security"), desc: t("sections.securityDesc"), icon: Shield, href: "#" },
    { title: t("sections.notifications"), desc: t("sections.notificationsDesc"), icon: Bell, href: "#" },
    { title: t("sections.appearance"), desc: t("sections.appearanceDesc"), icon: Palette, href: "#" },
    { title: t("sections.devices"), desc: t("sections.devicesDesc"), icon: Smartphone, href: "#" },
  ];

  return (
    <>
      <PageMeta title={t("pageTitle")} description={t("pageDescription")} />
      <AppPageScaffold header={<PageHeader title={t("pageTitle")} description={t("pageDescription")} />}>
        <div className="mb-6 flex items-center gap-4 rounded-lg border p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">{t("userPlaceholder")}</p>
            <p className="text-xs text-muted-foreground">{t("emailPlaceholder")}</p>
          </div>
        </div>
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.title} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 cursor-pointer">
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
              <LogOut className="h-4 w-4 rotate-90 text-muted-foreground" />
            </div>
          ))}
        </div>
      </AppPageScaffold>
    </>
  );
}
