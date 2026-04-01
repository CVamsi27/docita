"use client";

import { Building2, FileText, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";

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

function getLandingApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
  const normalized = baseUrl.replace(/\/+$/, "");

  if (/\/api$/i.test(normalized)) {
    return `${normalized}/v1`;
  }

  return normalized;
}

function formatStatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M+`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K+`;
  return `${value}+`;
}

export function StatsSection() {
  const [platformStats, setPlatformStats] = useState<PlatformStats>(FALLBACK);

  useEffect(() => {
    const apiUrl = getLandingApiBaseUrl();
    fetch(`${apiUrl}/public/platform-stats`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) {
          setPlatformStats({
            clinics: Math.max(data.clinics ?? 0, FALLBACK.clinics),
            doctors: Math.max(data.doctors ?? 0, FALLBACK.doctors),
            patients: Math.max(data.patients ?? 0, FALLBACK.patients),
            prescriptions: Math.max(
              data.prescriptions ?? 0,
              FALLBACK.prescriptions,
            ),
          });
        }
      })
      .catch(() => {});
  }, []);

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
