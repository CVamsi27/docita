"use client";

import { useState, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { BookmarkPlus, Trash2, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Medication } from "@workspace/types";
import { EmptyState } from "@/components/ui/empty-state";

interface PrescriptionTemplateManagerProps {
  medications: Medication[];
  instructions: string;
  onLoadTemplate: (medications: Medication[], instructions: string) => void;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  medications: Medication[];
  instructions?: string;
}

export function PrescriptionTemplateManager({
  medications,
  instructions,
  onLoadTemplate,
}: PrescriptionTemplateManagerProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Ref-based sync for loading templates when dialog opens
  const lastOpenRef = useRef(false);
  if (open && !lastOpenRef.current) {
    apiFetch<Template[]>(`/prescription-templates`, { showErrorToast: false })
      .then((data) => setTemplates(data))
      .catch((error) => console.error("Failed to load templates:", error));
  }
  lastOpenRef.current = open;

  const loadTemplates = async () => {
    try {
      const data = await apiFetch<Template[]>(`/prescription-templates`, {
        showErrorToast: false,
      });
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;

    setSaving(true);
    try {
      await apiFetch(`/prescription-templates`, {
        method: "POST",
        body: JSON.stringify({
          name: templateName,
          description: templateDescription || undefined,
          medications,
          instructions: instructions || undefined,
        }),
      });
      setTemplateName("");
      setTemplateDescription("");
      await loadTemplates();
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await apiFetch(`/prescription-templates/${id}`, {
        method: "DELETE",
      });
      await loadTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const loadTemplate = (template: Template) => {
    onLoadTemplate(template.medications, template.instructions || "");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookmarkPlus className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prescription Templates</DialogTitle>
          <DialogDescription>
            Save current prescription as a template or load a saved template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Save Current as Template */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-medium text-sm">Save Current Prescription</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Diabetes Management"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="template-description"
                  placeholder="Brief description of when to use this template..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                onClick={saveTemplate}
                disabled={!templateName.trim() || saving}
                className="w-full"
              >
                {saving ? "Saving..." : "Save as Template"}
              </Button>
            </div>
          </div>

          {/* Saved Templates */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Saved Templates</h3>
            {templates.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No templates saved yet"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => loadTemplate(template)}
                    >
                      <p className="font-medium text-sm">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.medications.length} medication(s)
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
