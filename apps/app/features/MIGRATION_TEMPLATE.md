# Component Migration Template

Use this template to migrate components to the new Container/UI architecture.

## Steps

### 1. Create UI Component

**Location:** `features/[module]/components/[ComponentName]UI.tsx`

```tsx
/**
 * [Component Name] - UI Component
 * Pure presentational component
 */

interface [ComponentName]UIProps {
  // Define props
  data: any;
  onAction: () => void;
  loading?: boolean;
}

export function [ComponentName]UI({
  data,
  onAction,
  loading = false,
}: [ComponentName]UIProps) {
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Pure UI - no data fetching, no side effects */}
    </div>
  );
}
```

### 2. Create Container Component

**Location:** `features/[module]/components/[ComponentName]Container.tsx`

```tsx
/**
 * [Component Name] - Container Component
 * Handles data fetching and business logic
 */

import { [ComponentName]UI } from './[ComponentName]UI';
import { use[Module] } from '../hooks/use[Module]';
import { [businessRule] } from '../rules/[module]Rules';

interface [ComponentName]ContainerProps {
  id: string;
}

export function [ComponentName]Container({ id }: [ComponentName]ContainerProps) {
  const { data, isLoading } = use[Module](id);

  const handleAction = () => {
    // Business logic here
  };

  return (
    <[ComponentName]UI
      data={data}
      onAction={handleAction}
      loading={isLoading}
    />
  );
}
```

### 3. Export from Module

**Location:** `features/[module]/components/index.ts`

```tsx
export { [ComponentName]Container } from './[ComponentName]Container';
export { [ComponentName]UI } from './[ComponentName]UI';
```

### 4. Add Backward Compatibility

**Location:** `components/[module]/[component-name].tsx`

```tsx
/**
 * @deprecated Moved to features/[module]
 * Use: import { [ComponentName]Container } from '@/features/[module]'
 */

export { [ComponentName]Container as [ComponentName] } from '@/features/[module]';
```

### 5. Checklist

- [ ] UI component created (pure, no side effects)
- [ ] Container component created (data fetching, logic)
- [ ] Business rules extracted to rules/
- [ ] Props properly typed
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Exported from module index
- [ ] Backward compatibility added
- [ ] Old location marked as deprecated
- [ ] Manual testing completed

## Example: Patient Badge

See `features/patients/components/PatientBadge*.tsx` for reference.
