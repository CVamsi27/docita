import { useState } from "react";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { Pencil } from "lucide-react";
import { Button, SymbolTooltip } from "@workspace/ui/components";
import { toast } from "sonner";
import type { ClinicType, TierName } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { apiPatch } from "@/lib/api/api-client";
import { EditClinicDetailsSection, type EditClinicFieldErrors, type EditClinicFormData } from "./edit-clinic-dialog-sections";

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

export function EditClinicDialog({ clinic, onClinicUpdated }: { clinic: Clinic; onClinicUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EditClinicFormData>({
    name: clinic.name, email: clinic.email, phone: clinic.phone,
    // check-as-cast-density: allow-file — clinic payload enums (tier/type) narrowed to canonical unions
    address: clinic.address, tier: clinic.tier as TierName, type: (clinic.type || "GENERAL") as ClinicType,
    active: clinic.active,
  });
  const [fieldErrors, setFieldErrors] = useState<EditClinicFieldErrors>({});

  const validateForm = () => {
    const errors: EditClinicFieldErrors = {};
    if (!formData.name.trim()) errors.name = "Enter the facility name";
    if (!formData.email.trim()) errors.email = "Enter an email address";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Enter a valid email address";
    if (!formData.phone.trim()) errors.phone = "Enter a phone number";
    if (!formData.address.trim()) errors.address = "Enter the facility address";
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    void (async () => {
      try {
        await apiPatch(`/api/internal/clinics/${clinic.id}`, formData);
        setOpen(false);
        onClinicUpdated();
        toast.success("Facility updated successfully");
      } catch (error) {
        showUserFacingErrorToast(error, "We could not save these facility details. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <>
      <SymbolTooltip label="Edit facility"><Button variant="ghost" size="icon" onClick={() => { setOpen(true); }} aria-label="Edit facility">
          <Pencil className="h-4 w-4" />
        </Button>
      </SymbolTooltip>
      <CRUDDialog open={open} onOpenChange={setOpen} title="Edit Facility"
        description="Update facility details and status" isLoading={loading}
        onSubmit={handleSubmit} submitLabel={loading ? "Updating\u2026" : "Update Facility"}>
        <div className="space-y-6">
          <EditClinicDetailsSection formData={formData} fieldErrors={fieldErrors} onFieldChange={(f, v) => { setFormData((p) => ({ ...p, [f]: v })); }} />
        </div>
      </CRUDDialog>
    </>
  );
}
