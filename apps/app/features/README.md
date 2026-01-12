# Features Directory

This directory contains the domain-based feature modules for the Docita application.

## Feature Structure

Each feature follows a consistent structure:

```
features/
├── [feature-name]/
│   ├── index.ts           # Feature entry point / exports
│   ├── api/               # API functions for this feature
│   │   └── [feature].api.ts
│   ├── hooks/             # React Query hooks
│   │   └── use[Feature].ts
│   ├── components/        # UI components (Container/UI pattern)
│   │   ├── [Component]Container.tsx
│   │   ├── [Component]UI.tsx
│   │   └── index.ts
│   └── rules/             # Pure business logic functions
│       └── [feature]Rules.ts
```

## Available Features

| Feature | Description | Status |
|---------|-------------|--------|
| **patients** | Patient management, medical history | ✅ Complete |
| **appointments** | Scheduling and calendar | ✅ Complete |
| **consultation** | Clinical documentation | ✅ Complete |
| **dashboard** | Analytics and overview | ✅ Complete |
| **invoices** | Billing and payments | ✅ Complete |
| **inventory** | Stock management | ✅ Complete |
| **settings** | Configuration and preferences | ✅ Complete |
| **dialogs** | Shared modal components | ✅ Complete |
| **queue** | Patient queue management | ✅ Complete |
| **medical-coding** | ICD-10, CPT codes | ✅ Complete |
| **lab-tests** | Laboratory testing | ✅ Complete |
| **documents** | File management, OCR | ✅ Complete |
| **feedback** | User feedback | ✅ Complete |
| **help** | Help center, FAQ | ✅ Complete |
| **ipd** | Inpatient department | ✅ Complete |
| **onboarding** | New user setup | ✅ Complete |
| **_shared** | Shared utilities, guards | ✅ Complete |

## Business Rules

Each feature contains a `rules/` directory with pure functions for business logic:

- No side effects
- No React dependencies
- Fully testable
- Type-safe

Example:
```typescript
// features/queue/rules/queueRules.ts
export function calculateEstimatedWaitTime(position: number, avgTime: number): number {
  return position * avgTime;
}
```

## Container/UI Pattern

Components follow the Container/Presentational pattern:

- **Container**: Handles data fetching, state, and business logic
- **UI**: Pure presentation component, receives props

Example:
```typescript
// Container
export function PatientListContainer() {
  const { data, isLoading } = usePatients();
  return <PatientListUI patients={data} loading={isLoading} />;
}

// UI
export function PatientListUI({ patients, loading }: Props) {
  if (loading) return <Skeleton />;
  return <Table data={patients} />;
}
```

## Adding a New Feature

1. Create the feature directory: `features/[name]/`
2. Add `index.ts` with exports
3. Add `rules/[name]Rules.ts` for business logic
4. Add `components/` for UI components
5. Add `api/` for API functions (if needed)
6. Add `hooks/` for React Query hooks (if needed)
