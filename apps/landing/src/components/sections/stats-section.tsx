import { Building2, FileText, UserCog, Users } from "lucide-react";

import { formatStatValue, type PlatformStats } from "@/lib/landing-data";

interface StatsSectionProps {
  stats: PlatformStats | null;
}

export function StatsSection({ stats }: StatsSectionProps) {
  if (!stats) {
    return null;
  }

  const hasCompleteStats = Object.values(stats).every((value) => value > 0);
  if (!hasCompleteStats) {
    return null;
  }

  const statCards = [
    { label: "Active Clinics", icon: Building2, key: "clinics" as const },
    { label: "Doctors", icon: UserCog, key: "doctors" as const },
    { label: "Patients Managed", icon: Users, key: "patients" as const },
    { label: "Prescriptions", icon: FileText, key: "prescriptions" as const },
  ];

  return (
    <section className="landing-section bg-primary text-primary-foreground">
      <div className="ui-page-shell">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {statCards.map((card) => (
            <article key={card.label} className="space-y-2">
              <div className="flex justify-center mb-4 opacity-80">
                <card.icon className="h-8 w-8" />
              </div>
              <p className="text-[var(--fs-3xl)] font-semibold leading-[var(--lh-tight)] tabular-nums md:text-[var(--fs-4xl)]">
                {formatStatValue(stats[card.key])}
              </p>
              <p className="text-primary-foreground/80 font-medium text-sm md:text-base">
                {card.label}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
