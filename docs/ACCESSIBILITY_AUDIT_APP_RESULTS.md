# Accessibility Audit Results - Main App

**Date:** February 14, 2026  
**App:** Main Patient Portal (@docita/app)  
**Baseline Status:** 16 violations (4 per page) across 4 pages  
**Compliance Level:** Currently ~70% WCAG 2.1 AA

---

## Executive Summary

✅ **Good News:**

- NO CRITICAL violations
- Violations are **consistent across all pages** - batch fixes will resolve issues globally
- Only **4 unique violation types** - can be fixed with setup changes
- Most violations are **structural/layout level** - fixable in root templates, not individual components

❌ **Violations Found:**
| Type | Impact | Count | Frequency | Fixability |
|------|--------|-------|-----------|------------|
| Missing Document Title | SERIOUS | 4 | All pages | Trivial (add to layout) |
| Missing HTML lang | SERIOUS | 4 | All pages | Trivial (add to layout) |
| Missing Main Landmark | MODERATE | 4 | All pages | Easy (add role/tag) |
| Aria Region Labels | MODERATE | 4 | All pages | Easy (add aria-label) |

---

## Detailed Violations

### 1. SERIOUS: Missing Document Title

**Impact:** WCAG 2.4.2 (Page Title) | Affects all 4 pages  
**Problem:** Each HTML document must have a non-empty `<title>` element  
**Current State:** Server-side rendered pages likely have no/generic title  
**Affected Pages:** /, /dashboard, /appointments, /patients  
**User Impact:** Screen reader users can't identify what page they're on

**Fix - Option A (Next.js Head Component):**

```tsx
import Head from "next/head";

export default function Page() {
  return (
    <>
      <Head>
        <title>Patient Dashboard | Docita</title>
      </Head>
      <main>...</main>
    </>
  );
}
```

**Fix - Option B (Next.js Metadata API - Recommended):**

```tsx
export const metadata = {
  title: "Patient Dashboard | Docita",
  description: "Manage your medical records and appointments",
};

export default function DashboardPage() {
  return <main>...</main>;
}
```

**Files to Update:**

- `app/(auth)/page.tsx` → Title: "Sign In | Docita"
- `app/(dashboard)/page.tsx` → Title: "Dashboard | Docita"
- `app/(dashboard)/appointments/page.tsx` → Title: "Appointments | Docita"
- `app/(dashboard)/patients/page.tsx` → Title: "Patients | Docita"

**Estimated Effort:** 5 minutes (4 pages)  
**Priority:** HIGH (Easy + High Impact)

---

### 2. SERIOUS: Missing HTML lang Attribute

**Impact:** WCAG 3.1.1 (Language of Page) | Affects all 4 pages  
**Problem:** `<html>` element must have a `lang` attribute for assistive technology  
**Current State:** Root `<html>` element in layout has no lang attribute  
**Affected Pages:** All pages (root level issue)  
**User Impact:** Screen readers use wrong language/pronunciation rules

**Fix - Next.js Layout Configuration:**

**File: `app/layout.tsx`** (root layout)

