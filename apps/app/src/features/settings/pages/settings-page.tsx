import { useNavigate, useSearchParams } from "react-router";
import { AppPageScaffold, PageHeader } from "@workspace/ui/components";
import {
  Building2,
  ChevronRight,
  CreditCard,
  Palette,
  Shield,
  Users,
  MessageSquare,
  FileText,
  MessageSquarePlus,
  UserPlus,
  ClipboardList,
  Timer,
  Stethoscope,
  KeyRound,
  BellRing,
  TriangleAlert,
  UserRound,
  CalendarClock,
  CalendarOff,
  UserCog,
} from "lucide-react";
import { PageMeta } from "@/components/layout/page-meta";
import { SubscriptionSettingsContent } from "@/features/subscription";

export function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");

  if (tab === "subscription") {
    return (
      <>
        <PageMeta
          title="Plan & Billing"
          description="Manage subscription, usage, and payment history"
        />
        <AppPageScaffold
          header={
            <PageHeader
              title="Plan & Billing"
              description="Manage subscription, usage, and payment history."
            />
          }
        >
          <SubscriptionSettingsContent />
        </AppPageScaffold>
      </>
    );
  }

  const sections = [
    { title: "Plan & Billing", desc: "Manage subscription, usage, and payments", href: "/settings?tab=subscription", icon: CreditCard },
    { title: "Clinic Profile", desc: "Manage facility details and compliance identifiers", href: "/settings/clinic", icon: Building2 },
    { title: "Team", desc: "Manage staff, roles, and permissions", href: "/settings/team", icon: Users },
    { title: "Join Requests", desc: "Review pending team join requests", href: "/settings/team/join-requests", icon: UserPlus },
    { title: "Compliance", desc: "Consent templates and regulatory settings", href: "/settings/compliance", icon: Shield },
    { title: "WhatsApp Sender", desc: "Configure WhatsApp sender details", href: "/settings/whatsapp-sender", icon: MessageSquare },
    { title: "WhatsApp Templates", desc: "Manage reusable message templates", href: "/settings/templates", icon: MessageSquarePlus },
    { title: "Clinical Templates", desc: "Clinical templates for prescriptions and notes", href: "/templates", icon: FileText },
    { title: "Appearance", desc: "Theme, accent color, and density", href: "/settings/appearance", icon: Palette },
    { title: "Queue", desc: "Queue configuration and live status", href: "/settings/queue", icon: Timer },
    { title: "Clinical Defaults", desc: "OPD slip and prescription defaults", href: "/settings/clinical", icon: Stethoscope },
    { title: "Security", desc: "Two-factor auth, sessions, and password", href: "/settings/security", icon: KeyRound },
    { title: "Notifications", desc: "Notification and reminder preferences", href: "/settings/notifications", icon: BellRing },
    { title: "Danger Zone", desc: "Sign out or request account deletion", href: "/settings/danger-zone", icon: TriangleAlert },
    { title: "Doctor Profile", desc: "Digital signature, registration, and HPR ID", href: "/settings/doctor-profile", icon: UserRound },
    { title: "Availability", desc: "Doctor schedules and time away", href: "/settings/availability", icon: CalendarClock },
    { title: "Leave", desc: "Leave requests, balances, and plans", href: "/settings/leave", icon: CalendarOff },
    { title: "Account", desc: "Profile, email, and password", href: "/settings/account", icon: UserCog },
    { title: "Audit Log", desc: "View system access and change events", href: "/settings?tab=audit", icon: ClipboardList },
  ];

  return (
    <>
      <PageMeta title="Settings" description="Manage clinic and account settings" />
      <AppPageScaffold header={<PageHeader title="Settings" description="Manage clinic and account settings." />}>
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.title} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(s.href)}>
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </AppPageScaffold>
    </>
  );
}
