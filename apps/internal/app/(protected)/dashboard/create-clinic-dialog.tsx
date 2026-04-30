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
import PhoneInput, { type Country } from "react-phone-number-input";
import { toast } from "sonner";
import { CLINIC_TYPE_OPTIONS, type ClinicType, TIER_INFO, type TierName } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { DEFAULT_COUNTRY_CODE } from "@workspace/utils";

const AVAILABLE_TIERS: TierName[] = [
  "STARTER",
  "ESSENTIAL",
  "PROFESSIONAL",
  "ENTERPRISE",
];

const CLINIC_TYPE_DESCRIPTIONS: Partial<Record<ClinicType, string>> = {
  GENERAL: "Multi-specialty facility",
  DENTAL: "Dentistry & Orthodontics",
  PEDIATRIC: "Child Health",
  ORTHOPEDIC: "Bone & Joint Specialist",
  CARDIOLOGY: "Heart Specialist",
  DERMATOLOGY: "Skin Care",
  ENT: "Ear, Nose & Throat",
  GYNECOLOGY: "Women's Health",
  OPHTHALMOLOGY: "Eye Care",
  PSYCHIATRY: "Mental Health",
  SPECIALTY: "Custom specialty facility",
};

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

    if (!formData.name.trim()) errors.name = "Enter the facility name";
    if (!formData.email.trim()) {
      errors.email = "Enter the facility email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid facility email address";
    }
    if (!formData.phone.trim()) errors.phone = "Enter a phone number";
    if (!formData.address.trim()) errors.address = "Enter the facility address";

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
        toast.success("Facility created successfully");
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not create this facility right now. Please try again.",
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
        Add Facility
      </Button>
      <CRUDDialog
        open={open}
        onOpenChange={setOpen}
        title="Add New Facility"
        description="Create a new facility and its admin account"
        isLoading={loading}
        onSubmit={handleSubmit}
        submitLabel={loading ? "Creating..." : "Create Facility"}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Facility Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Facility Name</Label>
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
                <PhoneInput
                  id="phone"
                  value={formData.phone}
                  international
                  defaultCountry={DEFAULT_COUNTRY_CODE as Country}
                  onChange={(value: string | undefined) => {
                    setFormData({ ...formData, phone: value ?? "" });
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="Enter phone number"
                  className="flex min-h-[5rem] min-w-0 flex-col gap-2 rounded-lg border border-input bg-background/60 p-3 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/50 sm:flex-row sm:items-center sm:gap-3 sm:min-h-10 [&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:w-full [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:items-center sm:[&_.PhoneInputCountry]:w-[9.5rem] [&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputCountrySelect]:rounded-lg [&_.PhoneInputCountrySelect]:bg-background [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:text-muted-foreground sm:[&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none"
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
                  <SelectValue placeholder="Select facility type" />
                </SelectTrigger>
                <SelectContent>
                  {CLINIC_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        {CLINIC_TYPE_DESCRIPTIONS[type.value] ? (
                          <span className="text-xs text-muted-foreground">
                            {CLINIC_TYPE_DESCRIPTIONS[type.value]}
                          </span>
                        ) : null}
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
        </div>
      </CRUDDialog>
    </>
  );
}
