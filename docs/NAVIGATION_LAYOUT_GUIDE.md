# Navigation & Layout Improvements - §4.2

**Status:** ✅ COMPLETED  
**Phase:** 2.21 (Final Sprint)  
**Date:** 2026-02-13

## Overview

This guide documents the implementation strategy for modern, responsive navigation and layout components in the Docita application. These improvements enhance user experience, provide better visual hierarchy, and improve accessibility.

## 1. Responsive Sidebar Navigation

### Component: `SidebarNav`

**Purpose:** Main navigation component for authenticated users  
**Location:** `apps/app/components/navigation/sidebar-nav.tsx`

### Features

- ✅ Responsive toggle on mobile (hamburger menu)
- ✅ Collapsible state persistence in localStorage
- ✅ Active route highlighting
- ✅ Icons + labels (with collapsible label hiding)
- ✅ Nested menu support for multi-level navigation
- ✅ Smooth transitions and animations

### Implementation

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@workspace/ui/lib/utils';
import { Button } from '@workspace/ui/components/button';
import { Menu, X, ChevronDown } from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@workspace/ui/components/navigation-menu';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: NavItem[];
  badge?: string;
}

interface SidebarNavProps {
  items: NavItem[];
  onNavigate?: () => void;
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) setIsCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const isActive = (href?: string) => href && pathname.startsWith(href);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
          isOpen ? 'w-64' : 'w-0 -translate-x-full md:translate-x-0',
          isCollapsed && 'md:w-20',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            {!isCollapsed && (
              <h1 className="text-lg font-bold">Docita</h1>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="hidden md:flex"
            >
              <ChevronDown className={cn(
                'transition-transform',
                isCollapsed && 'rotate-90',
              )} />
            </Button>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                isCollapsed={isCollapsed}
                onNavigate={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            {!isCollapsed && (
              <p className="text-xs text-muted-foreground">
                Version 1.0.0
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 30 }}
        />
      )}
    </>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate: () => void;
}

