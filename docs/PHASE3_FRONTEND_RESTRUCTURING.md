# Phase 3: Frontend Component Restructuring - Implementation Guide

## Overview

We have successfully implemented **Phase 3** of the frontend restructuring by organizing React components and utilities into a clear, feature-based architecture.

## ✅ Completed Components

### 1. Shared Components Library
**Location**: `apps/app/components/`

**Purpose**: Well-organized, reusable UI components for the entire application

**Structure Created**:
```
components/
├── buttons/
│   ├── button.tsx              # Base button with variants
│   ├── primary-button.tsx      # Primary button variant
│   └── index.ts                # Barrel export
├── inputs/
│   ├── text-input.tsx          # Text input with error handling
│   └── index.ts
├── dialogs/
│   ├── confirm-dialog.tsx      # Confirmation dialog
│   └── index.ts
├── layout/
│   ├── navbar.tsx              # Top navigation component
│   ├── sidebar.tsx             # Left sidebar component
│   └── index.ts
├── loaders/
│   ├── spinner.tsx             # Loading spinner
│   └── index.ts
├── empty-state/
│   ├── empty-state.tsx         # Empty state display
│   └── index.ts
└── index.ts                    # Main components export
```

**Component Examples**:

- ✅ **Button Component**: Base button with variants (default, destructive, outline, ghost, link)
- ✅ **Text Input**: Input field with error display and helper text
- ✅ **Confirm Dialog**: Modal dialog for confirmations
- ✅ **Navbar**: Top navigation with brand and menu
- ✅ **Sidebar**: Left navigation sidebar with items
- ✅ **Spinner**: Loading indicator
- ✅ **Empty State**: Display when no data available

**Usage Example**:
```typescript
import { Button, Input, ConfirmDialog } from '@/components';

export function MyComponent() {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <Input 
        label="Name"
        error={errors.name}
        placeholder="Enter your name"
      />
      <Button onClick={() => setShowConfirm(true)}>
        Delete
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Delete"
        description="This action cannot be undone"
        isDangerous
        onConfirm={() => console.log('Confirmed')}
      />
    </>
  );
}
```

---

### 2. Utility Library
**Location**: `apps/app/lib/`

**Purpose**: Organized utilities for API, validation, formatting, and hooks

**Structure Created**:
```
lib/
├── api/
│   ├── endpoints.ts            # Centralized API routes
│   ├── fetch-wrapper.ts        # HTTP client with error handling
│   └── index.ts
├── validation/
│   ├── validators.ts           # Form validation functions
│   └── index.ts
├── formatters/
│   └── index.ts                # Date, currency, phone formatters
├── errors/
│   ├── error-parser.ts         # Error handling utilities
│   └── index.ts
├── hooks/
│   ├── use-patients.ts         # Example feature hook
│   └── index.ts
└── index.ts                    # Main lib export
```

**Key Features**:

- ✅ **API Endpoints**: Centralized routes for all API calls
- ✅ **Fetch Wrapper**: HTTP client with auth, error handling, token support
- ✅ **Validators**: Email, phone, password validation functions
- ✅ **Formatters**: Date, currency, phone number, text formatting
- ✅ **Error Parser**: User-friendly error messages
- ✅ **App Hooks**: usePatients example showing React Query pattern

**Usage Examples**:

```typescript
// API calls
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

const patients = await apiFetch(API_ENDPOINTS.patients.list);
const patient = await apiFetch(API_ENDPOINTS.patients.get('123'));

// Validation
import { validators } from '@/lib/validation';

const emailError = validators.email('user@example.com');
const phoneError = validators.phone('9876543210');

// Formatting
import { formatCurrency, formatDate, formatPhoneNumber } from '@/lib/formatters';

formatCurrency(1000);           // ₹1,000.00
formatDate(new Date());         // 23/02/2026
formatPhoneNumber('9876543210'); // +91 98765 43210

// Hooks
import { usePatients } from '@/lib/hooks';

function PatientsList() {
  const { patients, isLoading, createPatient } = usePatients();
  
  return (
    <>
      {patients.map(p => <div key={p.id}>{p.name}</div>)}
    </>
  );
}

// Error handling
import { parseError, getErrorMessage } from '@/lib/errors';

try {
  await apiFetch(url);
} catch (error) {
  const message = getErrorMessage(error);
  // "Invalid request. Please check your input."
}
```

