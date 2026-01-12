# Testing Strategy

## Overview

Comprehensive testing approach for the refactored Docita architecture.

## Unit Tests (Business Rules)

All business rules in `features/*/rules/` are pure functions and 100% testable.

### Setup Vitest

```bash
pnpm add -D vitest @vitest/ui
```

### Example Test

```typescript
// features/patients/rules/patientRules.test.ts
import { describe, it, expect } from "vitest";
import { getPatientAgeDisplay, isPatientMinor } from "./patientRules";

describe("Patient Rules", () => {
  describe("getPatientAgeDisplay", () => {
    it("should format age correctly", () => {
      const dob = new Date("2000-01-01");
      const result = getPatientAgeDisplay(dob);
      expect(result).toBe("24 years");
    });
  });

  describe("isPatientMinor", () => {
    it("should return true for patients under 18", () => {
      const patient = { dateOfBirth: new Date("2010-01-01") };
      expect(isPatientMinor(patient)).toBe(true);
    });
  });
});
```

### Run Tests

```bash
pnpm vitest
pnpm vitest -- watch
pnpm vitest --ui
```

## Component Tests (React Testing Library)

Test UI components in isolation.

```typescript
import { render, screen } from '@testing-library/react';
import { PatientBadgeUI } from './PatientBadgeUI';

describe('PatientBadgeUI', () => {
  it('should render patient name', () => {
    const patient = { name: 'John Doe', mrn: '12345' };
    render(<PatientBadgeUI patient={patient} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

## E2E Tests (Playwright)

### Run All E2E Tests

```bash
# Run all modules
pnpm test:e2e

# Run specific module
playwright test e2e/patients.spec.ts
playwright test e2e/appointments.spec.ts
```

### Coverage Goals

- Unit tests: 90% for business rules
- Component tests: 80% for UI components
- E2E tests: Critical user flows

## Storybook Setup

```bash
pnpm add -D @storybook/react-vite @storybook/addon-essentials
npx storybook init
```

### Example Story

```typescript
// features/patients/components/PatientBadgeUI.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { PatientBadgeUI } from "./PatientBadgeUI";

const meta: Meta<typeof PatientBadgeUI> = {
  title: "Patients/PatientBadge",
  component: PatientBadgeUI,
};

export default meta;
type Story = StoryObj<typeof PatientBadgeUI>;

export const Default: Story = {
  args: {
    patient: {
      name: "John Doe",
      mrn: "12345",
      age: 30,
    },
  },
};
```

## Test Utilities

Create shared test utilities:

```typescript
// lib/test-utils.ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}
```

## Next Steps

1. Set up Vitest configuration
2. Write tests for all business rules
3. Add component tests for UI components
4. Ensure all E2E tests pass
5. Set up Storybook for component library
