/**
 * UI Component Library Audit & Inventory
 * Centralized documentation of all shared components
 * Generated: Phase 2.19 - Design System Implementation
 */

import type { ReactNode } from 'react';

export interface ComponentAuditItem {
  name: string;
  path: string;
  purpose: string;
  props?: Record<string, string>;
  variants?: string[];
  status: 'active' | 'deprecated' | 'planned';
  migratedTo?: string;
  notes?: string;
}

/**
 * Core UI Components
 * Foundational components used across applications
 */
export const coreComponents: ComponentAuditItem[] = [
  {
    name: 'Button',
    path: 'src/components/Button.tsx',
    purpose: 'Universal button component with multiple variants and sizes',
    variants: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
    status: 'active',
    props: {
      variant:
        'primary | secondary | outline | ghost | danger (default: primary)',
      size: 'sm | md | lg (default: md)',
      disabled: 'boolean - disable interaction',
      loading: 'boolean - show loading state',
      asChild: 'boolean - Radix Slot forwarding',
    },
  },
  {
    name: 'Card',
    path: 'src/components/Card.tsx',
    purpose: 'Container with consistent padding, border, and shadow',
    status: 'active',
    props: {
      className: 'string - additional classes',
      clickable: 'boolean - add cursor pointer and hover effect',
    },
  },
  {
    name: 'Input',
    path: 'src/components/Input.tsx',
    purpose: 'Text input with validation, icons, and state management',
    variants: ['text', 'password', 'email', 'number', 'search'],
    status: 'active',
    props: {
      type: 'HTMLInputElement type attribute',
      error: 'boolean | string - show error state',
      icon: 'ReactNode - leading icon',
      clearable: 'boolean - show clear button',
    },
  },
  {
    name: 'Select',
    path: 'src/components/Select.tsx',
    purpose: 'Accessible dropdown select component',
    status: 'active',
    props: {
      options: 'Array<{ value, label }>',
      multiple: 'boolean - multi-select',
      searchable: 'boolean - filterable options',
      disabled: 'boolean | Array<value> - disable specific items',
    },
  },
  {
    name: 'Modal',
    path: 'src/components/Modal.tsx',
    purpose: 'Dialog with backdrop, close button, and keyboard support',
    status: 'active',
    props: {
      isOpen: 'boolean - visibility',
      onClose: 'function - close handler',
      title: 'string | ReactNode',
      size: 'sm | md | lg | xl (default: md)',
    },
  },
  {
    name: 'Alert',
    path: 'src/components/Alert.tsx',
    purpose: 'Status message container with icons and colors',
    variants: ['success', 'warning', 'error', 'info'],
    status: 'active',
    props: {
      type: 'success | warning | error | info',
      title: 'string - alert heading',
      dismissible: 'boolean - show close button',
    },
  },
  {
    name: 'Badge',
    path: 'src/components/Badge.tsx',
    purpose: 'Small labeled indicator with color variants',
    status: 'active',
    props: {
      variant: 'default | primary | secondary | success | warning | error',
      size: 'sm | md | lg',
    },
  },
  {
    name: 'Spinner',
    path: 'src/components/Spinner.tsx',
    purpose: 'Loading indicator with multiple sizes',
    status: 'active',
    props: {
      size: 'sm | md | lg (default: md)',
      color: 'primary | secondary | gray',
    },
  },
  {
    name: 'Tooltip',
    path: 'src/components/Tooltip.tsx',
    purpose: 'Floating hint text with arrow positioning',
    status: 'active',
    props: {
      content: 'string | ReactNode',
      side: 'top | right | bottom | left (default: top)',
      delay: 'number - milliseconds before show',
    },
  },
  {
    name: 'Tabs',
    path: 'src/components/Tabs.tsx',
    purpose: 'Tabbed interface for content organization',
    status: 'active',
    props: {
      tabs: 'Array<{ id, label, content }>',
      defaultTab: 'string - initial active tab',
      onChange: 'function - tab change handler',
    },
  },
];

/**
 * Form Components
 * Specialized components for form building
 */
export const formComponents: ComponentAuditItem[] = [
  {
    name: 'Form',
    path: 'src/components/form/Form.tsx',
    purpose: 'React Hook Form wrapper with validation',
    status: 'active',
  },
  {
    name: 'FormField',
    path: 'src/components/form/FormField.tsx',
    purpose: 'Individual form field with label and error display',
    status: 'active',
  },
  {
    name: 'FormMessage',
    path: 'src/components/form/FormMessage.tsx',
    purpose: 'Error or success message for form fields',
    status: 'active',
  },
  {
    name: 'Checkbox',
    path: 'src/components/form/Checkbox.tsx',
    purpose: 'Accessible checkbox with custom styling',
    status: 'active',
  },
  {
    name: 'Radio',
    path: 'src/components/form/Radio.tsx',
    purpose: 'Radio button group with unified styling',
    status: 'active',
  },
  {
    name: 'Toggle',
    path: 'src/components/form/Toggle.tsx',
    purpose: 'Boolean toggle switch',
    status: 'active',
  },
  {
    name: 'DatePicker',
    path: 'src/components/form/DatePicker.tsx',
    purpose: 'Date selection with calendar interface',
    status: 'active',
  },
  {
    name: 'TimePicker',
    path: 'src/components/form/TimePicker.tsx',
    purpose: 'Time selection component',
    status: 'active',
  },
];

