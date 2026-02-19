import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Form, FormControl, FormField } from "@workspace/ui/components/form";
import { FormFieldGroup } from "@workspace/ui/components";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  ClinicAppSettings,
  CustomField,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import { requiredStringSchema } from "@/features/_shared/schemas/common.schemas";

const customFieldSchema = z.object({
  name: requiredStringSchema("Field Name"),
  type: z.enum(["Text", "Number", "Date", "Select", "Boolean"]),
  required: z.boolean(),
});

type CustomFieldFormValues = z.infer<typeof customFieldSchema>;

export function CustomFieldsSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      name: "",
      type: "Text",
      required: false,
    },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset({
        name: "",
        type: "Text",
        required: false,
      });
    }
  }, [isDialogOpen, form]);

  useEffect(() => {
    if (clinic) {
      const s = (clinic.settings as ClinicAppSettings) || {};
      setFields(s.customFields || []);
    }
  }, [clinic]);

  const handleAddField = (data: CustomFieldFormValues) => {
    const updatedFields = [...fields, data];
    setFields(updatedFields);
    saveFields(updatedFields);
    setIsDialogOpen(false);
  };

  const handleDeleteField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    saveFields(updatedFields);
  };

  const saveFields = (updatedFields: CustomField[]) => {
    updateSettings(
      { customFields: updatedFields },
      {
        onSuccess: () => {
          toast.success("Custom fields updated successfully");
        },
        onError: (error) => {
          toast.error(`Failed to save custom fields: ${error.message}`);
        },
      },
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
          <Button
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="gap-2"
          >
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
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddField)}
              noValidate
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormFieldGroup
                    label="Field Name"
                    required
                    error={form.formState.errors.name?.message}
                  >
                    <FormControl>
                      <Input placeholder="e.g., Blood Type" {...field} />
                    </FormControl>
                  </FormFieldGroup>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormFieldGroup
                    label="Field Type"
                    error={form.formState.errors.type?.message}
                  >
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Text">Text</SelectItem>
                        <SelectItem value="Number">Number</SelectItem>
                        <SelectItem value="Date">Date</SelectItem>
                        <SelectItem value="Select">Select</SelectItem>
                        <SelectItem value="Boolean">Yes/No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormFieldGroup>
                )}
              />

              <FormField
                control={form.control}
                name="required"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Required Field</Label>
                      <div className="text-sm text-muted-foreground">
                        Make this field mandatory
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                )}
              />

              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Add Field"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
