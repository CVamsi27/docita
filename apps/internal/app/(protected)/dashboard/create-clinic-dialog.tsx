"use client";

import { useState } from "react";
import { CRUDDialog } from "@workspace/ui/components/crud-dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Eye, EyeOff, Plus, Shield, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { client } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "sonner";
import { TIER_INFO, type TierName } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

const AVAILABLE_TIERS: TierName[] = [
  "STARTER",
  "ESSENTIAL",
  "PROFESSIONAL",
  "ENTERPRISE",
];

const CLINIC_TYPES = [
  {
    value: "GENERAL",
    label: "General Medicine",
    description: "Multi-specialty clinic",
  },
  {
    value: "DENTAL",
    label: "Dental Clinic",
    description: "Dentistry & Orthodontics",
  },
  {
    value: "PEDIATRIC",
    label: "Pediatric Clinic",
    description: "Child Health",
  },
  {
    value: "ORTHOPEDIC",
    label: "Orthopedic Clinic",
    description: "Bone & Joint Specialist",
  },
  {
    value: "CARDIOLOGY",
    label: "Cardiology Clinic",
    description: "Heart Specialist",
  },
  {
    value: "DERMATOLOGY",
    label: "Dermatology Clinic",
    description: "Skin Care",
  },
  { value: "ENT", label: "ENT Clinic", description: "Ear, Nose & Throat" },
  {
    value: "GYNECOLOGY",
    label: "Gynecology Clinic",
    description: "Women's Health",
  },
  {
    value: "OPHTHALMOLOGY",
    label: "Ophthalmology Clinic",
    description: "Eye Care",
  },
  {
    value: "PSYCHIATRY",
    label: "Psychiatry Clinic",
    description: "Mental Health",
  },
  {
    value: "SPECIALTY",
    label: "Other Specialty",
    description: "Custom specialty clinic",
  },
] as const;

type ClinicType = (typeof CLINIC_TYPES)[number]["value"];

export function CreateClinicDialog({
  onClinicCreated,
}: {
  onClinicCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tier: "STARTER",
    type: "GENERAL" as ClinicType,
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminType: "admin" as "admin" | "admin_doctor",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
  }>({});

  const validateForm = () => {
    const errors: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      adminName?: string;
      adminEmail?: string;
      adminPassword?: string;
    } = {};

    if (!formData.name.trim()) errors.name = "Enter the clinic name";
    if (!formData.email.trim()) {
      errors.email = "Enter the clinic email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid clinic email address";
    }
    if (!formData.phone.trim()) errors.phone = "Enter a phone number";
    if (!formData.address.trim()) errors.address = "Enter the clinic address";

    if (!formData.adminName.trim()) errors.adminName = "Enter the admin's name";
    if (!formData.adminEmail.trim()) {
      errors.adminEmail = "Enter the admin's email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      errors.adminEmail = "Enter a valid admin email address";
    }
    if (!formData.adminPassword.trim()) {
      errors.adminPassword = "Enter a password for the admin";
    }

    return errors;
  };

  const handleSubmit = () => {
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    (async () => {
      try {
        await client.post("/internal/clinics", formData);

        setOpen(false);
        onClinicCreated();
        setFieldErrors({});
        setFormData({
          name: "",
          email: "",
          phone: "",
          address: "",
          tier: "STARTER",
          type: "GENERAL",
          adminName: "",
          adminEmail: "",
          adminPassword: "",
          adminType: "admin",
        });
        toast.success("Clinic created successfully");
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not create this clinic right now. Please try again.",
          "save",
        );
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <>
      <Button
        onClick={() => {
          setFieldErrors({});
          setOpen(true);
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Clinic
      </Button>
      <CRUDDialog
        open={open}
        onOpenChange={setOpen}
        title="Add New Clinic"
        description="Create a new clinic and its admin account"
        isLoading={loading}
        onSubmit={handleSubmit}
        submitLabel={loading ? "Creating..." : "Create Clinic"}
      >
        <form className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Clinic Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Clinic Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={
                    fieldErrors.name ? "create-clinic-name-error" : undefined
                  }
                />
                {fieldErrors.name && (
                  <p
                    id="create-clinic-name-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={
                    fieldErrors.email ? "create-clinic-email-error" : undefined
                  }
                />
                {fieldErrors.email && (
                  <p
                    id="create-clinic-email-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={
                    fieldErrors.phone ? "create-clinic-phone-error" : undefined
                  }
                />
                {fieldErrors.phone && (
                  <p
                    id="create-clinic-phone-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Subscription Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(val) =>
                    setFormData({ ...formData, tier: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TIERS.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {TIER_INFO[tier].name.replace("Docita ", "")} (
                        {TIER_INFO[tier].tagline})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Clinic Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  setFormData({ ...formData, type: val as ClinicType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic type" />
                </SelectTrigger>
                <SelectContent>
                  {CLINIC_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  if (fieldErrors.address) {
                    setFieldErrors((prev) => ({ ...prev, address: undefined }));
                  }
                }}
                aria-invalid={!!fieldErrors.address}
                aria-describedby={
                  fieldErrors.address
                    ? "create-clinic-address-error"
                    : undefined
                }
              />
              {fieldErrors.address && (
                <p
                  id="create-clinic-address-error"
                  className="text-sm text-destructive"
                >
                  {fieldErrors.address}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Admin Account
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Name</Label>
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) => {
                    setFormData({ ...formData, adminName: e.target.value });
                    if (fieldErrors.adminName) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        adminName: undefined,
                      }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.adminName}
                  aria-describedby={
                    fieldErrors.adminName
                      ? "create-clinic-admin-name-error"
                      : undefined
                  }
                />
                {fieldErrors.adminName && (
                  <p
                    id="create-clinic-admin-name-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.adminName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => {
                    setFormData({ ...formData, adminEmail: e.target.value });
                    if (fieldErrors.adminEmail) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        adminEmail: undefined,
                      }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.adminEmail}
                  aria-describedby={
                    fieldErrors.adminEmail
                      ? "create-clinic-admin-email-error"
                      : undefined
                  }
                />
                {fieldErrors.adminEmail && (
                  <p
                    id="create-clinic-admin-email-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.adminEmail}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password</Label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.adminPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, adminPassword: e.target.value });
                    if (fieldErrors.adminPassword) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        adminPassword: undefined,
                      }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.adminPassword}
                  aria-describedby={
                    fieldErrors.adminPassword
                      ? "create-clinic-admin-password-error"
                      : undefined
                  }
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
              {fieldErrors.adminPassword && (
                <p
                  id="create-clinic-admin-password-error"
                  className="text-sm text-destructive"
                >
                  {fieldErrors.adminPassword}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminType">Admin Type *</Label>
              <Select
                value={formData.adminType}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    adminType: value as "admin" | "admin_doctor",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select admin type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Clinic Admin (manages clinics with multiple doctors)
                    </div>
                  </SelectItem>
                  <SelectItem value="admin_doctor">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Doctor (for single-doctor clinics)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.adminType === "admin_doctor"
                  ? "Admin Doctor can manage clinic operations and also act as a doctor"
                  : "Clinic Admin manages clinic operations and staff"}
              </p>
            </div>
          </div>
        </form>
      </CRUDDialog>
    </>
  );
}
