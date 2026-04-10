import { useState } from "react";
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from "@/hooks/api/use-clinical";
import { ClinicalTemplate } from "@workspace/types";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export const useTemplatesSettingsLogic = () => {
  const { data: templates, isLoading } = useTemplates();
  const { mutate: deleteTemplate } = useDeleteTemplate();
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] =
    useState<Partial<ClinicalTemplate> | null>(null);

  const handleCreateTemplate = () => {
    setCurrentTemplate({
      name: "",
      speciality: "General",
      fields: [],
      defaultObservations: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (template: ClinicalTemplate) => {
    setCurrentTemplate(template);
    setIsDialogOpen(true);
  };

  const handleDuplicateTemplate = (template: ClinicalTemplate) => {
    createTemplate(
      {
        name: `${template.name} (Copy)`,
        speciality: template.speciality,
        fields: template.fields,
        defaultObservations: template.defaultObservations,
      },
      {
        onSuccess: () => toast.success("Template duplicated successfully"),
        onError: (err) =>
          showUserFacingErrorToast(
            err,
            "We could not duplicate the template. Please try again.",
            "save",
          ),
      },
    );
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(
      { id },
      {
      onSuccess: () => toast.success("Template deleted"),
      onError: (err) =>
        showUserFacingErrorToast(
          err,
          "We could not delete the template. Please try again.",
          "delete",
        ),
      },
    );
  };

  const handleSaveTemplate = (data: Partial<ClinicalTemplate>) => {
    if (currentTemplate?.id) {
      updateTemplate(
        {
          id: currentTemplate.id,
          ...data,
        } as ClinicalTemplate,
        {
          onSuccess: () => {
            toast.success("Template updated");
            setIsDialogOpen(false);
          },
          onError: (err) =>
            showUserFacingErrorToast(
              err,
              "We could not update the template. Please try again.",
              "save",
            ),
        },
      );
    } else {
      createTemplate(data as Omit<ClinicalTemplate, "id">, {
        onSuccess: () => {
          toast.success("Template created");
          setIsDialogOpen(false);
        },
        onError: (err) =>
          showUserFacingErrorToast(
            err,
            "We could not create the template. Please try again.",
            "save",
          ),
      });
    }
  };

  return {
    state: {
      templates: templates || [],
      isLoading,
      isDialogOpen,
      currentTemplate,
      isSaving: isCreating || isUpdating,
    },
    handlers: {
      setIsDialogOpen,
      handleCreateTemplate,
      handleEditTemplate,
      handleDuplicateTemplate,
      handleDeleteTemplate,
      handleSaveTemplate,
    },
  };
};
