import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { ViewAllLinkUI } from "./ViewAllLinkUI";

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
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-linear-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center text-blue-600">
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
                className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-muted/60 hover:shadow-sm transition-all group border border-transparent hover:border-border/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/5 text-primary text-xs font-medium">
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
