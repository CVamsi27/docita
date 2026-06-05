"use client";

import { useState } from "react";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { Pencil } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { client } from "@/lib/api/api-client";
import { toast } from "sonner";
import {
  clinicTypeSchema,
  mapDbClinicTierStringToTierName,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { resolveLibPhoneCountry } from "@/lib/phone/resolve-libphone-country";
import {
  EditClinicDetailsSection,
  type EditClinicFieldErrors,
  type EditClinicFormData,
} from "./edit-clinic-dialog-sections";

function resolveClinicType(type: string | undefined): EditClinicFormData["type"] {
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
      type: "GENERAL" as const,
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
  const [fieldErrors, setFieldErrors] = useState<EditClinicFieldErrors>({});

  const validateForm = () => {
    const errors: EditClinicFieldErrors = {};

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

  const updateField = (field: keyof EditClinicFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "name" || field === "email" || field === "phone" || field === "address") {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
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
          <EditClinicDetailsSection
            formData={formData}
            fieldErrors={fieldErrors}
            onFieldChange={updateField}
            phoneCountryCode={resolveLibPhoneCountry(clinic.settings)}
          />
        </div>
      </CRUDDialog>
    </>
  );
}
