"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Loader2,
  Search,
  Eye,
  Users,
  Shield,
  Stethoscope,
  UserCog,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { SPECIALIZATION_LABELS } from "@workspace/types";

interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: "ADMIN" | "ADMIN_DOCTOR" | "DOCTOR" | "RECEPTIONIST";
  specialization?: string;
  hospitalRole?: string;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  bio?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  createdAt: string;
  clinicId?: string;
}

interface Clinic {
  id: string;
  name: string;
}

const ROLE_CONFIG = {
  ALL: { label: "All Users", icon: Users },
  ADMIN: { label: "Clinic Admins", icon: Shield },
  ADMIN_DOCTOR: { label: "Admin Doctors", icon: UserCog },
  DOCTOR: { label: "Doctors", icon: Stethoscope },
  RECEPTIONIST: { label: "Receptionists", icon: Users },
};

export default function UsersPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const { token } = useAuth();

  const fetchClinics = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/super-admin/clinics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();

        const clinicsArray = Array.isArray(data) ? data : data.items || [];
        setClinics(clinicsArray);

        if (clinicsArray.length > 0) {
          setSelectedClinic("all");
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {

      toast.error("Failed to load clinics");
      setLoading(false);
    }
  }, [token]);

  const fetchUsers = useCallback(
    async (clinicId: string) => {
      if (!token || !clinicId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (clinicId === "all") {

          if (clinics.length === 0) {
            setUsers([]);
            setLoading(false);
            return;
          }

          const allUsersPromises = clinics.map((clinic) =>
            Promise.all([
              fetch(`${API_URL}/super-admin/clinics/${clinic.id}/doctors`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then((res) => (res.ok ? res.json() : [])),
              fetch(`${API_URL}/super-admin/clinics/${clinic.id}/admins`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then((res) => (res.ok ? res.json() : [])),
            ]).then(([doctors, admins]) => [
              ...(Array.isArray(doctors) ? doctors : []),
              ...(Array.isArray(admins) ? admins : []),
            ]),
          );

          const allUsersArrays = await Promise.all(allUsersPromises);
          const allUsers = allUsersArrays.flat();
          setUsers(allUsers);
        } else {

          const [doctorsRes, adminsRes] = await Promise.all([
            fetch(`${API_URL}/super-admin/clinics/${clinicId}/doctors`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_URL}/super-admin/clinics/${clinicId}/admins`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          const doctors = doctorsRes.ok ? await doctorsRes.json() : [];
          const admins = adminsRes.ok ? await adminsRes.json() : [];

          const combinedUsers = [
            ...(Array.isArray(doctors) ? doctors : []),
            ...(Array.isArray(admins) ? admins : []),
          ];
          setUsers(combinedUsers);
        }
      } catch (error) {

        toast.error("Failed to load users");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [token, clinics],
  );

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  useEffect(() => {

    if (
      selectedClinic &&
      (selectedClinic === "all" ? clinics.length > 0 : true)
    ) {
      fetchUsers(selectedClinic);
    }
  }, [selectedClinic, fetchUsers, clinics.length]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false;

      const matchesRole = selectedRole === "ALL" || user.role === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "tier-pro";
      case "ADMIN_DOCTOR":
        return "tier-core";
      case "DOCTOR":
        return "tier-plus";
      case "RECEPTIONIST":
        return "tier-enterprise";
      default:
        return "badge-muted";
    }
  };

  const roleStats = useMemo(() => {
    return {
      ALL: users.length,
      ADMIN: users.filter((u) => u.role === "ADMIN").length,
      ADMIN_DOCTOR: users.filter((u) => u.role === "ADMIN_DOCTOR").length,
      DOCTOR: users.filter((u) => u.role === "DOCTOR").length,
      RECEPTIONIST: users.filter((u) => u.role === "RECEPTIONIST").length,
    };
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all users across clinics
          </p>
        </div>
      </div>

      {}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <Card
            key={role}
            className={`cursor-pointer transition-all ${
              selectedRole === role
                ? "ring-2 ring-primary shadow-lg"
                : "hover:shadow-md"
            }`}
            onClick={() => setSelectedRole(role)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {config.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {roleStats[role as keyof typeof roleStats]}
                  </p>
                </div>
                <config.icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedClinic} onValueChange={setSelectedClinic}>
              <SelectTrigger
                className="w-full md:w-[250px]"
                aria-label="Filter by clinic"
              >
                <SelectValue placeholder="Select clinic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clinics</SelectItem>
                {Array.isArray(clinics) &&
                  clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {users.length === 0
                ? "No team members found"
                : "No users match your search criteria"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.specialization
                          ? SPECIALIZATION_LABELS[
                              user.specialization as keyof typeof SPECIALIZATION_LABELS
                            ] || user.specialization
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.phoneNumber || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="text-sm font-semibold mt-1">
                    {selectedUser.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-sm font-semibold mt-1">
                    {selectedUser.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Role
                  </label>
                  <div className="mt-1">
                    <Badge className={getRoleBadgeColor(selectedUser.role)}>
                      {selectedUser.role.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone Number
                  </label>
                  <p className="text-sm font-semibold mt-1">
                    {selectedUser.phoneNumber || "N/A"}
                  </p>
                </div>
              </div>

              {(selectedUser.role === "DOCTOR" ||
                selectedUser.role === "ADMIN_DOCTOR") && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">
                      Professional Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedUser.specialization && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Specialization
                          </label>
                          <p className="text-sm font-semibold mt-1">
                            {SPECIALIZATION_LABELS[
                              selectedUser.specialization as keyof typeof SPECIALIZATION_LABELS
                            ] || selectedUser.specialization}
                          </p>
                        </div>
                      )}
                      {selectedUser.qualification && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Qualification
                          </label>
                          <p className="text-sm font-semibold mt-1">
                            {selectedUser.qualification}
                          </p>
                        </div>
                      )}
                      {selectedUser.registrationNumber && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Registration Number
                          </label>
                          <p className="text-sm font-semibold mt-1">
                            {selectedUser.registrationNumber}
                          </p>
                        </div>
                      )}
                      {selectedUser.yearsOfExperience !== undefined && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Experience
                          </label>
                          <p className="text-sm font-semibold mt-1">
                            {selectedUser.yearsOfExperience} years
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedUser.bio && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Bio
                      </label>
                      <p className="text-sm mt-1">{selectedUser.bio}</p>
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground">
                  Joined
                </label>
                <p className="text-sm font-semibold mt-1">
                  {new Date(selectedUser.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
