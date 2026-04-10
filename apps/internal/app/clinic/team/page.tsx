"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  CRUDDialog,
  FormFieldGroup,
  FormGrid,
  FormSection,
} from "@workspace/ui/components";
import { Loader2, Pencil, Plus, Stethoscope, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { client } from "@/lib/api-client";
import { toast } from "sonner";
import { SPECIALIZATION_LABELS } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
  createdAt: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: "DOCTOR" | "RECEPTIONIST";
  specialization: string;
  qualification: string;
  registrationNumber: string;
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "DOCTOR",
    specialization: "",
    qualification: "",
    registrationNumber: "",
  });

  const { token, user } = useAuth();

  const SPECIALIZATIONS = Object.entries(SPECIALIZATION_LABELS).map(
    ([value, label]) => ({
      value,
      label,
    }),
  );

  const teamQuery = useQuery({
    queryKey: ["clinic", user?.clinicId ?? "none", "team-members"],
    queryFn: async () => {
      const [doctors, receptionists] = await Promise.all([
        client.get<TeamMember[]>(`/clinics/${user?.clinicId}/doctors`),
        client.get<TeamMember[]>(`/clinics/${user?.clinicId}/receptionists`),
      ]);
      return [
        ...(Array.isArray(doctors)
          ? doctors.map((d) => ({ ...d, role: "DOCTOR" as const }))
          : []),
        ...(Array.isArray(receptionists)
          ? receptionists.map((r) => ({ ...r, role: "RECEPTIONIST" as const }))
          : []),
      ];
    },
    enabled: Boolean(token && user?.clinicId),
  });
  const members = teamQuery.data ?? [];
  const loading = teamQuery.isLoading;

  const saveMemberMutation = useMutation({
    mutationFn: async (input: {
      mode: "create" | "edit";
      endpoint: string;
      payload: Record<string, unknown>;
      memberId?: string;
    }) => {
      if (input.mode === "edit" && input.memberId) {
        return client.put(`${input.endpoint}/${input.memberId}`, input.payload);
      }
      return client.post(input.endpoint, input.payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clinic", user?.clinicId ?? "none", "team-members"],
      });
    },
  });

  const resetForm = () => {
    setEditingMember(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      phoneNumber: "",
      role: "DOCTOR",
      specialization: "",
      qualification: "",
      registrationNumber: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      showUserFacingErrorToast("Please fill in all required fields");
      return;
    }

    if (!editingMember && !formData.password) {
      showUserFacingErrorToast("Password is required when creating a new member");
      return;
    }

    if (formData.role === "DOCTOR" && !formData.registrationNumber) {
      showUserFacingErrorToast("Registration number is required for doctors");
      return;
    }

    try {
      const endpoint =
        formData.role === "DOCTOR"
          ? `/clinics/${user?.clinicId}/doctors`
          : `/clinics/${user?.clinicId}/receptionists`;

      const payload = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber || undefined,
        ...(formData.role === "DOCTOR" && {
          specialization: formData.specialization || undefined,
          qualification: formData.qualification || undefined,
          registrationNumber: formData.registrationNumber || undefined,
        }),
      };

      if (editingMember) {
        const updatePayload: Record<string, unknown> = { ...payload };
        if (formData.password) {
          updatePayload.password = formData.password;
        }

        await saveMemberMutation.mutateAsync({
          mode: "edit",
          endpoint,
          payload: updatePayload,
          memberId: editingMember.id,
        });
        toast.success("Team member updated successfully");
        setIsDialogOpen(false);
        resetForm();
      } else {
        const createPayload = { ...payload, password: formData.password };
        await saveMemberMutation.mutateAsync({
          mode: "create",
          endpoint,
          payload: createPayload,
        });
        toast.success(
          `${formData.role === "DOCTOR" ? "Doctor" : "Receptionist"} created successfully`,
        );
        setIsDialogOpen(false);
        resetForm();
      }
    } catch {
      showUserFacingErrorToast("Error saving team member");
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      password: "",
      phoneNumber: member.phoneNumber || "",
      role: member.role as "DOCTOR" | "RECEPTIONIST",
      specialization: member.specialization || "",
      qualification: member.qualification || "",
      registrationNumber: member.registrationNumber || "",
    });
    setIsDialogOpen(true);
  };

  const getRoleIcon = (role: string) => {
    if (role === "DOCTOR") return <Stethoscope className="h-4 w-4" />;
    return <UserCheck className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your clinic team members
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setEditingMember(null);
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      <CRUDDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
        title={editingMember ? "Edit Team Member" : "Add Team Member"}
        description={
          editingMember
            ? "Update team member information"
            : "Add a new team member to your clinic"
        }
        isEditing={!!editingMember}
        isLoading={saveMemberMutation.isPending}
        onSubmit={handleSubmit}
        submitLabel={editingMember ? "Update Member" : "Add Member"}
        contentClassName="sm:max-w-[600px]"
      >
        <FormGrid columns={2}>
          <FormFieldGroup
            label="Full Name"
            required
            error={formData.name ? undefined : "Name is required"}
          >
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="John Doe"
              required
            />
          </FormFieldGroup>

          <FormFieldGroup
            label="Email"
            required
            error={formData.email ? undefined : "Email is required"}
          >
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="member@clinic.com"
              required
            />
          </FormFieldGroup>
        </FormGrid>

        <FormFieldGroup
          label="Role"
          required
          error={formData.role ? undefined : "Role is required"}
        >
          <Select
            value={formData.role}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                role: value as "DOCTOR" | "RECEPTIONIST",
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DOCTOR">Doctor</SelectItem>
              <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
            </SelectContent>
          </Select>
        </FormFieldGroup>

        {!editingMember && (
          <FormFieldGroup
            label="Password"
            required
            error={formData.password ? undefined : "Password is required"}
          >
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Enter a strong password"
              required
            />
          </FormFieldGroup>
        )}

        {editingMember && (
          <FormFieldGroup
            label="New Password (Optional)"
            hint="Leave blank to keep existing password"
          >
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Leave blank to keep existing password"
            />
          </FormFieldGroup>
        )}

        <FormFieldGroup label="Phone Number">
          <Input
            id="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) =>
              setFormData({ ...formData, phoneNumber: e.target.value })
            }
            placeholder="+91 XXXXX XXXXX"
          />
        </FormFieldGroup>

        {formData.role === "DOCTOR" && (
          <>
            <FormSection
              title="Professional Information"
              description="Medical qualifications and credentials"
            />

            <FormGrid columns={2}>
              <FormFieldGroup label="Specialization">
                <Select
                  value={formData.specialization}
                  onValueChange={(value) =>
                    setFormData({ ...formData, specialization: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec.value} value={spec.value}>
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormFieldGroup>

              <FormFieldGroup label="Qualification">
                <Input
                  id="qualification"
                  value={formData.qualification}
                  onChange={(e) =>
                    setFormData({ ...formData, qualification: e.target.value })
                  }
                  placeholder="e.g., MBBS, MD"
                />
              </FormFieldGroup>
            </FormGrid>

            <FormFieldGroup
              label="Registration Number"
              required
              error={
                formData.registrationNumber
                  ? undefined
                  : "Registration number is required for doctors"
              }
            >
              <Input
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registrationNumber: e.target.value,
                  })
                }
                placeholder="Medical Council Reg. No."
                required
              />
            </FormFieldGroup>
          </>
        )}
      </CRUDDialog>

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
              No team members yet. Click &quot;Add Team Member&quot; to get
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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(member)}
                        className="gap-1"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
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
