"use client";

import { Building2, FileText, UserCog, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { landingQueryKeys } from "@/lib/query-keys";
import { fetchLandingJson, type PlatformStatsResponse } from "@/lib/public-api";

interface PlatformStats {
  clinics: number;
  doctors: number;
  patients: number;
  prescriptions: number;
}

const FALLBACK: PlatformStats = {
  clinics: 25,
  doctors: 50,
  patients: 10000,
  prescriptions: 25000,
};

function formatStatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M+`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K+`;
  return `${value}+`;
}

export function StatsSection() {
  const { data } = useQuery({
    queryKey: landingQueryKeys.stats.platform(),
    queryFn: async (): Promise<PlatformStats> => {
      const payload = await fetchLandingJson<PlatformStatsResponse>(
        "/public/platform-stats",
      );
      return {
        clinics: Math.max(payload.clinics ?? 0, FALLBACK.clinics),
        doctors: Math.max(payload.doctors ?? 0, FALLBACK.doctors),
        patients: Math.max(payload.patients ?? 0, FALLBACK.patients),
        prescriptions: Math.max(
          payload.prescriptions ?? 0,
          FALLBACK.prescriptions,
        ),
      };
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const platformStats = data ?? FALLBACK;

  const stats = [
    {
      label: "Active Clinics",
      value: formatStatValue(platformStats.clinics),
      icon: Building2,
    },
    {
      label: "Doctors",
      value: formatStatValue(platformStats.doctors),
      icon: UserCog,
    },
    {
      label: "Patients Managed",
      value: formatStatValue(platformStats.patients),
      icon: Users,
    },
    {
      label: "Prescriptions",
      value: formatStatValue(platformStats.prescriptions),
      icon: FileText,
    },
  ];

  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-center mb-4 opacity-80">
                <stat.icon className="h-8 w-8" />
              </div>
              <div className="text-4xl font-bold">{stat.value}</div>
              <div className="text-primary-foreground/80 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
