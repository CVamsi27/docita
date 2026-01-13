import { useState } from "react";
import { apiHooks } from "@/lib/api-hooks";
import { ClinicalTemplate } from "@workspace/types";
import { toast } from "sonner";

export const useTemplatesSettingsLogic = () => {
  const { data: templates, isLoading } = apiHooks.useTemplates();
  const { mutate: deleteTemplate } = apiHooks.useDeleteTemplate();
  const { mutate: createTemplate, isPending: isCreating } =
    apiHooks.useCreateTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } =
    apiHooks.useUpdateTemplate();

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
          toast.error(`Failed to duplicate template: ${err.message}`),
      },
    );
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id, {
      onSuccess: () => toast.success("Template deleted"),
      onError: (err) =>
        toast.error(`Failed to delete template: ${err.message}`),
    });
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
            toast.error(`Failed to update template: ${err.message}`),
        },
      );
    } else {
      createTemplate(data as Omit<ClinicalTemplate, "id">, {
        onSuccess: () => {
          toast.success("Template created");
          setIsDialogOpen(false);
        },
        onError: (err) =>
          toast.error(`Failed to create template: ${err.message}`),
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
