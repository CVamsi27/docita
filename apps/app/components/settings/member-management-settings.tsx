"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  CRUDDialog,
  FormGrid,
  FormSection,
  FormFieldGroup,
} from "@workspace/ui/components";
import { apiHooks } from "@/lib/api-hooks";
import {
  Plus,
  Edit,
  Trash2,
  Users as UsersIcon,
  Mail,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { DialogTrigger } from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { useAuth } from "@/lib/auth-context";

interface MemberForm {
  name: string;
  email: string;
  password?: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  yearsOfExperience?: string;
  consultationFee?: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  ADMIN_DOCTOR: "Admin Doctor",
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Manages clinic operations and staff",
  ADMIN_DOCTOR: "Admin with doctor privileges",
  DOCTOR: "Provides medical services",
  RECEPTIONIST: "Handles appointments and billing",
};

export function MemberManagementSettings() {
  const { user: currentUser } = useAuth();
  const { data: members = [], isLoading: loading } = apiHooks.useDoctors();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showPassword, setShowPassword] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberForm>({
    name: "",
    email: "",
    password: "",
    role: "DOCTOR",
    phoneNumber: "",
    specialization: "",
    qualification: "",
    registrationNumber: "",
    licenseNumber: "",
    yearsOfExperience: "",
    consultationFee: "",
  });

  // Check if current user is admin
  const isAdmin =
    currentUser?.role === "ADMIN" || currentUser?.role === "ADMIN_DOCTOR";

  const filteredMembers =
    roleFilter === "ALL"
      ? members
      : members.filter((m) => m.role === roleFilter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    // If creating a new member, password is required
    if (!editingMember && !formData.password) {
      toast.error("Password is required when creating a new member");
      return;
    }

    // Registration number is required for doctors
    if (
      (formData.role === "DOCTOR" || formData.role === "ADMIN_DOCTOR") &&
      !formData.registrationNumber
    ) {
      toast.error("Registration number is required for doctors");
      return;
    }

    try {
      if (editingMember) {
        // When editing, send all fields that might have changed
        const updateData: Partial<MemberForm> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phoneNumber: formData.phoneNumber,
          specialization: formData.specialization,
          qualification: formData.qualification,
          registrationNumber: formData.registrationNumber,
          licenseNumber: formData.licenseNumber,
          yearsOfExperience: formData.yearsOfExperience,
          consultationFee: formData.consultationFee,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/doctors/${editingMember.id}`, updateData);
        toast.success("Member has been updated successfully.");
      } else {
        // When creating, send all fields including password
        const createData = {
          ...formData,
          yearsOfExperience: formData.yearsOfExperience
            ? parseInt(formData.yearsOfExperience)
            : undefined,
          consultationFee: formData.consultationFee
            ? parseFloat(formData.consultationFee)
            : undefined,
        };
        await api.post("/doctors", createData);
        toast.success("Member has been added successfully.");
      }

      queryClient.invalidateQueries({ queryKey: ["doctors"] });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Save member error:", error);
      toast.error(`Failed to save member. Please try again.`);
    }
  };

  const handleEdit = (member: Member) => {
    if (!isAdmin) {
      toast.error("You don't have permission to edit members");
      return;
    }
    setEditingMember(member);
    setFormData({
      name: member.name || "",
      email: member.email || "",
      password: "",
      role: member.role || "DOCTOR",
      phoneNumber: member.phoneNumber || "",
      specialization: member.specialization || "",
      qualification: member.qualification || "",
      registrationNumber: member.registrationNumber || "",
      licenseNumber: member.licenseNumber || "",
      yearsOfExperience: member.yearsOfExperience
        ? String(member.yearsOfExperience)
        : "",
      consultationFee: member.consultationFee
        ? String(member.consultationFee)
        : "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (memberId: string) => {
    if (!isAdmin) {
      toast.error("You don't have permission to remove members");
      return;
    }

    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await api.delete(`/doctors/${memberId}`);
      toast.success("Member has been removed successfully.");

      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    } catch (error) {
      console.error("Delete member error:", error);
      toast.error("Failed to remove member.");
    }
  };

  const resetForm = () => {
    setEditingMember(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "DOCTOR",
      phoneNumber: "",
      specialization: "",
      qualification: "",
      registrationNumber: "",
      yearsOfExperience: "",
      consultationFee: "",
    });
    setShowPassword(false);
  };

  const getRoleBadgeVariant = (
    role: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "ADMIN":
        return "default";
      case "ADMIN_DOCTOR":
        return "default";
      case "DOCTOR":
        return "secondary";
      case "RECEPTIONIST":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-primary" />
              <CardTitle>Member Management</CardTitle>
            </div>
            <CardDescription>Manage all clinic team members</CardDescription>
          </div>
          <Button
            className="gap-2"
            disabled={!isAdmin}
            onClick={() => {
              if (!isAdmin) {
                toast.error("You don't have permission to add members");
                return;
              }
              setEditingMember(null);
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Member
          </Button>

          <CRUDDialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetForm();
              }
            }}
            title={editingMember ? "Edit Member" : "Add New Member"}
            description={
              editingMember
                ? "Update member information"
                : "Add a new team member to your clinic"
            }
            isEditing={!!editingMember}
            isLoading={false}
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
                  placeholder="member@example.com"
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
                    role: value as
                      | "DOCTOR"
                      | "RECEPTIONIST"
                      | "ADMIN"
                      | "ADMIN_DOCTOR",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    Admin - {ROLE_DESCRIPTIONS.ADMIN}
                  </SelectItem>
                  <SelectItem value="ADMIN_DOCTOR">
                    Admin Doctor - {ROLE_DESCRIPTIONS.ADMIN_DOCTOR}
                  </SelectItem>
                  <SelectItem value="DOCTOR">
                    Doctor - {ROLE_DESCRIPTIONS.DOCTOR}
                  </SelectItem>
                  <SelectItem value="RECEPTIONIST">
                    Receptionist - {ROLE_DESCRIPTIONS.RECEPTIONIST}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormFieldGroup>

            {!editingMember && (
              <FormFieldGroup
                label="Password"
                required
                error={formData.password ? undefined : "Password is required"}
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        password: e.target.value,
                      })
                    }
                    placeholder="Enter a strong password"
                    required={!editingMember}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormFieldGroup>
            )}

            {editingMember && (
              <FormFieldGroup
                label="New Password (Optional)"
                hint="Leave blank to keep existing password"
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        password: e.target.value,
                      })
                    }
                    placeholder="Leave blank to keep existing password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormFieldGroup>
            )}

            <FormFieldGroup label="Phone Number">
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phoneNumber: e.target.value,
                  })
                }
                placeholder="+1 (555) 000-0000"
              />
            </FormFieldGroup>

            {(formData.role === "DOCTOR" ||
              formData.role === "ADMIN_DOCTOR") && (
              <>
                <FormSection
                  title="Doctor Details"
                  description="Professional qualifications and credentials"
                />

                <FormGrid columns={2}>
                  <FormFieldGroup label="Specialization">
                    <Input
                      id="specialization"
                      value={formData.specialization || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          specialization: e.target.value,
                        })
                      }
                      placeholder="e.g., Cardiology"
                    />
                  </FormFieldGroup>

                  <FormFieldGroup label="Qualification">
                    <Input
                      id="qualification"
                      value={formData.qualification || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          qualification: e.target.value,
                        })
                      }
                      placeholder="e.g., MD, MBBS"
                    />
                  </FormFieldGroup>
                </FormGrid>

                <FormGrid columns={2}>
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
                      value={formData.registrationNumber || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registrationNumber: e.target.value,
                        })
                      }
                      placeholder="Medical registration number"
                      required
                    />
                  </FormFieldGroup>

                  <FormFieldGroup
                    label="License Number"
                    hint="Optional medical license number"
                  >
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          licenseNumber: e.target.value,
                        })
                      }
                      placeholder="Medical license number (optional)"
                    />
                  </FormFieldGroup>
                </FormGrid>

                <FormGrid columns={2}>
                  <FormFieldGroup label="Years of Experience">
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      min="0"
                      value={formData.yearsOfExperience || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          yearsOfExperience: e.target.value,
                        })
                      }
                      placeholder="e.g., 10"
                    />
                  </FormFieldGroup>

                  <FormFieldGroup label="Consultation Fee">
                    <Input
                      id="consultationFee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.consultationFee || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          consultationFee: e.target.value,
                        })
                      }
                      placeholder="e.g., 500"
                    />
                  </FormFieldGroup>
                </FormGrid>
              </>
            )}
          </CRUDDialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState message="Loading members..." className="py-8" />
        ) : members.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No members added yet"
            description="Click 'Add Member' to get started."
            className="py-8 border-2 border-dashed rounded-lg"
          />
        ) : (
          <div className="space-y-4">
            {/* Role Filter Buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {["ALL", "ADMIN", "ADMIN_DOCTOR", "DOCTOR", "RECEPTIONIST"].map(
                (role) => (
                  <Button
                    key={role}
                    variant={roleFilter === role ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRoleFilter(role)}
                  >
                    {role === "ALL" ? "All Members" : ROLE_LABELS[role]}
                  </Button>
                ),
              )}
            </div>

            {/* Members List */}
            {filteredMembers.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title={`No ${roleFilter === "ALL" ? "members" : roleFilter.toLowerCase()}s found`}
                description="No members match the selected filter."
                className="py-8 border-2 border-dashed rounded-lg"
              />
            ) : (
              <div className="space-y-4">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{member.name}</h3>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(member as Member)}
                        disabled={!isAdmin}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(member.id)}
                        disabled={!isAdmin}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
