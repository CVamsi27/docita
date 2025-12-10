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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
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
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
  phoneNumber?: string;
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

    try {
      if (editingMember) {
        // When editing, only send password if it was changed
        const updateData: Partial<MemberForm> = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/doctors/${editingMember.id}`, updateData);
        toast.success("Member has been updated successfully.");
      } else {
        // When creating, password is required
        await api.post("/doctors", formData);
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
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                resetForm();
              } else if (!editingMember) {
                // When opening for a new member, ensure form is reset
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
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
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? "Edit Member" : "Add New Member"}
                </DialogTitle>
                <DialogDescription>
                  {editingMember
                    ? "Update member information"
                    : "Add a new team member to your clinic"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
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
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
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
                </div>

                {!editingMember && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
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
                  </div>
                )}

                {editingMember && (
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password (Optional)</Label>
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
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingMember ? "Update Member" : "Add Member"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
