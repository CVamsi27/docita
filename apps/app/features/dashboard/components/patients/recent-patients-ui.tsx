import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { formatDistanceToNow, getPatientFullName } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/indicators/avatar";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { ViewAllLinkUI } from "@/features/dashboard/components/layout/view-all-link-ui";
import { getInitials } from "@/lib/formatters/text-helpers";

export interface RecentPatient {
  id: string;
  firstName: string;
  lastName: string;
  updatedAt?: string | Date;
  phoneNumber?: string;
}

export interface RecentPatientsUIProps {
  patients: RecentPatient[];
}

export function RecentPatientsUI({ patients }: RecentPatientsUIProps) {
  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-info">
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
          <ViewAllLinkUI href="/patients" />
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
                className="group flex items-center gap-4 rounded-lg border border-transparent p-3.5 transition-colors duration-150 hover:border-border/50 hover:bg-muted/60"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="border border-border/70 bg-background/70 text-foreground text-xs font-medium">
                    {getInitials(patient.firstName, patient.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {getPatientFullName(patient)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {patient.updatedAt
                      ? formatDistanceToNow(patient.updatedAt)
                      : patient.phoneNumber}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
