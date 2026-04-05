"use client";

import { useEffect, useState } from "react";
import { Building2, FileText, UserCog, Users } from "lucide-react";

import {
  FALLBACK_PLATFORM_STATS,
  fetchPlatformStats,
  formatStatValue,
  type PlatformStats,
} from "@/lib/landing-data";

export function StatsSection() {
  const [stats, setStats] = useState<PlatformStats>(FALLBACK_PLATFORM_STATS);

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
        setStats(FALLBACK_PLATFORM_STATS);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  const statCards = [
    { label: "Active Clinics", icon: Building2, key: "clinics" as const },
    { label: "Doctors", icon: UserCog, key: "doctors" as const },
    { label: "Patients Managed", icon: Users, key: "patients" as const },
    { label: "Prescriptions", icon: FileText, key: "prescriptions" as const },
  ];

  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {statCards.map((card) => (
            <article key={card.label} className="space-y-2">
              <div className="flex justify-center mb-4 opacity-80">
                <card.icon className="h-8 w-8" />
              </div>
              <p className="text-4xl font-bold">{formatStatValue(stats[card.key])}</p>
              <p className="text-primary-foreground/80 font-medium">{card.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
