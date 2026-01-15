import { useState, useEffect } from "react";
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
import { Switch } from "@workspace/ui/components/switch";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useClinicSettings, useUpdateClinicSettings } from "@/hooks/api/use-settings";
import { toast } from "sonner";

interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

export function CustomFieldsSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateClinicSettings();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newField, setNewField] = useState<CustomField>({
    name: "",
    type: "Text",
    required: false,
  });

  useEffect(() => {
    if (clinic) {
      const s = clinic.settings as Record<string, any> || {};
      setFields(s.customFields || []);
    }
  }, [clinic]);

  const handleAddField = () => {
    if (!newField.name) return;
    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    saveFields(updatedFields);
    setIsDialogOpen(false);
    setNewField({ name: "", type: "Text", required: false });
  };

  const handleDeleteField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    saveFields(updatedFields);
  };

  const saveFields = (updatedFields: CustomField[]) => {
    updateSettings(
      { customFields: updatedFields } as any,
      {
        onSuccess: () => {
          toast.success("Custom fields updated successfully");
        },
        onError: (error) => {
          toast.error(`Failed to save custom fields: ${error.message}`);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>
              Define custom fields for patient records
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No custom fields defined.
              </div>
            ) : (
              fields.map((field, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-medium">{field.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {field.type} {field.required && "• Required"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteField(i)}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
            <DialogDescription>
              Create a new custom field for patient profiles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Field Name</Label>
              <Input
                id="name"
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                placeholder="e.g., Blood Type"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Field Type</Label>
              <Select
                value={newField.type}
                onValueChange={(val) => setNewField({ ...newField, type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Number">Number</SelectItem>
                  <SelectItem value="Date">Date</SelectItem>
                  <SelectItem value="Select">Select</SelectItem>
                  <SelectItem value="Boolean">Yes/No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="required">Required Field</Label>
              <Switch
                id="required"
                checked={newField.required}
                onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddField} disabled={!newField.name || isSaving}>
              {isSaving ? "Saving..." : "Add Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
