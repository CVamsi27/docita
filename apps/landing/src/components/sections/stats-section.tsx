import { Building2, FileText, UserCog, Users } from "lucide-react";

import {
  FALLBACK_PLATFORM_STATS,
  formatStatValue,
  type PlatformStats,
} from "@/lib/landing-data";

interface StatsSectionProps {
  stats: PlatformStats;
}

export function StatsSection({ stats }: StatsSectionProps) {
  const statCards = [
    { label: "Active Clinics", icon: Building2, key: "clinics" as const },
    { label: "Doctors", icon: UserCog, key: "doctors" as const },
    { label: "Patients Managed", icon: Users, key: "patients" as const },
    { label: "Prescriptions", icon: FileText, key: "prescriptions" as const },
  ];

  const statsToRender = stats ?? FALLBACK_PLATFORM_STATS;

  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {statCards.map((card) => (
            <article key={card.label} className="space-y-2">
              <div className="flex justify-center mb-4 opacity-80">
                <card.icon className="h-8 w-8" />
              </div>
              <p className="text-4xl font-bold">
                {formatStatValue(statsToRender[card.key])}
              </p>
              <p className="text-primary-foreground font-medium">{card.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