/**
 * Layout Components
 * Structural components for page layout
 */
export const layoutComponents: ComponentAuditItem[] = [
  {
    name: 'Navbar',
    path: 'src/components/layout/Navbar.tsx',
    purpose: 'Top navigation bar with logo, menu, and user profile',
    status: 'active',
  },
  {
    name: 'Sidebar',
    path: 'src/components/layout/Sidebar.tsx',
    purpose: 'Vertical navigation menu',
    status: 'active',
  },
  {
    name: 'Container',
    path: 'src/components/layout/Container.tsx',
    purpose: 'Centered content wrapper with max-width',
    status: 'active',
  },
  {
    name: 'Grid',
    path: 'src/components/layout/Grid.tsx',
    purpose: 'CSS Grid layout wrapper',
    status: 'active',
  },
  {
    name: 'Flex',
    path: 'src/components/layout/Flex.tsx',
    purpose: 'Flexbox layout wrapper with spacing',
    status: 'active',
  },
  {
    name: 'Stack',
    path: 'src/components/layout/Stack.tsx',
    purpose: 'Vertical or horizontal spacing container',
    status: 'active',
  },
];

/**
 * Data Display Components
 * Components for presenting data
 */
export const dataComponents: ComponentAuditItem[] = [
  {
    name: 'Table',
    path: 'src/components/data/Table.tsx',
    purpose: 'Data table with sorting, filtering, pagination',
    status: 'active',
  },
  {
    name: 'List',
    path: 'src/components/data/List.tsx',
    purpose: 'Vertical list with consistent spacing',
    status: 'active',
  },
  {
    name: 'Timeline',
    path: 'src/components/data/Timeline.tsx',
    purpose: 'Chronological event display',
    status: 'active',
  },
  {
    name: 'Breadcrumb',
    path: 'src/components/data/Breadcrumb.tsx',
    purpose: 'Navigation path indicator',
    status: 'active',
  },
  {
    name: 'Pagination',
    path: 'src/components/data/Pagination.tsx',
    purpose: 'Multi-page navigation controls',
    status: 'active',
  },
  {
    name: 'Progress',
    path: 'src/components/data/Progress.tsx',
    purpose: 'Progress bar for tasks or processes',
    status: 'active',
  },
];

/**
 * Component Library Summary
 */
export const componentLibrarySummary = {
  totalComponents: 28,
  byCategory: {
    Core: coreComponents.length,
    Form: formComponents.length,
    Layout: layoutComponents.length,
    Data: dataComponents.length,
  },
  allComponents: [
    ...coreComponents,
    ...formComponents,
    ...layoutComponents,
    ...dataComponents,
  ],
  activeComponents: 28,
  deprecatedComponents: 0,
  plannedComponents: 0,
};

/**
 * Component Usage Standards
 */
export const usageStandards = {
  naming: {
    rule: 'PascalCase for components, kebab-case for CSS classes',
    example: 'export const MyComponent = () => <div className="my-component" />',
  },
  props: {
    rule: 'Use TypeScript interfaces for all props, prefer composition over prop drilling',
    example: 'interface ButtonProps { variant?: "primary" | "secondary"; }',
  },
  styling: {
    rule: 'Tailwind CSS with design tokens, no inline styles',
    example: 'className="bg-primary-600 hover:bg-primary-700 transition-colors"',
  },
  accessibility: {
    rule: 'ARIA labels, keyboard navigation, semantic HTML',
    example: 'aria-label, role, tabIndex attributes as needed',
  },
  testing: {
    rule: 'React Testing Library for unit tests, Playwright for integration',
    example: 'render(<Component />, {wrapper: Providers})',
  },
  documentation: {
    rule: 'JSDoc comments and Storybook stories for all public components',
    example: '/** Component description */ export const Component = ...',
  },
};

/**
 * Migration Checklist
 * Items to migrate from feature-specific to shared library
 */
export const migrationChecklist = [
  {
    source: 'apps/admin/src/components/AppointmentCard.tsx',
    target: 'packages/ui/src/components/AppointmentCard.tsx',
    reason: 'Used in multiple apps',
    status: 'pending' as const,
  },
  {
    source: 'apps/app/src/components/PatientForm.tsx',
    target: 'packages/ui/src/components/forms/PatientForm.tsx',
    reason: 'Generic patient form for reuse',
    status: 'pending' as const,
  },
  {
    source: 'apps/landing/src/components/Testimonial.tsx',
    target: 'packages/ui/src/components/Testimonial.tsx',
    reason: 'Reusable testimonial card',
    status: 'pending' as const,
  },
  {
    source: 'apps/admin/src/utils/formatters.ts',
    target: 'packages/utils/src/formatters.ts',
    reason: 'Common utility functions',
    status: 'pending' as const,
  },
];

export default {
  coreComponents,
  formComponents,
  layoutComponents,
  dataComponents,
  componentLibrarySummary,
  usageStandards,
  migrationChecklist,
};
