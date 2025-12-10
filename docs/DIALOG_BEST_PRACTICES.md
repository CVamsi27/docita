# Dialog Components - Best Practices & Patterns

## Table of Contents

1. [State Management](#state-management)
2. [Form Integration](#form-integration)
3. [Error Handling](#error-handling)
4. [Loading States](#loading-states)
5. [Validation](#validation)
6. [Accessibility](#accessibility)
7. [Performance](#performance)
8. [Common Patterns](#common-patterns)
9. [Anti-Patterns](#anti-patterns)

## State Management

### ✅ DO: Use Controlled State

Always use controlled state for dialogs:

```tsx
const [open, setOpen] = useState(false);

<CRUDDialog open={open} onOpenChange={setOpen} />;
```

**Why:** Provides predictable behavior and enables external control (e.g., closing after successful submission).

### ✅ DO: Reset Form on Close

Reset forms when the dialog closes:

```tsx
const [open, setOpen] = useState(false);
const form = useForm({ defaultValues: initialValues });

const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    form.reset(); // Reset when closing
  }
  setOpen(newOpen);
};

<CRUDDialog open={open} onOpenChange={handleOpenChange} />;
```

### ❌ DON'T: Use Uncontrolled State

Avoid uncontrolled state:

```tsx
// ❌ Don't do this
<CRUDDialog defaultOpen={true} />
```

### ❌ DON'T: Manage Multiple Open States

```tsx
// ❌ Don't do this
const [addOpen, setAddOpen] = useState(false);
const [editOpen, setEditOpen] = useState(false);
const [deleteOpen, setDeleteOpen] = useState(false);

// Better approach:
const [openDialog, setOpenDialog] = useState<null | "add" | "edit" | "delete">(
  null,
);
```

## Form Integration

### ✅ DO: Use React Hook Form

Leverage React Hook Form for robust form handling:

```tsx
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: {
    /* ... */
  },
});

<FormDialog
  open={open}
  onOpenChange={setOpen}
  isLoading={form.formState.isSubmitting}
>
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* FormField components */}
    </form>
  </Form>
</FormDialog>;
```

### ✅ DO: Validate Before Submission

Always validate:

```tsx
const onSubmit = async (data) => {
  try {
    // Validation happens automatically via Zod resolver
    const result = await api.save(data);
    setOpen(false);
  } catch (error) {
    // Form stays open for corrections
  }
};
```

### ✅ DO: Preserve Form Data on Error

Keep the dialog open if submission fails:

```tsx
const handleSubmit = async (data) => {
  try {
    await api.save(data);
    setOpen(false); // Only close on success
  } catch (error) {
    toast.error(error.message);
    // Dialog stays open, form data preserved
  }
};
```

### ❌ DON'T: Create Separate Forms for Edit

```tsx
// ❌ Don't do this
const AddForm = () => {
  /* */
};
const EditForm = () => {
  /* */
};

// ✅ Instead:
interface PatientFormProps {
  data?: Patient;
  onSubmit: (data: CreatePatientInput) => Promise<void>;
}

const PatientForm = ({ data, onSubmit }: PatientFormProps) => {
  const form = useForm({
    defaultValues:
      data ||
      {
        /* defaults */
      },
  });
};
```

### ❌ DON'T: Reset Form Outside the Dialog

```tsx
// ❌ Don't reset on every render
useEffect(() => {
  form.reset(); // This resets on every render!
}, []);

// ✅ Reset only when opening/closing
const handleOpenChange = (newOpen: boolean) => {
  if (!newOpen) {
    form.reset();
  }
  setOpen(newOpen);
};
```

## Error Handling

### ✅ DO: Show Errors in Toast + Form

Display field-level errors in form, general errors in toast:

```tsx
const onSubmit = async (data) => {
  try {
    await api.save(data);
  } catch (error) {
    if (error.fieldErrors) {
      // Set field errors in form
      Object.entries(error.fieldErrors).forEach(([field, message]) => {
        form.setError(field, { message });
      });
    } else {
      // Show general error in toast
      toast.error(error.message);
    }
  }
};
```

### ✅ DO: Handle Async Errors Gracefully

```tsx
const handleDelete = async (id: string) => {
  try {
    await api.delete(id);
    toast.success("Deleted successfully");
    onOpenChange(false);
  } catch (error) {
    if (error.status === 404) {
      toast.error("Item not found");
    } else if (error.status === 409) {
      toast.error("Cannot delete: item is in use");
    } else {
      toast.error("Delete failed. Please try again.");
    }
  }
};
```

### ❌ DON'T: Ignore Errors

```tsx
// ❌ Don't do this
const handleSubmit = async (data) => {
  await api.save(data); // What if this fails?
  setOpen(false);
};

// ✅ Do this
const handleSubmit = async (data) => {
  try {
    await api.save(data);
    setOpen(false);
  } catch (error) {
    toast.error(error.message);
  }
};
```

### ❌ DON'T: Show Errors Without Context

```tsx
// ❌ Not helpful
toast.error("Error");

// ✅ Be specific
toast.error("Failed to create patient: Email already in use");
```

## Loading States

### ✅ DO: Use Form's isSubmitting

```tsx
const form = useForm({ resolver: zodResolver(schema) });

<FormDialog
  isLoading={form.formState.isSubmitting}
  // Automatically managed by react-hook-form
/>;
```

### ✅ DO: Disable Inputs During Loading

```tsx
<FormDialog
  disabled={form.formState.isSubmitting}
  // Disables all interactive elements
/>
```

### ✅ DO: Show Loading Indicators

```tsx
const [loading, setLoading] = useState(false);

const handleDelete = async () => {
  setLoading(true);
  try {
    await api.delete(id);
  } finally {
    setLoading(false); // Always cleanup
  }
};

<ConfirmationDialog isLoading={loading} />;
```

### ❌ DON'T: Forget Cleanup

```tsx
// ❌ Don't forget finally
const handleDelete = async () => {
  setLoading(true);
  await api.delete(id);
  // Loading never resets if error occurs!
};

// ✅ Always use finally
const handleDelete = async () => {
  setLoading(true);
  try {
    await api.delete(id);
  } finally {
    setLoading(false);
  }
};
```

## Validation

### ✅ DO: Use Zod for Schemas

```tsx
const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
});

const form = useForm({
  resolver: zodResolver(patientSchema),
});
```

### ✅ DO: Validate Before Submission

Schema validation happens automatically with Zod resolver.

### ✅ DO: Show Validation Errors in Form

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      {fieldState.error && (
        <FormMessage>{fieldState.error.message}</FormMessage>
      )}
    </FormItem>
  )}
/>
```

### ❌ DON'T: Validate in onSubmit

Let Zod handle validation:

```tsx
// ❌ Don't do this
const onSubmit = (data) => {
  if (!data.email.includes("@")) {
    return;
  }
  // ...
};

// ✅ Use Zod
const schema = z.object({
  email: z.string().email(),
});
```

## Accessibility

### ✅ DO: Use Semantic HTML

```tsx
<ConfirmationDialog
  title="Delete Item?"
  description="This action cannot be undone."
  // Proper semantic markup is handled by the component
/>
```

### ✅ DO: Provide Descriptions

```tsx
<FormDialog
  title="Create Patient"
  description="Enter patient details to create a new record"
  // Helps screen reader users understand context
/>
```

### ✅ DO: Use Proper Button States

```tsx
<ConfirmationDialog
  disabled={isLoading}
  // Prevents interaction during loading
/>
```

### ❌ DON'T: Ignore Keyboard Navigation

All dialog components handle keyboard navigation automatically. Don't override it.

### ❌ DON'T: Use onClick Without Proper Role

```tsx
// ❌ Don't do this
<div onClick={handleSubmit}>Submit</div>

// ✅ Use Button component
<Button onClick={handleSubmit}>Submit</Button>
```

## Performance

### ✅ DO: Memoize Dialog Components

```tsx
const PatientDialog = memo(function PatientDialog({ open, onOpenChange }) {
  return (
    <FormDialog open={open} onOpenChange={onOpenChange}>
      {/* Content */}
    </FormDialog>
  );
});
```

### ✅ DO: Use useCallback for Handlers

```tsx
const handleSubmit = useCallback(async (data) => {
  await api.save(data);
}, []);
```

### ✅ DO: Optimize Lists in SearchDialog

```tsx
const items = useMemo(
  () =>
    largeList.map((item) => ({
      id: item.id,
      label: item.name,
    })),
  [largeList],
);

<SearchDialog items={items} />;
```

### ❌ DON'T: Create New Objects in Render

```tsx
// ❌ New object created on every render
const schema = z.object({
  name: z.string(),
});

// ✅ Define outside component
const schema = z.object({
  name: z.string(),
});

const MyComponent = () => {
  // Use the constant
};
```

### ❌ DON'T: Use Inline Functions

```tsx
// ❌ New function on every render
<Button onClick={() => handleDelete(id)} />;

// ✅ Use useCallback
const handleDelete = useCallback((id: string) => {
  // ...
}, []);

<Button onClick={() => handleDelete(id)} />;
```

## Common Patterns

### Delete with Confirmation

```tsx
const [deleteId, setDeleteId] = useState<string | null>(null);

const handleDelete = async () => {
  if (!deleteId) return;

  try {
    await api.deletePatient(deleteId);
    toast.success("Patient deleted");
    setDeleteId(null);
    refetch();
  } catch (error) {
    toast.error(error.message);
  }
};

<ConfirmationDialog
  open={!!deleteId}
  onOpenChange={(open) => !open && setDeleteId(null)}
  type="danger"
  title="Delete Patient?"
  onConfirm={handleDelete}
/>;
```

### Create/Edit Toggle

```tsx
const [editId, setEditId] = useState<string | null>(null);
const isEditing = !!editId;
const data = editId ? patients.find((p) => p.id === editId) : null;

const handleSubmit = async (formData) => {
  try {
    if (isEditing) {
      await api.updatePatient(editId, formData);
    } else {
      await api.createPatient(formData);
    }
    setEditId(null);
    refetch();
  } catch (error) {
    toast.error(error.message);
  }
};

<FormDialog
  open={isEditing || showCreate}
  title={isEditing ? "Edit Patient" : "Create Patient"}
  // ...
/>;
```

### Multi-Step Form with Validation

```tsx
const [step, setStep] = useState(0);
const form = useForm({ resolver: zodResolver(schema) });

const handleStepChange = async (nextStep: number) => {
  const stepFields = getStepFields(nextStep);
  const isValid = await form.trigger(stepFields);

  if (isValid) {
    setStep(nextStep);
  }
};

<MultiStepDialog
  currentStepIndex={step}
  onStepChange={handleStepChange}
  // ...
/>;
```

## Anti-Patterns

### ❌ Opening Multiple Dialogs

```tsx
// ❌ Don't open multiple dialogs at once
setAddOpen(true);
setEditOpen(true);

// ✅ Use a single state for which dialog is open
setActiveDialog("add" | "edit" | null);
```

### ❌ Closing Dialog in useEffect

```tsx
// ❌ Don't do this
useEffect(() => {
  setOpen(false);
}, [dependency]);

// ✅ Close intentionally after successful action
const handleSubmit = async () => {
  await save();
  setOpen(false);
};
```

### ❌ Mutating Form Data Directly

```tsx
// ❌ Don't mutate
data.name = "new name";

// ✅ Use form.setValue
form.setValue("name", "new name");
```

### ❌ Nested Dialogs

```tsx
// ❌ Don't nest dialogs
<CRUDDialog>
  <CRUDDialog>{/* content */}</CRUDDialog>
</CRUDDialog>;

// ✅ Use sequential dialogs
{
  state === "form" && <FormDialog />;
}
{
  state === "confirm" && <ConfirmationDialog />;
}
```

## Summary

**Key Takeaways:**

1. Always use controlled state
2. Use React Hook Form for complex forms
3. Handle errors gracefully
4. Provide loading states
5. Keep dialogs accessible
6. Optimize performance
7. Use semantic HTML
8. Test with keyboard navigation

**Remember:** Dialogs interrupt user flow, so make them quick and focused.