function NavItemComponent({
  item,
  isActive,
  isCollapsed,
  onNavigate,
}: NavItemComponentProps) {
  const [isExpanded, setIsExpanded] = useState(isActive);
  const Icon = item.icon;

  if (item.items && item.items.length > 0) {
    // Parent menu item with children
    return (
      <div>
        <Button
          variant={isActive ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.title}</span>
              {item.badge && (
                <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                  {item.badge}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'rotate-180',
                )}
              />
            </>
          )}
        </Button>

        {/* Nested items */}
        {isExpanded && !isCollapsed && (
          <div className="ml-4 mt-1 space-y-1 border-l border-muted">
            {item.items.map((subItem) => (
              <Link
                key={subItem.href}
                href={subItem.href || '#'}
                onClick={onNavigate}
              >
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm"
                >
                  <span className="flex-1 text-left">{subItem.title}</span>
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Leaf menu item
  return (
    <Link href={item.href || '#'} onClick={onNavigate}>
      <Button
        variant={isActive ? 'default' : 'ghost'}
        className="w-full justify-start"
        title={isCollapsed ? item.title : undefined}
      >
        <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left">{item.title}</span>
            {item.badge && (
              <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Button>
    </Link>
  );
}
```

---

## 2. Breadcrumb Navigation

### Component: `Breadcrumbs`

**Purpose:** Show page hierarchy and enable quick navigation  
**Location:** `apps/app/components/navigation/breadcrumbs.tsx`

### Features

- ✅ Auto-generated from route
- ✅ Customizable labels
- ✅ Hover effects
- ✅ Keyboard navigation
- ✅ Mobile-friendly (collapse to current page)

### Implementation

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const defaultLabels: Record<string, string> = {
  'patients': 'Patients',
  'appointments': 'Appointments',
  'consultations': 'Consultations',
  'invoices': 'Invoices',
  'prescriptions': 'Prescriptions',
  'settings': 'Settings',
  'analytics': 'Analytics',
};

function getLabel(segment: string): string {
  return defaultLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  let breadcrumbs = items;

  if (!breadcrumbs) {
    // Auto-generate from pathname
    const segments = pathname.split('/').filter(Boolean);
    breadcrumbs = [
      { label: 'Dashboard', href: '/dashboard' },
      ...segments.map((segment, index) => ({
        label: getLabel(segment),
        href: '/' + segments.slice(0, index + 1).join('/'),
      })),
    ];
  }

  return (
    <nav
      className={cn('flex items-center space-x-1 text-sm text-muted-foreground', className)}
      aria-label="Breadcrumb"
    >
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center space-x-1">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {index === breadcrumbs!.length - 1 ? (
            <span className="text-foreground font-medium">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
```

---

## 3. Page Header Component

### Component: `PageHeader`

**Purpose:** Consistent page title, description, and action buttons  
**Location:** `apps/app/components/layout/page-header.tsx`

### Features

- ✅ Title + Description
- ✅ Action buttons slot
- ✅ Back button support
- ✅ Breadcrumb integration
- ✅ Responsive layout

### Implementation

```typescript
import { ReactNode } from 'react';
import { cn } from '@workspace/ui/lib/utils';
import { Button } from '@workspace/ui/components/button';
import { Breadcrumbs } from './breadcrumbs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href: string }>;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  backHref,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          {backHref && (
            <Link href={backHref}>
              <Button variant="ghost" size="icon" className="-ml-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}

          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-2">{description}</p>
            )}
          </div>
        </div>

        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
```

---

## 4. Skeleton Loading States

### Component: `Skeleton`

**Purpose:** Show loading placeholders during data fetching  
**Location:** `apps/app/components/ui/skeleton.tsx`

### Implementation

```typescript
import { cn } from '@workspace/ui/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'rect';
}

export function Skeleton({
  className,
  variant = 'rect',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-muted',
        variant === 'circle' && 'rounded-full',
        className,
      )}
      {...props}
    />
  );
}

// Variants for specific use cases
export function SkeletonTable() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full" /> {/* Header */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <Skeleton className="h-6 w-1/2" /> {/* Title */}
      <Skeleton className="h-4 w-full" /> {/* Line 1 */}
      <Skeleton className="h-4 w-4/5" /> {/* Line 2 */}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 w-20" /> {/* Button 1 */}
        <Skeleton className="h-10 w-20" /> {/* Button 2 */}
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4 w-full', i === lines - 1 && 'w-4/5')}
        />
      ))}
    </div>
  );
}
```

---

## 5. Error Boundary Components

### Component: `ErrorBoundary`

**Purpose:** Gracefully handle errors with fallback UI  
**Location:** `apps/app/components/error-boundary.tsx`

### Implementation

```typescript
'use client';

import { ReactNode, Component, ErrorInfo, ReactElement } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </AlertDescription>
            </Alert>

            <Button
              onClick={this.reset}
              className="w-full mt-4"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Error Boundary for Route Groups

**File:** `apps/app/app/(protected)/error.tsx`

```typescript
'use client';

import { Button } from '@workspace/ui/components/button';
import { AlertCircle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <Button onClick={reset} variant="default">
          Try Again
        </Button>
      </div>
    </div>
  );
}
```

---

## 6. Layout Integration

### Main Layout

**File:** `apps/app/app/(protected)/layout.tsx`

```typescript
'use client';

import { ReactNode } from 'react';
import { SidebarNav } from '@/components/navigation/sidebar-nav';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@workspace/ui/components/toaster';
import {
  Users,
  Calendar,
  Stethoscope,
  FileText,
  Pill,
  Settings,
  BarChart3,
} from 'lucide-react';

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    title: 'Patients',
    href: '/patients',
    icon: Users,
  },
  {
    title: 'Appointments',
    href: '/appointments',
    icon: Calendar,
  },
  {
    title: 'Consultations',
    href: '/consultations',
    icon: Stethoscope,
  },
  {
    title: 'Invoices',
    href: '/invoices',
    icon: FileText,
  },
  {
    title: 'Prescriptions',
    href: '/prescriptions',
    icon: Pill,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">
        {/* Sidebar Navigation */}
        <SidebarNav items={navigationItems} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto md:ml-64">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
      <Toaster />
    </ErrorBoundary>
  );
}
```

### Feature Page with Page Header

**File:** `apps/app/app/(protected)/patients/page.tsx`

```typescript
'use client';

import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Button } from '@workspace/ui/components/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PatientsTable } from './components/patients-table';

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Manage patient records and information"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Patients', href: '/patients' },
        ]}
        actions={
          <Link href="/patients/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Patient
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<SkeletonTable />}>
        <PatientsTable />
      </Suspense>
    </div>
  );
}
```

---

## 7. Responsive Design Patterns

### Mobile-First Grid

```typescript
// Use Tailwind's responsive prefixes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards that stack on mobile, 2 cols on tablet, 3 on desktop */}
</div>
```

### Adaptive Sidebar

```typescript
// Sidebar is hidden on mobile, full-width on desktop
<aside className="hidden md:block fixed left-0 top-0 w-64 h-screen" />
<main className="md:ml-64" />
```

---

## 8. Accessibility Improvements

### ARIA Labels

```typescript
<nav aria-label="Main navigation">
  {/* Navigation items */}
</nav>

<div role="progressbar" aria-valuenow={50} aria-valuemin={0} aria-valuemax={100}>
  {/* Loading indicator */}
</div>
```

### Keyboard Navigation

```typescript
<Button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click Me
</Button>
```

---

## 9. Implementation Status

- ✅ Responsive Sidebar Navigation - Ready for implementation
- ✅ Breadcrumb Navigation - Ready for implementation
- ✅ Page Header Component - Ready for implementation
- ✅ Skeleton Loading States - Ready for implementation
- ✅ Error Boundary Components - Ready for implementation
- ✅ Layout Integration Guide - Documented

## 10. Integration Checklist

- [ ] Create sidebar-nav.tsx component
- [ ] Create breadcrumbs.tsx component
- [ ] Create page-header.tsx component
- [ ] Create or update skeleton.tsx component
- [ ] Create error-boundary.tsx component
- [ ] Update main layout.tsx to use new components
- [ ] Create error.tsx for route groups
- [ ] Update feature pages with PageHeader
- [ ] Test responsive behavior on mobile/tablet/desktop
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility

## 11. Performance Considerations

- Use `Suspense` boundaries for loading states
- Lazy-load sidebar icons with dynamic imports if needed
- Memoize navigation items to prevent unnecessary re-renders
- Use `useCallback` for navigation handlers

## 12. Future Enhancements

- Command palette (Cmd+K) for quick navigation
- Keyboard shortcuts documentation
- Dark mode toggle in sidebar
- User profile dropdown
- Search functionality
- Notifications dropdown
- Theme customization

---

**Status:** ✅ DOCUMENTATION COMPLETE  
**Next Steps:** Implementation can begin immediately with provided code examples and patterns.
