import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { useCreateClinicForm } from "../hooks/use-create-clinic-form";
import { FacilityDetailsSection } from "./facility-details-section";
import { AdminAccountSection } from "./admin-account-section";

export function CreateClinicDialog({ onClinicCreated }: { onClinicCreated: () => void }) {
  const { open, setOpen, loading, formData, fieldErrors, showPassword, updateField, handleOpen, handleSubmit, toggleShowPassword } = useCreateClinicForm(onClinicCreated);

  return (
    <>
      <Button onClick={handleOpen}><Plus className="mr-2 h-4 w-4" /> Add Facility</Button>
      <CRUDDialog open={open} onOpenChange={setOpen} title="Add New Facility"
        description="Create a new facility and its admin account" isLoading={loading}
        onSubmit={handleSubmit} submitLabel={loading ? "Creating…" : "Create Facility"}>
        <div className="space-y-6">
          <FacilityDetailsSection formData={formData} fieldErrors={fieldErrors} onFieldChange={updateField} />
          <AdminAccountSection formData={formData} fieldErrors={fieldErrors} showPassword={showPassword}
            onFieldChange={updateField} onTogglePassword={toggleShowPassword} />
        </div>
      </CRUDDialog>
    </>
  );
}
