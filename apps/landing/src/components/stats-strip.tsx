import { useEffect, useState } from "react";
import { Building2, FileText, UserCog, Users } from "lucide-react";

import {
  FALLBACK_PLATFORM_STATS,
  fetchPlatformStats,
  formatStatValue,
  type PlatformStats,
} from "@/lib/landing-data";

const statCards = [
  { label: "Active Clinics", icon: Building2, key: "clinics" as const },
  { label: "Doctors", icon: UserCog, key: "doctors" as const },
  { label: "Patients Managed", icon: Users, key: "patients" as const },
  { label: "Prescriptions", icon: FileText, key: "prescriptions" as const },
];

export function StatsStrip() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const payload = await fetchPlatformStats();
        if (!active) {
          return;
        }
        setStats(payload);
      } catch {
        if (!active) {
          return;
        }
        setStats(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  const statsToRender = stats ?? FALLBACK_PLATFORM_STATS;

  return (
    <section className="py-16 bg-primary text-primary-foreground" aria-live="polite">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {statCards.map((card) => (
            <article
              key={card.label}
              className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-5"
            >
              <card.icon className="mx-auto mb-3 h-7 w-7 opacity-90" aria-hidden="true" />
              <div className="text-3xl font-bold md:text-4xl">
                {isLoading ? "..." : formatStatValue(statsToRender[card.key])}
              </div>
              <p className="mt-1 text-sm font-medium text-primary-foreground/80">{card.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
