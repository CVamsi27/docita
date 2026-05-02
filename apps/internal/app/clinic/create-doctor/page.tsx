"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PageHeader } from "@workspace/ui/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { client } from "@/lib/api-client";
import { toast } from "sonner";
import { SPECIALIZATION_LABELS } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

const SPECIALIZATIONS = Object.entries(SPECIALIZATION_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export default function CreateDoctorPage() {
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    specialization: "",
    qualification: "",
    registrationNumber: "",
  });
  const { user } = useAuth();
  const router = useRouter();
  const createDoctorMutation = useMutation({
    mutationFn: () =>
      client.post(`/clinics/${user?.clinicId}/doctors`, {
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber || undefined,
        specialization: form.specialization || undefined,
        qualification: form.qualification || undefined,
        registrationNumber: form.registrationNumber || undefined,
      }),
  });
  const loading = createDoctorMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { name?: string; email?: string; password?: string } = {};
    if (!form.name.trim()) {
      errors.name = "Enter the doctor's full name";
    }
    if (!form.email.trim()) {
      errors.email = "Enter an email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Enter a valid email address";
    }
    if (!form.password.trim()) {
      errors.password = "Enter a password";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await createDoctorMutation.mutateAsync();
      toast.success("Doctor created successfully");
      router.push("/clinic/team");
    } catch {
      showUserFacingErrorToast(
        "We could not create this doctor account. Please try again.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Doctor"
        description="Add a new doctor to your facility team"
        size="compact"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Doctor Details
          </CardTitle>
          <CardDescription>Enter the doctor information below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          name: undefined,
                        }));
                      }
                    }}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={
                      fieldErrors.name ? "doctor-name-error" : undefined
                    }
                  />
                  {fieldErrors.name && (
                    <p
                      id="doctor-name-error"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));
                      }
                    }}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={
                      fieldErrors.email ? "doctor-email-error" : undefined
                    }
                  />
                  {fieldErrors.email && (
                    <p
                      id="doctor-email-error"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value });
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                    }}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password ? "doctor-password-error" : undefined
                    }
                  />
                  {fieldErrors.password && (
                    <p
                      id="doctor-password-error"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Phone number"
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumber: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Professional Information</h3>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Select
                  value={form.specialization}
                  onValueChange={(value) =>
                    setForm({ ...form, specialization: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec.value} value={spec.value}>
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    placeholder="Qualification"
                    value={form.qualification}
                    onChange={(e) =>
                      setForm({ ...form, qualification: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">
                    Registration Number
                  </Label>
                  <Input
                    id="registrationNumber"
                    placeholder="Registration number"
                    value={form.registrationNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        registrationNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/clinic/team")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />}
                Create Doctor
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
