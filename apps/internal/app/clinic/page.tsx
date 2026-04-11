"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useAuth } from "@/lib/auth";
import { client } from "@/lib/api-client";
import { Building2, Stethoscope, User, Users } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface ClinicStats {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  doctors: number;
  receptionists: number;
  appointments?: number;
}

export default function ClinicDashboard() {
  const { token, user } = useAuth();
  const clinicQuery = useQuery({
    queryKey: ["clinic", user?.clinicId ?? "none", "dashboard"],
    queryFn: async (): Promise<ClinicStats> => {
      const clinicData = await client.get<Omit<ClinicStats, "doctors" | "receptionists">>(
        `/clinics/${user?.clinicId}`,
      );
      const doctorsData = await client.get<Array<{ id: string }>>(
        `/clinics/${user?.clinicId}/doctors`,
      );

      return {
        ...clinicData,
        doctors: Array.isArray(doctorsData) ? doctorsData.length : 0,
        receptionists: 0,
      };
    },
    enabled: Boolean(token && user?.clinicId),
  });
  const clinic = clinicQuery.data ?? null;
  const loading = clinicQuery.isLoading;

  useEffect(() => {
    if (clinicQuery.isError) {
      showUserFacingErrorToast("We could not load clinic details. Please try again.");
    }
  }, [clinicQuery.isError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Internal Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage clinics, team, and operations
        </p>
      </div>

      {clinic ? (
        <>
          {}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {clinic.name}
              </CardTitle>
              <CardDescription>Your clinic information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{clinic.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{clinic.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{clinic.address}</p>
              </div>
            </CardContent>
          </Card>

          {}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Doctors</CardTitle>
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clinic.doctors}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Receptionists
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clinic.receptionists}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Staff
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {clinic.doctors + clinic.receptionists}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              We could not load clinic information. Please refresh and try again.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
