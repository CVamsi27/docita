# Form Validation and Error Handling Guide

This guide outlines the standardized pattern for form validation and field-level error handling across the Docita application.

## Architecture

The form validation pattern is built on three layers:

1. **Backend Validation**: Zod schemas validate data and provide specific field-level error messages
2. **Error Response**: API returns structured error responses with field-level details (RFC 7807 Problem Details)
3. **Frontend Display**: React components parse errors and display them with visual indicators (red borders, error messages)

## Backend - Zod Validation

### 1. Define Zod Schemas with Clear Error Messages

Always provide specific, user-friendly error messages for each validation rule:

```typescript
// apps/api/src/modules/auth/dto/auth.dto.ts
export const RegisterSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
});
```

### 2. Use ZodValidationPipe in Controllers

Controllers automatically validate request bodies using the ZodValidationPipe:

```typescript
// apps/api/src/modules/auth/auth.controller.ts
@Post('register')
async register(@Body() dto: RegisterDto) {
  // Zod validation happens automatically
  // If validation fails, AllExceptionsFilter catches the error
  return this.authService.register(dto);
}
```

### 3. Error Response Format

The `AllExceptionsFilter` transforms Zod validation errors into RFC 7807 Problem Details format:

```json
{
  "status": 400,
  "title": "Bad Request",
  "detail": "Validation failed. Please check the highlighted fields.",
  "instance": "/api/v1/auth/register",
  "timestamp": "2026-02-18T18:12:03Z",
  "validationErrors": {
    "email": "Please enter a valid email address",
    "password": "Password must contain uppercase, lowercase, number, and special character"
  }
}
```

## Frontend - Error Types and Utilities

### 1. Form Error Types

Define types for API responses and form state:

```typescript
// apps/app/lib/types/form.ts
export interface ApiErrorResponse {
  status: number;
  detail: string;
  title: string;
  validationErrors?: FormValidationErrors;
}

export interface FormValidationErrors {
  [field: string]: FieldError | string;
}
```

### 2. Error Parsing Utilities

Use the form error utilities to parse API responses:

```typescript
// apps/app/lib/utils/form-errors.ts
import { parseApiError, getFieldError, hasFieldError } from "@/lib/utils/form-errors";

// When calling API
try {
  const response = await fetch('/api/v1/auth/register', { ... });
  if (!response.ok) {
    const { message, fieldErrors } = await parseApiError(response);
    // fieldErrors is now { field: "error message" }
  }
} catch (error) {
  // Handle errors
}
```

### 3. Error Context Management

Store validation errors in component state:

```typescript
const [fieldErrors, setFieldErrors] = useState<FormValidationErrors>({});

try {
  await register(email, password, firstName, lastName);
} catch (error) {
  if (error instanceof Error) {
    const errorWithFields = error as any;
    if (errorWithFields.fieldErrors) {
      setFieldErrors(errorWithFields.fieldErrors); // Store field errors
    }
  }
}
```

## Frontend - Form Component Implementation

### 1. Input Field with Error Display

Every form field should show validation errors:

```tsx
import { Input } from "@workspace/ui/components/input";
import { AlertCircle } from "lucide-react";
import { hasFieldError, getFieldError } from "@/lib/utils/form-errors";

function FormField({ fieldName, label, value, onChange, fieldErrors }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName}>{label}</Label>
      <Input
        id={fieldName}
        value={value}
        onChange={onChange}
        className={
          hasFieldError(fieldErrors, fieldName)
            ? "border-red-500 focus-visible:ring-red-500"
            : ""
        }
      />
      {hasFieldError(fieldErrors, fieldName) && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {getFieldError(fieldErrors, fieldName)}
        </p>
      )}
    </div>
  );
}
```

