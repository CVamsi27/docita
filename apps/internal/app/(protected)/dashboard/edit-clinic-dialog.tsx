"use client";

import { useState } from "react";
import { CRUDDialog } from "@workspace/ui/components/crud-dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Pencil } from "lucide-react";
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

function normalizeTierName(tier: string): TierName {
  const legacyMapping: Record<string, TierName> = {
    FREE: "STARTER",
    CAPTURE: "STARTER",
    CORE: "ESSENTIAL",
    PLUS: "ESSENTIAL",
    PRO: "PROFESSIONAL",
    CLINIC: "PROFESSIONAL",
  };
  return (legacyMapping[tier] || tier) as TierName;
}

function getInitialFormData(clinic: Clinic | null) {
  if (!clinic) {
    return {
      name: "",
      email: "",
      phone: "",
      address: "",
      tier: "STARTER",
      type: "GENERAL" as ClinicType,
      active: true,
    };
  }
  return {
    name: clinic.name,
    email: clinic.email,
    phone: clinic.phone,
    address: clinic.address,
    tier: normalizeTierName(clinic.tier),
    type: (clinic.type || "GENERAL") as ClinicType,
    active: clinic.active,
  };
}

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: string;
  type?: string;
  active: boolean;
}

export function EditClinicDialog({
  clinic,
  onClinicUpdated,
}: {
  clinic: Clinic;
  onClinicUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => getInitialFormData(clinic));
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({});

  const validateForm = () => {
    const errors: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    } = {};

    if (!formData.name.trim()) errors.name = "Enter the clinic name";
    if (!formData.email.trim()) {
      errors.email = "Enter an email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid email address";
    }
    if (!formData.phone.trim()) errors.phone = "Enter a phone number";
    if (!formData.address.trim()) errors.address = "Enter the clinic address";

    return errors;
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(getInitialFormData(clinic));
    }
    setFieldErrors({});
    setOpen(newOpen);
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
        await client.patch(`/internal/clinics/${clinic.id}`, formData);
        setOpen(false);
        onClinicUpdated();
        toast.success("Clinic updated successfully");
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not save these clinic details. Please try again.",
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
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Edit clinic"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <CRUDDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Edit Clinic"
        description="Update clinic details and status"
        isLoading={loading}
        onSubmit={handleSubmit}
        submitLabel={loading ? "Updating..." : "Update Clinic"}
      >
        <form className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Clinic Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={
                    fieldErrors.name ? "edit-clinic-name-error" : undefined
                  }
                />
                {fieldErrors.name && (
                  <p
                    id="edit-clinic-name-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
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
                    fieldErrors.email ? "edit-clinic-email-error" : undefined
                  }
                />
                {fieldErrors.email && (
                  <p
                    id="edit-clinic-email-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={
                    fieldErrors.phone ? "edit-clinic-phone-error" : undefined
                  }
                />
                {fieldErrors.phone && (
                  <p
                    id="edit-clinic-phone-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tier">Subscription Tier</Label>
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
              <Label htmlFor="edit-type">Clinic Type</Label>
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
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  if (fieldErrors.address) {
                    setFieldErrors((prev) => ({ ...prev, address: undefined }));
                  }
                }}
                aria-invalid={!!fieldErrors.address}
                aria-describedby={
                  fieldErrors.address ? "edit-clinic-address-error" : undefined
                }
              />
              {fieldErrors.address && (
                <p
                  id="edit-clinic-address-error"
                  className="text-sm text-destructive"
                >
                  {fieldErrors.address}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-active">Status</Label>
              <Select
                value={formData.active ? "active" : "inactive"}
                onValueChange={(val) =>
                  setFormData({ ...formData, active: val === "active" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </CRUDDialog>
    </>
  );
}
