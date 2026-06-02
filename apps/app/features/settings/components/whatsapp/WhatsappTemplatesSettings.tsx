"use client";

import { useState } from "react";
import { MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  ClinicWhatsappTemplate,
  WhatsappTemplateCategory,
} from "@workspace/types";
import {
  useClinicWhatsappTemplates,
  useCreateWhatsappTemplate,
  useDeleteWhatsappTemplate,
  useUpdateWhatsappTemplate,
} from "@workspace/data-access";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import { ConfirmationDialog } from "@workspace/ui/components/overlay/confirmation-dialog";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

const CATEGORY_OPTIONS: Array<{
  value: WhatsappTemplateCategory;
  label: string;
}> = [
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "INVOICE", label: "Invoice" },
  { value: "PAYMENT", label: "Payment" },
  { value: "MARKETING", label: "Marketing" },
];

const CATEGORY_LABELS = new Map(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
);

const MAX_CONTENT = 2000;

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

        {templatesQuery.isLoading ? (
          <DataState status="loading" loadingMessage="Loading templates…" />
        ) : templatesQuery.isError ? (
          <DataState
            status="error"
            errorMessage="We could not load templates."
            onRetry={() => void templatesQuery.refetch()}
          />
        ) : templates.length === 0 ? (
          <DataState
            status="empty"
            emptyIcon={MessageSquarePlus}
            emptyTitle="No templates yet"
            emptyDescription="Create a reusable message to speed up patient outreach."
            emptyAction={{ label: "New template", onClick: openCreate }}
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-start justify-between gap-3 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{template.name}</span>
                    <Badge variant="secondary" className="text-[var(--fs-2xs)]">
                      {CATEGORY_LABELS.get(template.category) ??
                        template.category}
                    </Badge>
                    {template.isDefault && (
                      <Badge variant="outline" className="text-[var(--fs-2xs)]">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {template.content}
                  </p>
                </div>
                {!template.isDefault && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${template.name}`}
                      onClick={() => openEdit(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${template.name}`}
                      onClick={() => setPendingDelete(template)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CRUDDialog
        open={editor.open}
        onOpenChange={(open) => (open ? undefined : closeEditor())}
        title={isEditing ? "Edit template" : "New template"}
        isEditing={isEditing}
        isLoading={isSaving}
        onSubmit={handleSubmit}
        submitLabel={isEditing ? "Save changes" : "Create template"}
        disabled={!editor.content.trim() || (!isEditing && !editor.name.trim())}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              value={editor.name}
              onChange={(event) =>
                setEditor((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Enter template name"
              disabled={isEditing}
              maxLength={120}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Template names can&apos;t be changed after creation.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <Select
              value={editor.category}
              onValueChange={(value) =>
                setEditor((prev) => ({
                  ...prev,
                  category: value as WhatsappTemplateCategory,
                }))
              }
            >
              <SelectTrigger id="template-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-content">Message</Label>
            <Textarea
              id="template-content"
              value={editor.content}
              onChange={(event) =>
                setEditor((prev) => ({ ...prev, content: event.target.value }))
              }
              placeholder="Enter message"
              rows={6}
              maxLength={MAX_CONTENT}
            />
            <p className="text-right text-xs text-muted-foreground">
              {editor.content.length}/{MAX_CONTENT}
            </p>
          </div>
        </div>
      </CRUDDialog>

      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (open ? undefined : setPendingDelete(null))}
        title="Delete template?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will no longer be available in the patient composer.`
            : undefined
        }
        confirmText="Delete"
        type="danger"
        isLoading={deleteTemplate.isPending}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
