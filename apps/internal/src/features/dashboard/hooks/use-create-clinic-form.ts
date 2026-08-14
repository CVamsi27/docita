import { useCallback, useState } from "react";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { apiPost } from "@/lib/api/api-client";
import {
  type CreateClinicFormData,
  type FieldErrors,
  INITIAL_FORM_DATA,
  isErrorFieldKey,
  validateCreateClinicForm,
} from "./create-clinic-form-helpers";

export function useCreateClinicForm(onClinicCreated: () => void) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateClinicFormData>({ ...INITIAL_FORM_DATA });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const updateField = useCallback(
    (field: keyof CreateClinicFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (isErrorFieldKey(field)) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const errors = validateCreateClinicForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    void (async () => {
      try {
        await apiPost("/api/internal/clinics", formData);
        setOpen(false);
        onClinicCreated();
        setFieldErrors({});
        setFormData({ ...INITIAL_FORM_DATA });
        toast.success("Facility created successfully");
      } catch (error) {
        showUserFacingErrorToast(error, "We could not create this facility right now. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [formData, onClinicCreated]);

  const handleOpen = useCallback(() => {
    setFieldErrors({});
    setOpen(true);
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return {
    open, setOpen, loading, formData, fieldErrors, showPassword,
    updateField, handleOpen, handleSubmit, toggleShowPassword,
  };
}
