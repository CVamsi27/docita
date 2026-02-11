"use client";

import { Building2, UserCog, Users, FileText } from "lucide-react";

export function StatsSection() {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Active Clinics", value: "25+", icon: Building2 },
            { label: "Doctors", value: "50+", icon: UserCog },
            { label: "Patients Managed", value: "10K+", icon: Users },
            { label: "Prescriptions", value: "25K+", icon: FileText },
          ].map((stat, i) => (
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