### 2. Form Submission with Error Handling

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setFieldErrors({}); // Clear previous errors
  setLoading(true);

  try {
    await register(email, password, firstName, lastName);
  } catch (error) {
    if (error instanceof Error) {
      const errorWithFields = error as any;

      // Extract field-level errors from error object
      if (errorWithFields.fieldErrors) {
        setFieldErrors(errorWithFields.fieldErrors);
      }

      // Set general error message
      setError(error.message);
    }
  } finally {
    setLoading(false);
  }
};
```

## Error Handling in Auth Context

The auth context now passes field-level errors to the calling component:

```typescript
// apps/app/lib/auth-context.tsx
const register = async (...) => {
  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error(errorData.detail || "Registration failed") as any;
    error.fieldErrors = errorData.validationErrors || {}; // Attach field errors
    throw error;
  }
};
```

## Testing Validation

### 1. Backend Tests

Test that Zod schemas produce correct validation errors:

```typescript
describe("RegisterSchema", () => {
  it("should validate email format", () => {
    const result = RegisterSchema.safeParse({
      email: "invalid-email",
      password: "Valid@123",
      firstName: "John",
      lastName: "Doe",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.errors.find((e) => e.path[0] === "email");
      expect(emailError?.message).toContain("valid email");
    }
  });
});
```

### 2. Frontend Tests

Test that validation errors are displayed correctly:

```typescript
it('should display email field error', async () => {
  const mockRegister = vi.fn().mockRejectedValue(
    Object.assign(new Error("Validation failed"), {
      fieldErrors: {
        email: "Please enter a valid email address",
      },
    })
  );

  render(<SignupForm register={mockRegister} />);

  await userEvent.type(screen.getByLabelText('Email'), 'invalid');
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
  });
});
```

## Visual Indicators

### Red Border for Error Fields

Fields with errors should have a red border:

```tsx
className={hasFieldError(fieldErrors, fieldName)
  ? "border-red-500 focus-visible:ring-red-500"
  : ""}
```

### Error Message Display

Error messages appear below the input field with an icon:

```tsx
{
  hasFieldError(fieldErrors, fieldName) && (
    <p className="text-xs text-red-500 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {getFieldError(fieldErrors, fieldName)}
    </p>
  );
}
```

### Form-Level Error Banner

For general errors not tied to a specific field:

```tsx
{
  generalError && (
    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
      {generalError}
    </div>
  );
}
```

## Checklist for New Forms

When implementing a new form, ensure:

- [ ] Backend DTO has Zod schema with clear error messages
- [ ] Controller uses `@Body() dto: YourDto` (automatic validation)
- [ ] Frontend has field error state: `const [fieldErrors, setFieldErrors] = useState<FormValidationErrors>({})`
- [ ] Each input field shows validation errors with red border
- [ ] Field errors are cleared when user starts editing
- [ ] Form-level error message is displayed separately
- [ ] Tests cover validation error scenarios
- [ ] API errors are parsed using `parseApiError()` utility
- [ ] Error messages are user-friendly (not technical jargon)

## Example: Complete Login Form

See [auth-context.tsx](../lib/auth-context.tsx) and [login/page.tsx](./login/page.tsx) for a complete working example.

## Common Patterns

### Pattern 1: Optional Field with Conditional Display

```tsx
{
  hasFieldError(fieldErrors, "clinicName") && (
    <p className="text-xs text-red-500">
      {getFieldError(fieldErrors, "clinicName")}
    </p>
  );
}
{
  !hasFieldError(fieldErrors, "clinicName") && (
    <p className="text-xs text-muted-foreground">Optional field</p>
  );
}
```

### Pattern 2: Conditional Validation Help Text

```tsx
{
  hasFieldError(fieldErrors, "password") ? (
    <p className="text-xs text-red-500">
      {getFieldError(fieldErrors, "password")}
    </p>
  ) : (
    <p className="text-xs text-muted-foreground">
      Must be 8+ characters with uppercase, lowercase, number, and special
      character
    </p>
  );
}
```

### Pattern 3: Multiple Validation Rules

For fields with multiple validation rules, Zod displays the first failure:

```typescript
password: z
  .string()
  .min(8, "Password must be at least 8 characters")  // Shown first if fails
  .regex(/[A-Z]/, "Must contain uppercase")
  .regex(/[a-z]/, "Must contain lowercase")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[\W_]/, "Must contain special character"),
```

## Next Steps

1. Audit all existing forms to ensure they follow this pattern
2. Update any forms that don't display field-level errors
3. Add tests for validation scenarios in new/updated forms
4. Consider implementing React Hook Form + Zod for more complex forms
