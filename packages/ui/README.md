# @workspace/ui

Shared presentational primitives and global styles.

**Rule:** no data fetching, no business rules — presentational components only.

## Boundaries

- No data fetching, API clients, tenant logic, or business rules.
- Use CSS custom-property tokens from `src/styles/globals.css`; do not hardcode product colors in components.
- Motion policy (from `docs/UI_UX_STANDARD_2026.md §5`): no `animate-pulse` on chrome, no `animate-in fade-in slide-in-from-bottom-*`, no `transition-all`, no skeleton `animation="wave"`.
- Export reusable primitives from `src/components`; do not duplicate them in apps.

Promote a component here only when it has at least two independent consumers. App-specific composition stays in `apps/*/features`.

## Token usage

Tokens are CSS variables defined in `src/styles/globals.css` and referenced via Tailwind utilities (`bg-background`, `text-foreground`, `border-border`, etc.). The design-token catalogue is in `src/design-tokens.ts`.

## Component catalogue (selected)

`AppPageScaffold`, `AppShell`, `PageHeader`, `PageContainer`, `PageLayout`, `PageTabs`, `FormPage`, `FormDialog`, `CrudDialog`, `MultiStepDialog`, `WizardDialog`, `DataTable`, `DataState`, `EmptyState`, `ErrorState`, `StatGrid`, `StatTile`, `StatsCard`, `Timeline`, `Breadcrumbs`, `BackButton`, `FilterBar`, `SearchableSelect`, `DebouncedSearchInput`, `ConfirmationDialog`, `RightRailCard`, `SectionHeading`, `FieldRow`, `FormFieldGroup`, `FormGrid`, `DatePicker`, `DateTimePicker`, `IsoDatePickerField`, `CategoryAvatar`, `AllergyBanner`, `LiveDot`, `MicButton`, `PromptInput`, `NowServingBoard`, `PrintSheet`, `SystemHealthIndicator`, `ThemeToggle`, `TopBar`, `Toolbar`, `CommandPaletteShell`, `DialogStack`

## AppPageScaffold pattern

The standard page wrapper. Use it in feature UI components (not in route files).

```tsx
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";

<AppPageScaffold header={<PageHeader ... />} density="default">
  {/* page sections */}
</AppPageScaffold>
```

`density` prop: `"compact"` | `"default"` | `"spacious"`.

## What does NOT belong here

- Hooks that call APIs (use `@workspace/data-access` or `apps/app/hooks`)
- Permission/tier checks (use `@workspace/auth` or `@workspace/types/access`)
- Domain-specific components that are only ever used in one feature
