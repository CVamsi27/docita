"use client";

import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewAllLink } from "./view-all-link";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  updatedAt?: string | Date;
  phoneNumber?: string;
}

interface RecentPatientsProps {
  patients: Patient[];
}

export function RecentPatients({ patients }: RecentPatientsProps) {
  return (
    <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Patients
              </CardTitle>
              <CardDescription className="text-xs">
                Last updated
              </CardDescription>
            </div>
          </div>
          <ViewAllLink href="/patients" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {patients.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={Users}
              title="No patients yet"
              description="Add your first patient"
              action={{
                label: "Add patient",
                href: "/patients?action=new",
              }}
            />
          </div>
        ) : (
          <div className="space-y-1">
            {patients.slice(0, 4).map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-medium">
                    {patient.firstName?.[0]}
                    {patient.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {patient.updatedAt
                      ? formatDistanceToNow(new Date(patient.updatedAt), {
                          addSuffix: true,
                        })
                      : patient.phoneNumber}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
