"use client";

// jscpd:ignore-start
import type { WhatsappTemplateCategory } from "@workspace/types";
import { whatsappTemplateCategorySchema } from "@workspace/types";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";

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

const MAX_CONTENT = 2000;

interface TemplateEditorDialogProps {
  open: boolean;
  name: string;
  category: WhatsappTemplateCategory;
  content: string;
  isEditing: boolean;
  isLoading: boolean;
  canSubmit: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (name: string) => void;
  onCategoryChange: (category: WhatsappTemplateCategory) => void;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
}

export function TemplateEditorDialog({
  open,
  name,
  category,
  content,
  isEditing,
  isLoading,
  canSubmit,
  onOpenChange,
  onNameChange,
  onCategoryChange,
  onContentChange,
  onSubmit,
}: TemplateEditorDialogProps) {
  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit template" : "New template"}
      isEditing={isEditing}
      isLoading={isLoading}
      onSubmit={onSubmit}
      submitLabel={isEditing ? "Save changes" : "Create template"}
      disabled={!canSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="template-name">Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
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
            value={category}
            onValueChange={(value) =>
              onCategoryChange(whatsappTemplateCategorySchema.parse(value))
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
{/* jscpd:ignore-end */}
          <Textarea
            id="template-content"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="Enter message"
            rows={6}
            maxLength={MAX_CONTENT}
          />
          <p className="text-right text-xs text-muted-foreground">
            {content.length}/{MAX_CONTENT}
          </p>
        </div>
      </div>
    </CRUDDialog>
  );
}
