# UI Component Guide

This guide describes the shared UI system in `@workspace/ui`, how to consume components safely, and the standards for extending the library.

- Owner: Frontend Platform
- Review Cadence: Monthly (first Monday)
- Last Reviewed: February 15, 2026

## 1) Package Scope

Primary source:

- `packages/ui/src/components/index.ts`

Consume components via package exports only:

- `@workspace/ui/components`
- `@workspace/ui/components/*`

Do not import from deep internal paths outside declared exports.

## 2) Design System Rules

- Use semantic tokens only (`bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-primary`, `bg-destructive`).
- Avoid hardcoded palette classes and hex colors in feature code.
- Preserve dark-mode compatibility using shared tokenized classes.
- Keep interaction states consistent (`hover`, `focus-visible`, `disabled`).

## 3) Component Inventory

### 3.1 Form and Input

- `Input`, `Textarea`, `Select`, `SearchableSelect`
- `DatePicker`, `DateTimePicker`
- `Checkbox`, `RadioGroup`, `Switch`, `Slider`
- `Form`, `FormField`, `FormLabel`, `FormControl`, `FormMessage`
- `FormGrid`, `FormSection`, `FormFieldGroup`
- `DebouncedSearchInput`

### 3.2 Layout and Navigation

- `Card` family (`CardHeader`, `CardContent`, etc.)
- `Tabs` family
- `Accordion`, `Collapsible`
- `Sheet` family
- `Dialog` family
- `Popover`, `Tooltip`
- `ScrollArea`, `Separator`, `Resizable` family

### 3.3 Data Display and Feedback

- `Table` family
- `Badge`, `StatusBadge`, `PriorityBadge`, `OnlineStatus`
- `Alert`
- `Progress`
- `EmptyState`, `SectionHeader`, `LoadingState`
- Skeletons: `Skeleton`, `StatCardSkeleton`, `TableSkeleton`, `PatientListSkeleton`, `AppointmentCalendarSkeleton`

### 3.4 Specialized UI

- `ConfirmationDialog`, `CRUDDialog`, `FormDialog`, `MultiStepDialog`, `SearchDialog`
- `GradientStatCard`, `QuickActionCard`, `ProgressStat`
- `VoiceRecorder`, `LiveSpeechToText`
- Branding/theme: `DocitaIcon`, `DocitaLogo`, `ThemeToggle`

## 4) Accessibility Baseline

All new or changed components should meet:

- Keyboard navigation support (tab/focus-visible states)
- Proper labels and `aria-*` mapping for controls
- Correct semantic structure for tables/dialogs/forms
- Readable contrast in light and dark themes

When introducing new variants, validate with existing accessibility checks in CI.

## 5) Storybook Baseline

Story coverage entrypoint:

- `packages/ui/src/components/all-components.stories.tsx`

Use Storybook updates to document visual/interaction behavior for newly added components or variants.

## 6) Usage Pattern

Preferred feature usage pattern:

1. Container component handles data/query/mutations.
2. UI component consumes `@workspace/ui` primitives.
3. Domain rules stay in `rules/` (not in shared UI package).

## 7) Adding a New Component

Checklist:

- Add component in `packages/ui/src/components/`
- Export from `packages/ui/src/components/index.ts`
- Add/extend Storybook story
- Add tests where behavior is non-trivial
- Verify lint, typecheck, and dark-mode rendering
- Ensure no hardcoded colors or one-off theme tokens