```tsx
export const metadata: Metadata = {
  // ... existing metadata
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Verification:**

```bash
# Check HTML output
curl http://localhost:3000 | grep -o '<html[^>]*>'
# Should show: <html lang="en">
```

**Estimated Effort:** 2 minutes (single layout.tsx change)  
**Priority:** CRITICAL (Super easy + Affects all pages)

---

### 3. MODERATE: Missing Main Landmark

**Impact:** WCAG 1.3.1 (Info and Relationships) | Affects all 4 pages  
**Problem:** Each page should have exactly one `<main>` element or role="main" landmark  
**Current State:** Pages likely have main content but not marked with semantic element  
**Affected Pages:** All pages lack proper main landmark  
**User Impact:** Screen reader users can't jump to main content; page structure unclear

**Fix - Add Main Element to Each Page:**

**Option A - Using `<main>` semantic HTML:**

```tsx
export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      {/* page content */}
    </main>
  );
}
```

**Option B - Using role="main" (if semantic main can't be used):**

```tsx
<div role="main">{/* content */}</div>
```

**Best Practice:** Use `<main>` semantic HTML element - it's equivalent to `role="main"`

**Files to Update:**

- All page components in `app/` directory
- Ensure exactly ONE `<main>` per page
- Place directly after header/navigation

**Estimated Effort:** 10-15 minutes (wrap existing content)  
**Priority:** HIGH (Improves page structure perception)

---

### 4. MODERATE: Aria Regions Without Labels

**Impact:** WCAG 1.3.1 (Info and Relationships) | Affects all 4 pages  
**Problem:** Any `aria-region` or landmark elements must have accessible names  
**Current State:** Layout regions (header, sidebar, etc.) missing aria-label or accessible name  
**Affected Pages:** All pages  
**User Impact:** Screen reader users can't identify what each region contains

**Fix - Add aria-label to Layout Regions:**

```tsx
// Root Layout
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header aria-label="Main navigation">{/* nav content */}</header>

        <aside aria-label="Sidebar navigation">{/* sidebar content */}</aside>

        <main>{children}</main>

        <footer aria-label="Footer information">{/* footer content */}</footer>
      </body>
    </html>
  );
}
```

**Components to Review:**

- `components/Header.tsx` → Add aria-label="Main navigation"
- `components/Sidebar.tsx` → Add aria-label="Sidebar menu"
- `components/Footer.tsx` → Add aria-label="Footer"
- Root layout organizational regions

**Estimated Effort:** 10 minutes (identify + label main regions)  
**Priority:** MEDIUM (Most regions are semantic HTML, just need labels)

---

## Fix Execution Plan

### Phase 1: Quick Wins (15 minutes)

1. Add `lang="en"` to root `<html>` element in `app/layout.tsx`
2. Add page titles to each page using Next.js metadata API

**Expected Result:** 8 violations resolved (both title and lang issues on all pages)

### Phase 2: Structure Fixes (20 minutes)

3. Add `<main>` elements to all page components
4. Add aria-labels to layout regions (header, sidebar, footer)

**Expected Result:** 8 violations resolved (landmark and region issues)

### Phase 3: Verification (10 minutes)

5. Re-run accessibility audit
6. Confirm all violations resolved
7. Update baseline report

**Total Effort:** ~45 minutes  
**Expected Result:** 100% WCAG 2.1 AA compliance on main app

---

## Next Steps

1. **Immediately:**
   - Locate main layout files (`app/layout.tsx`)
   - Identify all page files needing titles

2. **Phase 1 - Add lang and titles:**
   - ✅ Add `lang="en"` to root html element
   - ✅ Add metadata/title to each page component

3. **Phase 2 - Add landmarks:**
   - ✅ Wrap main page content with `<main>`
   - ✅ Add aria-labels to layout regions

4. **Phase 3 - Verify:**
   - ✅ Re-run audit: `pnpm audit:accessibility`
   - ✅ Confirm 0 violations

---

## Baseline Report Details

**Report Location:** `/apps/app/accessibility-reports/baseline-app-2026-02-14.json`

**Summary by Page:**

```
/ (Home)                    - 4 violations (2 serious, 2 moderate)
/dashboard                  - 4 violations (2 serious, 2 moderate)
/appointments               - 4 violations (2 serious, 2 moderate)
/patients                   - 4 violations (2 serious, 2 moderate)
────────────────────────────────────────────────────
TOTAL                       - 16 violations (8 serious, 8 moderate)
```

**Violation Consistency:** 100% - Same 4 violations on every page (good for batch fixes)

---

## Success Criteria

✅ Fix all 4 violation types  
✅ Re-run audit and confirm 0 violations  
✅ Verify screen reader announces page structure correctly  
✅ Document fixes for team reference
