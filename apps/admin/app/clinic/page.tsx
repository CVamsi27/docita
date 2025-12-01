"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Building2, Users, Stethoscope, User } from "lucide-react";

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
  const [clinic, setClinic] = useState<ClinicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    const loadClinicData = async () => {
      if (!token || !user?.clinicId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/clinics/${user.clinicId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          // Count team members
          const doctorsRes = await fetch(
            `${API_URL}/clinics/${user.clinicId}/doctors`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          let doctors = 0;
          const receptionists = 0;

          if (doctorsRes.ok) {
            const doctorsData = await doctorsRes.json();
            doctors = doctorsData.length;
          }

          setClinic({
            ...data,
            doctors,
            receptionists,
          });
        }
      } catch (error) {
        console.error("Error loading clinic:", error);
        toast.error("Failed to load clinic details");
      } finally {
        setLoading(false);
      }
    };

    loadClinicData();
  }, [token, user?.clinicId]);

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
        <h1 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your clinic, team, and operations
        </p>
      </div>

      {clinic ? (
        <>
          {/* Clinic Info Card */}
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

          {/* Stats Cards */}
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
              Unable to load clinic information
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
