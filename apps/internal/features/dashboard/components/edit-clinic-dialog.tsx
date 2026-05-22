"use client";

import { useState } from "react";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Pencil } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { client } from "@/lib/api/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import PhoneInput from "react-phone-number-input";
import { toast } from "sonner";
import {
  CLINIC_TYPE_OPTIONS,
  type ClinicType,
  clinicTypeSchema,
  mapDbClinicTierStringToTierName,
  PUBLISHED_PLAN_LADDER,
  TIER_INFO,
  type TierName,
  tierSchema,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { resolveLibPhoneCountry } from "@/lib/phone/resolve-libphone-country";
import { CLINIC_TYPE_DESCRIPTIONS } from "@/lib/clinic-display";

type EditClinicFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: TierName;
  type: ClinicType;
  active: boolean;
};

function resolveClinicType(type: string | undefined): ClinicType {
  const parsed = clinicTypeSchema.safeParse(type ?? "GENERAL");
  return parsed.success ? parsed.data : "GENERAL";
}

function getInitialFormData(clinic: Clinic | null): EditClinicFormData {
  if (!clinic) {
    return {
      name: "",
      email: "",
      phone: "",
      address: "",
      tier: "STARTER",
      type: "GENERAL",
      active: true,
    };
  }
  return {
    name: clinic.name,
    email: clinic.email,
    phone: clinic.phone,
    address: clinic.address,
    tier: mapDbClinicTierStringToTierName(clinic.tier),
    type: resolveClinicType(clinic.type),
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
  settings?: Record<string, unknown>;
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

    if (!formData.name.trim()) errors.name = "Enter the facility name";
    if (!formData.email.trim()) {
      errors.email = "Enter an email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid email address";
    }
    if (!formData.phone.trim()) errors.phone = "Enter a phone number";
    if (!formData.address.trim()) errors.address = "Enter the facility address";

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
        toast.success("Facility updated successfully");
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not save these facility details. Please try again.",
          "save",
        );
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <>
      <SymbolTooltip label="Edit facility">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Edit facility"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
      <CRUDDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Edit Facility"
        description="Update facility details and status"
        isLoading={loading}
        onSubmit={handleSubmit}
        submitLabel={loading ? "Updating…" : "Update Facility"}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Facility Name</Label>
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
                <PhoneInput
                  id="edit-phone"
                  value={formData.phone}
                  international
                  defaultCountry={resolveLibPhoneCountry(clinic.settings)}
                  onChange={(value: string | undefined) => {
                    setFormData({ ...formData, phone: value ?? "" });
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="Enter phone number"
                  className="flex min-h-[5rem] min-w-0 flex-col gap-2 rounded-[var(--radius)] border border-input bg-background/60 p-3 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/50 sm:flex-row sm:items-center sm:gap-3 sm:min-h-10 [&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:w-full [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:items-center sm:[&_.PhoneInputCountry]:w-[9.5rem] [&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputCountrySelect]:rounded-[var(--radius)] [&_.PhoneInputCountrySelect]:bg-background [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:text-muted-foreground sm:[&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none"
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
                  onValueChange={(val) => {
                    const parsed = tierSchema.safeParse(val);
                    if (!parsed.success) return;
                    setFormData({ ...formData, tier: parsed.data });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLISHED_PLAN_LADDER.map((tier) => (
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
                onValueChange={(val) => {
                  const parsed = clinicTypeSchema.safeParse(val);
                  if (!parsed.success) return;
                  setFormData({ ...formData, type: parsed.data });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Facility type" />
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
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CRUDDialog>
    </>
  );
}
