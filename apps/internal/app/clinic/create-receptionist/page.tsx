"use client";

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
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { client } from "@/lib/api-client";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export default function CreateReceptionistPage() {
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
  });
  const { user } = useAuth();
  const router = useRouter();
  const createReceptionistMutation = useMutation({
    mutationFn: () =>
      client.post(`/clinics/${user?.clinicId}/receptionists`, {
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber || undefined,
      }),
  });
  const loading = createReceptionistMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { name?: string; email?: string; password?: string } = {};
    if (!form.name.trim()) {
      errors.name = "Enter the receptionist's full name";
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
      await createReceptionistMutation.mutateAsync();
      toast.success("Receptionist created successfully");
      router.push("/clinic/team");
    } catch {
      showUserFacingErrorToast("We could not create this receptionist account. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Create Receptionist
        </h1>
        <p className="text-muted-foreground">
          Add a new receptionist to your facility team
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Receptionist Details
          </CardTitle>
          <CardDescription>
            Enter the receptionist information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
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
                      fieldErrors.name ? "receptionist-name-error" : undefined
                    }
                  />
                  {fieldErrors.name && (
                    <p
                      id="receptionist-name-error"
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
                    placeholder="receptionist@clinic.com"
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
                      fieldErrors.email ? "receptionist-email-error" : undefined
                    }
                  />
                  {fieldErrors.email && (
                    <p
                      id="receptionist-email-error"
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
                    placeholder="Enter a strong password"
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
                      fieldErrors.password
                        ? "receptionist-password-error"
                        : undefined
                    }
                  />
                  {fieldErrors.password && (
                    <p
                      id="receptionist-password-error"
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
                    placeholder="+91 XXXXX XXXXX"
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumber: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/clinic/team")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Receptionist
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