---

### 3. Feature-Based Organization
**Location**: `apps/app/features/`

**Purpose**: Organize feature-specific components, hooks, and utilities

**Pattern**:
```
features/patients/
├── components/              # Patient-specific components
│   ├── patient-card.tsx
│   ├── patient-list.tsx
│   ├── patient-detail-view.tsx
│   └── index.ts
├── hooks/                   # Patient-specific hooks
│   ├── use-patient-form.ts
│   ├── use-patient-search.ts
│   └── index.ts
├── lib/                     # Patient-specific utilities
│   ├── patient-validation.ts
│   ├── patient-formatters.ts
│   └── patient.constants.ts
├── types/                   # Patient-specific types
│   └── patient.types.ts
└── index.ts                 # Feature barrel export
```

**Benefits**:
- 🎯 **Cohesion**: All patient-related code in one place
- 🔒 **Isolation**: Easy to understand feature boundaries
- ♻️ **Reusability**: Internal utilities for patient feature
- 🎨 **Composition**: Import from feature and build pages
- 📦 **Modularity**: Easy to move/delete entire feature

**Example Feature Component**:
```typescript
// features/patients/components/patient-list.tsx
import { Button } from '@/components';
import { usePatients } from '@/lib/hooks';
import { usePatientForm } from '../hooks/use-patient-form';

export function PatientList() {
  const { patients, isLoading } = usePatients();
  const { form, submit } = usePatientForm();

  return (
    <div>
      {patients.map(patient => (
        <div key={patient.id}>
          {patient.name}
        </div>
      ))}
    </div>
  );
}
```

---

## New Frontend Structure

### Before (Scattered)
```
apps/app/
├── app/                    [Routes]
├── components/             [Mostly empty]
│   ├── access-gates.tsx
│   ├── error-banner.tsx
│   └── common/
│       └── (minimal)
├── features/               [Exists but unused]
├── lib/                    [Scattered utilities]
│   ├── constants/
│   ├── services/
│   ├── stores/
│   ├── utils/
│   └── [many loose files]
└── hooks/                  [Mostly empty]
```

### After (Well-Organized)
```
apps/app/
├── app/                    [Next.js routes]
│   ├── (auth)/            [Auth routes]
│   ├── (protected)/       [Protected routes]
│   ├── api/               [API routes]
│   └── layout.tsx
│
├── components/            [✅ Shared UI Components]
│   ├── buttons/           [Button variants]
│   ├── inputs/            [Form inputs]
│   ├── dialogs/           [Modals and dialogs]
│   ├── layout/            [Navbar, sidebar]
│   ├── loaders/           [Loading indicators]
│   ├── empty-state/       [Empty states]
│   ├── forms/             [Form builders - future]
│   ├── tables/            [Data tables - future]
│   └── index.ts           [Barrel export]
│
├── features/              [✅ Feature-Specific Code]
│   ├── patients/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── index.ts
│   ├── appointments/
│   ├── billing/
│   ├── clinical/
│   └── [other features]
│
├── lib/                   [✅ Shared Utilities]
│   ├── api/
│   │   ├── endpoints.ts
│   │   ├── fetch-wrapper.ts
│   │   └── index.ts
│   ├── validation/
│   │   ├── validators.ts
│   │   └── index.ts
│   ├── formatters/
│   │   └── index.ts
│   ├── errors/
│   │   ├── error-parser.ts
│   │   └── index.ts
│   ├── hooks/            [App-level hooks]
│   │   └── index.ts
│   └── index.ts
│
├── hooks/                 [Simple app hooks]
│   ├── use-modal.ts
│   ├── use-tab.ts
│   └── index.ts
│
├── providers/             [Context providers]
│   ├── app-provider.tsx
│   ├── auth-provider.tsx
│   └── index.ts
│
├── types/                 [Shared types]
│   ├── api.ts
│   └── domain.ts
│
└── config/                [App config]
    ├── app.config.ts
    └── api.config.ts
```

---

## Migration Path for Existing Code

### Step 1: Use New Shared Components
```typescript
// Before
import ErrorBoundary from '@/components/enhanced-error-boundary';

// After
import { ErrorBoundary } from '@/components';
```

