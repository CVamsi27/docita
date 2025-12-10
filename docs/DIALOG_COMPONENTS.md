# Dialog Components Guide

## Overview

The Docita dialog component library provides a comprehensive set of reusable, accessible dialog components for common patterns in clinic management applications. These components handle:

- Basic dialogs with minimal configuration
- Form submission (CRUD operations)
- React Hook Form integration
- Multi-step workflows (wizards)
- Confirmation dialogs with semantic types
- Search/filter dialogs with grouping

## Dialog Components

### 1. Dialog (Base Component)

The foundational dialog component using Radix UI.

**Features:**

- Accessible modal with keyboard support
- Customizable sizing and positioning
- Support for header, content, and footer sections
- Managed open/close state

**Import:**

```typescript
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
```

**Example:**

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Optional description</DialogDescription>
    </DialogHeader>
    {/* Content goes here */}
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 2. CRUDDialog

Specialized dialog for form submissions with built-in loading states and button management.

**Features:**

- Automatic submit button handling
- Loading state management
- Disabled state support
- Pre-configured footer with Cancel and Submit buttons
- Semantic editing mode

**Props:**

```typescript
interface CRUDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isEditing?: boolean;
  isLoading?: boolean;
  onSubmit?: (e: React.FormEvent) => Promise<void> | void;
  submitLabel?: string;
  cancelLabel?: string;
  contentClassName?: string;
  disabled?: boolean;
  children: React.ReactNode;
}
```

**Example:**

```tsx
<CRUDDialog
  open={open}
  onOpenChange={setOpen}
  title="Add Patient"
  description="Enter patient details"
  isLoading={loading}
  onSubmit={handleSubmit}
  submitLabel="Add"
>
  <form className="space-y-4">{/* Form fields */}</form>
</CRUDDialog>
```

### 3. FormDialog

Optimized for React Hook Form integration with minimal configuration.

**Features:**

- Built for `react-hook-form` patterns
- Automatic form state management
- Loading indicator support
- Pre-configured footer

**Props:**

```typescript
interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  contentClassName?: string;
  disabled?: boolean;
  children: React.ReactNode;
}
```

**Example:**

```tsx
const form = useForm({
  resolver: zodResolver(schema),
});

<FormDialog
  open={open}
  onOpenChange={setOpen}
  title="Create Appointment"
  isLoading={form.formState.isSubmitting}
>
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="patientId"
        render={({ field }) => (
          // FormField component
        )}
      />
      {/* More fields */}
    </form>
  </Form>
</FormDialog>
```

### 4. ConfirmationDialog

For confirming destructive or important actions.

**Features:**

- Semantic dialog types: danger, warning, info, success
- Contextual icons
- Appropriate button colors
- Loading states
- Promise-based onConfirm callback

**Props:**

```typescript
interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  type?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
  disabled?: boolean;
}
```

**Example:**

```tsx
<ConfirmationDialog
  open={open}
  onOpenChange={setOpen}
  type="danger"
  title="Delete Patient?"
  description="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={() => deletePatient(id)}
/>
```

### 5. MultiStepDialog

For guided workflows with multiple sequential steps (wizards).

**Features:**

- Visual step indicators
- Step navigation (next/previous)
- Optional step descriptions
- Completion callback
- Configurable labels

**Props:**

```typescript
interface MultiStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: Array<{ id: string; title: string; description?: string }>;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: () => void | Promise<void>;
  children: React.ReactNode;
  nextLabel?: string;
  prevLabel?: string;
  completeLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  allowSkip?: boolean;
}
```

**Example:**

```tsx
const [step, setStep] = useState(0);

<MultiStepDialog
  open={open}
  onOpenChange={setOpen}
  title="Create Account"
  steps={[
    {
      id: "personal",
      title: "Personal Info",
      description: "Enter your details",
    },
    { id: "contact", title: "Contact", description: "Provide contact info" },
    { id: "verify", title: "Verify", description: "Confirm your email" },
  ]}
  currentStepIndex={step}
  onStepChange={setStep}
  onComplete={() => handleComplete()}
>
  {step === 0 && <PersonalForm />}
  {step === 1 && <ContactForm />}
  {step === 2 && <VerificationForm />}
</MultiStepDialog>;
```

### 6. SearchDialog

For large lists with filtering and grouping capabilities.

**Features:**

- Searchable combobox interface
- Optional item grouping
- Loading states
- Customizable empty state
- Single selection

**Props:**

```typescript
interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  items: Array<{ id: string; label: string; group?: string }>;
  onSelect: (item: SearchItem) => void;
  isLoading?: boolean;
  emptyText?: string;
}
```

**Example:**

```tsx
<SearchDialog
  open={open}
  onOpenChange={setOpen}
  title="Select Patient"
  placeholder="Search by name or ID..."
  items={patients.map((p) => ({
    id: p.id,
    label: p.name,
    group: p.clinic?.name,
  }))}
  onSelect={(item) => setSelectedPatient(item.id)}
/>
```

## Component Hierarchy

```
Dialog (Base)
├── CRUDDialog (Form submissions)
├── FormDialog (React Hook Form specific)
├── ConfirmationDialog (Confirmations)
├── MultiStepDialog (Wizards)
└── SearchDialog (Selection from large lists)
```

