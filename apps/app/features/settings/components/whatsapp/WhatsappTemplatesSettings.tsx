"use client";

import { useState } from "react";
import { MessageSquarePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import type {
  ClinicWhatsappTemplate,
  WhatsappTemplateCategory,
} from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  useClinicWhatsappTemplates,
  useCreateWhatsappTemplate,
  useDeleteWhatsappTemplate,
  useUpdateWhatsappTemplate,
} from "@workspace/data-access";
import { TemplateListContent } from "./TemplateListContent";
import { TemplateEditorDialog } from "./TemplateEditorDialog";
import { TemplateDeleteDialog } from "./TemplateDeleteDialog";

interface EditorState {
  open: boolean;
  template: ClinicWhatsappTemplate | null;
  name: string;
  category: WhatsappTemplateCategory;
  content: string;
}

const EMPTY_EDITOR: EditorState = {
  open: false,
  template: null,
  name: "",
  category: "FOLLOW_UP",
  content: "",
};

export function WhatsappTemplatesSettings() {
  const templatesQuery = useClinicWhatsappTemplates();
  const createTemplate = useCreateWhatsappTemplate();
  const updateTemplate = useUpdateWhatsappTemplate();
  const deleteTemplate = useDeleteWhatsappTemplate();

  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [pendingDelete, setPendingDelete] =
    useState<ClinicWhatsappTemplate | null>(null);

  const templates = templatesQuery.data ?? [];
  const isEditing = editor.template !== null;
  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  const openCreate = () => setEditor({ ...EMPTY_EDITOR, open: true });

  const openEdit = (template: ClinicWhatsappTemplate) =>
    setEditor({
      open: true,
      template,
      name: template.name,
      category: template.category,
      content: template.content,
    });

  const closeEditor = () => setEditor(EMPTY_EDITOR);

  const handleSubmit = async () => {
    const name = editor.name.trim();
    const content = editor.content.trim();
    if (!content || (!isEditing && !name)) return;

    try {
      if (isEditing && editor.template) {
        await updateTemplate.mutateAsync({
          id: editor.template.id,
          content,
          category: editor.category,
        });
        toast.success("Template updated");
      } else {
        await createTemplate.mutateAsync({
          name,
          content,
          category: editor.category,
        });
        toast.success("Template created");
      }
      closeEditor();
    } catch (error) {
      showUserFacingErrorToast(
        getUserFacingErrorMessage(error, {
          fallback: "We could not save this template. Please try again.",
          context: "save",
        }),
      );
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteTemplate.mutateAsync({ id: pendingDelete.id });
      toast.success("Template deleted");
      setPendingDelete(null);
    } catch (error) {
      showUserFacingErrorToast(
        getUserFacingErrorMessage(error, {
          fallback: "We could not delete this template. Please try again.",
          context: "delete",
        }),
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          Custom message templates
        </CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New template
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Reusable WhatsApp messages your team can send from a patient&apos;s
          Messages tab.
        </p>

        <TemplateListContent
          isLoading={templatesQuery.isLoading}
          isError={templatesQuery.isError}
          templates={templates}
          onRetry={() => void templatesQuery.refetch()}
          onCreate={openCreate}
          onEdit={openEdit}
          onDelete={setPendingDelete}
        />
      </CardContent>

      <TemplateEditorDialog
        open={editor.open}
        name={editor.name}
        category={editor.category}
        content={editor.content}
        isEditing={isEditing}
        isLoading={isSaving}
        canSubmit={!!editor.content.trim() && (isEditing || !!editor.name.trim())}
        onOpenChange={(open) => (open ? undefined : closeEditor())}
        onNameChange={(name) =>
          setEditor((prev) => ({ ...prev, name }))
        }
        onCategoryChange={(category) =>
          setEditor((prev) => ({ ...prev, category }))
        }
        onContentChange={(content) =>
          setEditor((prev) => ({ ...prev, content }))
        }
        onSubmit={handleSubmit}
      />

      <TemplateDeleteDialog
        pendingDelete={pendingDelete}
        isLoading={deleteTemplate.isPending}
        onOpenChange={(open) => (open ? undefined : setPendingDelete(null))}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
