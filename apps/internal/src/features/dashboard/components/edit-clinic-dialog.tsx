import { useRef, useState, type RefObject } from "react";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { Pencil } from "lucide-react";
import { Button, SymbolTooltip } from "@workspace/ui/components";
import { toast } from "sonner";
import {
  clinicTypeSchema,
  tierSchema,
  type InternalClinicListEntry,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { apiPatch } from "@/lib/api/api-client";
import {
  EditClinicDetailsSection,
  type EditClinicFieldErrors,
  type EditClinicFormData,
} from "./edit-clinic-dialog-sections";

export function EditClinicDialog({
  clinic,
  onClinicUpdated,
  triggerVariant = "icon",
  returnFocusRef,
}: {
  clinic: InternalClinicListEntry;
  onClinicUpdated: () => void;
  triggerVariant?: "icon" | "text";
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Saving may remove the edit trigger; cancellation keeps it mounted.
  const closeFocusRef = {
    get current() {
      return triggerRef.current?.isConnected
        ? triggerRef.current
        : (returnFocusRef?.current ?? null);
    },
  };
  const [loading, setLoading] = useState(false);
  const currentValues = (): EditClinicFormData => {
    const parsedTier = tierSchema.safeParse(clinic.tier);
    const parsedClinicType = clinicTypeSchema.safeParse(
      clinic.type ?? "GENERAL",
    );
    return {
      name: clinic.name,
      email: clinic.email ?? "",
      phone: clinic.phone ?? "",
      address: clinic.address ?? "",
      tier: parsedTier.success ? parsedTier.data : "STARTER",
      type: parsedClinicType.success ? parsedClinicType.data : "GENERAL",
      active: clinic.active,
    };
  };
  const [formData, setFormData] = useState<EditClinicFormData>(currentValues);
  const [fieldErrors, setFieldErrors] = useState<EditClinicFieldErrors>({});

  const handleOpen = () => {
    setFormData(currentValues());
    setFieldErrors({});
    setOpen(true);
  };

  const validateForm = () => {
    const errors: EditClinicFieldErrors = {};
    if (!formData.name.trim()) errors.name = "Enter the facility name";
    if (!formData.email.trim()) errors.email = "Enter an email address";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Enter a valid email address";
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
        showUserFacingErrorToast(
          error,
          "We could not save these facility details. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <>
      {triggerVariant === "text" ? (
        <Button
          variant="primary"
          ref={triggerRef}
          className="w-full"
          onClick={handleOpen}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Edit facility
        </Button>
      ) : (
        <SymbolTooltip label="Edit facility">
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            onClick={handleOpen}
            aria-label="Edit facility"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        </SymbolTooltip>
      )}
      <CRUDDialog
        returnFocusRef={closeFocusRef}
        open={open}
        onOpenChange={setOpen}
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
            onFieldChange={(f, v) => {
              setFormData((p) => ({ ...p, [f]: v }));
            }}
          />
        </div>
      </CRUDDialog>
    </>
  );
}