## Best Practices

### 1. Dialog State Management

Use controlled state for all dialogs:

```tsx
const [open, setOpen] = useState(false);

<MyDialog open={open} onOpenChange={setOpen} />;
```

### 2. Form Integration

For forms using React Hook Form:

```tsx
const form = useForm({ resolver: zodResolver(schema) });

<FormDialog
  open={open}
  onOpenChange={setOpen}
  isLoading={form.formState.isSubmitting}
>
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>{/* Fields */}</form>
  </Form>
</FormDialog>;
```

### 3. Error Handling

Handle errors gracefully without closing the dialog:

```tsx
const handleSubmit = async (data) => {
  try {
    await api.createPatient(data);
    setOpen(false);
  } catch (error) {
    toast.error(error.message);
    // Dialog stays open
  }
};
```

### 4. Async Operations

Use isLoading to show pending states:

```tsx
const [loading, setLoading] = useState(false);

const handleDelete = async (id) => {
  setLoading(true);
  try {
    await api.deletePatient(id);
  } finally {
    setLoading(false);
  }
};

<ConfirmationDialog isLoading={loading} onConfirm={() => handleDelete(id)} />;
```

### 5. Multi-Step Workflows

Validate each step before proceeding:

```tsx
const [step, setStep] = useState(0);

const handleStepChange = (nextStep) => {
  // Validate current step
  if (form.formState.isValid) {
    setStep(nextStep);
  } else {
    toast.error("Please complete this step first");
  }
};
```

## Migration Guide

### From Basic Dialog to CRUDDialog

**Before:**

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Patient</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>{/* Form fields */}</form>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button type="submit">Add</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**After:**

```tsx
<CRUDDialog
  open={open}
  onOpenChange={setOpen}
  title="Add Patient"
  onSubmit={handleSubmit}
  isLoading={loading}
>
  <form>{/* Form fields */}</form>
</CRUDDialog>
```

### From CRUDDialog to FormDialog (with React Hook Form)

If using React Hook Form, switch to FormDialog:

```tsx
const form = useForm({ resolver: zodResolver(schema) });

<FormDialog
  open={open}
  onOpenChange={setOpen}
  title="Add Patient"
  isLoading={form.formState.isSubmitting}
>
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* FormField components */}
    </form>
  </Form>
</FormDialog>;
```

## Accessibility

All dialog components follow WCAG 2.1 Level AA standards:

- **Keyboard Navigation**: Tab, Shift+Tab, Enter, Escape
- **Focus Management**: Automatic focus trapping within dialog
- **ARIA Labels**: Proper semantic HTML and ARIA attributes
- **Screen Readers**: Full support for screen readers

## TypeScript Support

All components are fully typed:

```typescript
import type {
  CRUDDialogProps,
  FormDialogProps,
  ConfirmationDialogProps,
  MultiStepDialogProps,
  SearchDialogProps,
  SearchItem,
} from "@workspace/ui/components";
```

## Styling & Customization

Dialogs use Tailwind CSS and support the default theme system:

```tsx
<CRUDDialog
  contentClassName="sm:max-w-[600px]"
  // Works with all standard Tailwind classes
/>
```

Customize button styles through the submit/cancel labels:

```tsx
<CRUDDialog submitLabel="Save Changes" cancelLabel="Discard" />
```

## Performance Considerations

- Dialogs unmount when closed (not just hidden)
- Use `memoization` for heavy components inside dialogs
- Avoid re-initializing forms on every render
- Use `useCallback` for event handlers

```tsx
const handleSubmit = useCallback(
  async (data) => {
    // Handle submission
  },
  [dependencies],
);
```

## Common Patterns

### Delete Confirmation

```tsx
<ConfirmationDialog
  type="danger"
  title="Delete Item?"
  confirmText="Delete"
  onConfirm={() => deleteItem(id)}
/>
```

### Async Save

```tsx
const [loading, setLoading] = useState(false);

const handleSave = async (data) => {
  setLoading(true);
  try {
    await api.save(data);
    toast.success("Saved successfully");
    setOpen(false);
  } catch (error) {
    toast.error(error.message);
  } finally {
    setLoading(false);
  }
};

<FormDialog isLoading={loading} onSubmit={handleSave} />;
```

### Search & Filter

```tsx
<SearchDialog
  items={largeList}
  onSelect={(item) => {
    setSelected(item);
    handleFilter(item.id);
  }}
/>
```

## Troubleshooting

### Dialog won't close after submit

Ensure you call `onOpenChange(false)` in your handler:

```tsx
const handleSubmit = async (data) => {
  await api.save(data);
  onOpenChange(false); // This is required
};
```

### Form state not updating

Use the form's `formState` for loading states:

```tsx
<FormDialog
  isLoading={form.formState.isSubmitting}
  // Instead of managing loading separately
/>
```

### Step indicator not updating

Ensure you're updating `currentStepIndex`:

```tsx
const handleNext = () => {
  setCurrentStep((current) => current + 1); // Update state
};
```

## See Also

- [Shadcn UI Dialog](https://ui.shadcn.com/docs/components/dialog)
- [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/components/dialog)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
