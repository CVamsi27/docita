# UI Consistency Guide

Use the shared `packages/ui` primitives to keep fonts, borders, colors, spacing, padding, and margins consistent across `app`, `internal`, and `landing`.

## Preferred building blocks

- Page shells: `AppPageScaffold`, `PageContainer`, `PageLayout`
- Page and section headings: `PageHeader`, `SectionHeading`
- Panels and content groups: `Card`, `Section`
- Modals: shared `Dialog*` primitives
- Empty, loading, and error states: `EmptyState`, `LoadingState`, `ErrorState`

## Typography contract

- Page titles: `ui-page-title` or `PageHeader`
- Section titles: `ui-section-title` or `SectionHeading`
- Marketing hero titles: `ui-hero-title` or `SectionHeading size="hero"`
- Descriptions: `ui-page-subtitle`, `ui-section-subtitle`
- Helper text and captions: `ui-helper-text`, `ui-eyebrow`

## Surface contract

- Neutral panel: `Card` or `Section`
- Muted panel: `Section tone="muted"` or `ui-panel-muted`
- Semantic panels: `Section tone="info" | "success" | "warning" | "danger"`
- Status surfaces: `surface-info`, `surface-success`, `surface-warning`, `surface-danger`

## Spacing contract

- Page rhythm: let `AppPageScaffold` or `PageContainer` own outer spacing
- Card and section padding: use component defaults before adding custom `p-*`
- Header-to-content spacing: use shared heading components before adding custom margins

## Use This, Not That

- Use `PageHeader` instead of `text-2xl sm:text-3xl font-bold`
- Use `SectionHeading` instead of repeated marketing `h2` typography strings
- Use `Card` or `Section` instead of `bg-background rounded-lg border border-border p-6`
- Use semantic colors such as `text-success` and `border-destructive/30` instead of palette classes
- Use `AppPageScaffold` or `PageContainer` instead of repeated `space-y-6 p-6` page wrappers
