import { FC, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useTemplatesSettingsLogic } from "@/features/settings/hooks/use-templates-settings-logic";
import { ClinicalTemplate } from "@workspace/types";
import { Copy, Edit2, Loader2, Plus, Trash2 } from "lucide-react";

export const TemplatesSettingsUI: FC = () => {
  const { state, handlers } = useTemplatesSettingsLogic();
  const [formData, setFormData] = useState<Partial<ClinicalTemplate>>({
    name: "",
    speciality: "General",
    defaultObservations: "",
  });

  useEffect(() => {
    if (state.currentTemplate) {
      setFormData(state.currentTemplate);
    }
  }, [state.currentTemplate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlers.handleSaveTemplate(formData);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Manage prescription and document templates
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handlers.handleCreateTemplate}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </CardHeader>
        <CardContent>
          {state.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {state.templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  No templates found. Create your first clinical template.
                </div>
              ) : (
                state.templates.map((template: ClinicalTemplate) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.speciality}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handlers.handleDuplicateTemplate(template)
                        }
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlers.handleEditTemplate(template)}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handlers.handleDeleteTemplate(template.id)
                        }
                        className="text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={state.isDialogOpen} onOpenChange={handlers.setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {state.currentTemplate?.id ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              Configure your clinical template for documentation and
              prescriptions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., General Follow-up"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="speciality">Speciality / Category</Label>
              <Select
                value={formData.speciality || "General"}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, speciality: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select speciality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Cardiology">Cardiology</SelectItem>
                  <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                  <SelectItem value="Dental">Dental</SelectItem>
                  <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                  <SelectItem value="Gastroenterology">
                    Gastroenterology
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observations">Default Observations</Label>
              <Textarea
                id="observations"
                value={formData.defaultObservations}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    defaultObservations: e.target.value,
                  }))
                }
                placeholder="Enter default notes or observations..."
                rows={5}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handlers.setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={state.isSaving}>
                {state.isSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {state.currentTemplate?.id ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
