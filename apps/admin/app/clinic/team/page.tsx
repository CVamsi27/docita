"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Loader2, Stethoscope, UserCheck } from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
  createdAt: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    const loadTeam = async () => {
      if (!token || !user?.clinicId) {
        setLoading(false);
        return;
      }

      try {
        const allMembers: TeamMember[] = [];

        // Fetch doctors
        const doctorsRes = await fetch(
          `${API_URL}/clinics/${user.clinicId}/doctors`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (doctorsRes.ok) {
          const doctors: TeamMember[] = await doctorsRes.json();
          allMembers.push(
            ...doctors.map((d) => ({
              ...d,
              role: "DOCTOR" as const,
            })),
          );
        }

        // Fetch receptionists
        const receptRes = await fetch(
          `${API_URL}/clinics/${user.clinicId}/receptionists`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (receptRes.ok) {
          const receptionists: TeamMember[] = await receptRes.json();
          allMembers.push(
            ...receptionists.map((r) => ({
              ...r,
              role: "RECEPTIONIST" as const,
            })),
          );
        }

        setMembers(allMembers);
      } catch (error) {
        console.error("Error loading team:", error);
        toast.error("Failed to load team members");
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [token, user?.clinicId]);

  const getRoleIcon = (role: string) => {
    if (role === "DOCTOR") return <Stethoscope className="h-4 w-4" />;
    return <UserCheck className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">Manage your clinic team members</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No team members yet. Create a doctor or receptionist to get
              started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {member.phoneNumber || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {getRoleIcon(member.role)}
                        {member.role === "DOCTOR" ? "Doctor" : "Receptionist"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