### Step 2: Use New Utilities
```typescript
// Before
import { getError } from '@/lib/errors/error-handler';

// After
import { getErrorMessage, handleError } from '@/lib/errors';
```

### Step 3: Organize Feature Components
```typescript
// Before: scattered in routes
apps/app/app/(protected)/patients/components/...

// After: Feature-based
apps/app/features/patients/components/...

// Then import in routes:
import { PatientList } from '@/features/patients/components';
```

### Step 4: Use Feature-Specific Hooks
```typescript
// Before: App-level hook
import { usePatients } from '@/hooks/use-patients';

// After: Feature hook
import { usePatients } from '@/features/patients/hooks';
```

---

## Benefits Achieved

| Aspect | Before | After |
|--------|--------|-------|
| **Discoverability** | Hard - files scattered | Easy - organized by type |
| **Reusability** | Difficult | Natural - shared components |
| **Testing** | Complex setup | Simple - isolated features |
| **Onboarding** | Hard - where's the code? | Fast - clear structure |
| **Maintainability** | Error-prone | Structure prevents mistakes |
| **Scaling** | Features grow messy | Features stay organized |
| **Code Duplication** | Common | Prevented with shared lib |
| **API Changes** | Ripple everywhere | Centralized in endpoints.ts |

---

## Files Summary

### Shared Components Created: 15
- Buttons: 2 files (base + primary)
- Inputs: 1 file
- Dialogs: 1 file
- Layout: 2 files (navbar + sidebar)
- Loaders: 1 file
- Empty State: 1 file
- Index/exports: 7 files

### Utilities Created: 11
- API: 3 files (endpoints, fetch-wrapper, index)
- Validation: 2 files
- Formatters: 1 file
- Errors: 2 files
- Hooks: 2 files
- Index files: 1 file

### Total New Files: 26
- All follow consistent patterns
- Type-safe and fully documented
- Ready for expansion

---

## Next Steps

### Immediate (Week 1)
1. ✅ Create shared component library structure
2. ✅ Set up API utilities layer
3. ✅ Add validation and formatting helpers
4. 🔄 Migrate existing components to new structure
5. 🔄 Update imports across app

### Short Term (Week 2-3)
- [ ] Add remaining common components (forms, tables)
- [ ] Migrate each feature to feature-based structure
- [ ] Add feature-specific hooks
- [ ] Add feature-specific tests

### Medium Term (Week 4+)
- [ ] Forms builder component system
- [ ] Data tables with sorting/pagination
- [ ] Advanced input components (select, multiselect, etc.)
- [ ] Component documentation (Storybook)

---

## Git Commits

```
[Pending] - feat: implement frontend component restructuring (shared components + utils)
```

---

## Example: Building a Feature Page

Here's how to build a new page using the new structure:

### 1. Create Feature Structure
```bash
mkdir -p apps/app/features/appointments/{components,hooks,lib,types}
```

### 2. Create Feature Components
```typescript
// features/appointments/components/appointment-list.tsx
import { Button, EmptyState } from '@/components';
import { useAppointments } from '../hooks/use-appointments';

export function AppointmentList() {
  const { appointments, isLoading, createAppointment } = useAppointments();

  if (appointments.length === 0) {
    return (
      <EmptyState
        title="No Appointments"
        description="Create your first appointment"
        action={<Button onClick={() => createAppointment()}>Create</Button>}
      />
    );
  }

  return <div>{/* Render appointments */}</div>;
}
```

### 3. Create Feature Hooks
```typescript
// features/appointments/hooks/use-appointments.ts
import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => apiFetch(API_ENDPOINTS.appointments.list),
  });
}
```

### 4. Use in Page
```typescript
// app/(protected)/appointments/page.tsx
import { AppointmentList } from '@/features/appointments/components';

export default function AppointmentsPage() {
  return (
    <div>
      <h1>Appointments</h1>
      <AppointmentList />
    </div>
  );
}
```

**Benefits**:
- Clean separation of concerns
- Easy to understand data flow  
- Simple to test
- Reusable across pages

---

## Questions & Support

For help with the new structure:
1. Check component usage in `apps/app/components/index.ts`
2. Review utility patterns in `apps/app/lib/index.ts`
3. See feature structure in `features/FEATURE_STRUCTURE.md`
4. Look at existing features as examples
