"use client";

import { useState, useCallback, useRef, useSyncExternalStore } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Plus, Trash2, Save, Loader2, GripVertical } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useFormOptions } from "@/lib/app-config-context";

interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  options?: string;
  required: boolean;
  order: number;
}

export function CustomFieldsSettings() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  // Get field type options from config
  const customFieldTypeOptions = useFormOptions("customFieldType");

  const [formData, setFormData] = useState({
    name: "",
    fieldType: "text",
    options: "",
    required: false,
    order: 0,
  });

  const loadFields = useCallback(async () => {
    try {
      const data = await apiFetch<CustomField[]>(`/custom-fields`, {
        showErrorToast: false,
      });
      setFields(data);
    } catch (error) {
      console.error("Failed to load custom fields", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useSyncExternalStore to trigger initial fetch
  useSyncExternalStore(
    useCallback(() => {
      if (!hasFetchedRef.current) {
        hasFetchedRef.current = true;
        loadFields();
      }
      return () => {};
    }, [loadFields]),
    () => fields,
    () => [],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const url =
        editingId && editingId !== "new"
          ? `/custom-fields/${editingId}`
          : `/custom-fields`;

      const method = editingId && editingId !== "new" ? "PUT" : "POST";

      await apiFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      await loadFields();
      setEditingId(null);
      setFormData({
        name: "",
        fieldType: "text",
        options: "",
        required: false,
        order: 0,
      });
    } catch (error) {
      console.error("Failed to save custom field", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (field: CustomField) => {
    setEditingId(field.id);
    setFormData({
      name: field.name,
      fieldType: field.fieldType,
      options: field.options || "",
      required: field.required,
      order: field.order,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom field?")) return;

    try {
      await apiFetch(`/custom-fields/${id}`, {
        method: "DELETE",
      });
      await loadFields();
    } catch (error) {
      console.error("Failed to delete custom field", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Custom Patient Fields</h3>
        <p className="text-sm text-muted-foreground">
          Define custom fields to collect clinic-specific patient information.
        </p>
      </div>

      {editingId ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId === "new" ? "New Custom Field" : "Edit Custom Field"}
            </CardTitle>
            <CardDescription>Configure the field properties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-name">Field Name</Label>
              <Input
                id="field-name"
                placeholder="e.g., Insurance Provider"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-type">Field Type</Label>
              <Select
                value={formData.fieldType}
                onValueChange={(val) =>
                  setFormData({ ...formData, fieldType: val })
                }
              >
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customFieldTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.fieldType === "select" && (
              <div className="space-y-2">
                <Label htmlFor="field-options">Options (comma-separated)</Label>
                <Input
                  id="field-options"
                  placeholder="e.g., Gold, Silver, Bronze"
                  value={formData.options}
                  onChange={(e) =>
                    setFormData({ ...formData, options: e.target.value })
                  }
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="field-required"
                checked={formData.required}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, required: checked })
                }
              />
              <Label
                htmlFor="field-required"
                className="text-sm font-normal cursor-pointer"
              >
                Required field
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.name}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Field
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Button onClick={() => setEditingId("new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Custom Field
          </Button>

          {fields.length > 0 ? (
            <div className="space-y-2">
              {fields.map((field) => (
                <Card key={field.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{field.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Type: {field.fieldType}{" "}
                          {field.required && "• Required"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(field)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(field.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-muted-foreground">
                  No custom fields defined yet.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click &quot;Add Custom Field&quot; to create your first custom
                  patient field.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
