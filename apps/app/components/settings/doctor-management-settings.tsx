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
import { Plus, Edit, Trash2, UserCog, Mail } from "lucide-react";
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
import { Badge } from "@workspace/ui/components/badge";
import type { User } from "@workspace/types";

interface DoctorForm {
  name: string;
  email: string;
}

export function DoctorManagementSettings() {
  const { data: doctors = [], isLoading: loading } = apiHooks.useDoctors();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<User | null>(null);
  const [formData, setFormData] = useState<DoctorForm>({
    name: "",
    email: "",
  });

  const filteredDoctors =
    roleFilter === "ALL"
      ? doctors
      : doctors.filter((d) => d.role?.toUpperCase() === roleFilter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDoctor) {
        await api.put(`/doctors/${editingDoctor.id}`, formData);
        toast.success("Doctor has been updated successfully.");
      } else {
        await api.post("/doctors", formData);
        toast.success("Doctor has been added successfully.");
      }

      queryClient.invalidateQueries({ queryKey: ["doctors"] });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Save doctor error:", error);
      toast.error(`Failed to save doctor. Please try again.`);
    }
  };

  const handleEdit = (doctor: User) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name || "",
      email: doctor.email || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (doctorId: string) => {
    if (!confirm("Are you sure you want to remove this doctor?")) return;

    try {
      await api.delete(`/doctors/${doctorId}`);
      toast.success("Doctor has been removed successfully.");

      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    } catch (error) {
      console.error("Delete doctor error:", error);
      toast.error("Failed to remove doctor.");
    }
  };

  const resetForm = () => {
    setEditingDoctor(null);
    setFormData({
      name: "",
      email: "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              <CardTitle>Doctor Management</CardTitle>
            </div>
            <CardDescription>Manage doctors in your clinic</CardDescription>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingDoctor ? "Edit Doctor" : "Add New Doctor"}
                </DialogTitle>
                <DialogDescription>
                  {editingDoctor
                    ? "Update doctor information"
                    : "Add a new doctor to your clinic"}
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
                      placeholder="Dr. John Doe"
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
                      placeholder="doctor@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDoctor ? "Update Doctor" : "Add Doctor"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState message="Loading doctors..." className="py-8" />
        ) : doctors.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No doctors added yet"
            description="Click 'Add Doctor' to get started."
            className="py-8 border-2 border-dashed rounded-lg"
          />
        ) : (
          <div className="space-y-4">
            {/* Role Filter Buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {["ALL", "ADMIN", "DOCTOR", "STAFF"].map((role) => (
                <Button
                  key={role}
                  variant={roleFilter === role ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRoleFilter(role)}
                >
                  {role === "ALL"
                    ? "All Users"
                    : role === "ADMIN"
                      ? "Admins"
                      : role === "DOCTOR"
                        ? "Doctors"
                        : "Staff"}
                </Button>
              ))}
            </div>

            {/* Doctors List */}
            {filteredDoctors.length === 0 ? (
              <EmptyState
                icon={UserCog}
                title={`No ${roleFilter === "ALL" ? "users" : roleFilter.toLowerCase()}s found`}
                description="No users match the selected filter."
                className="py-8 border-2 border-dashed rounded-lg"
              />
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{doctor.name}</h3>
                        <Badge variant="secondary">{doctor.role}</Badge>
                      </div>
                      <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {doctor.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(doctor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doctor.id)}
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
