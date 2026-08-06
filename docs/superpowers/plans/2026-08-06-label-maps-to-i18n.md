# App-Local Label Maps → i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all app-local English-only data-driven label maps (`LEAVE_TYPE_LABELS`, `FOLLOW_UP_STATUS_LABELS`, role labels, medical-document types, payment methods, WhatsApp response/template-category labels, subscription billing display, plan highlights) to i18n keys with en/hi parity, and add a counter-assertion audit test so no new English label map can be added.

**Architecture:** Each English `Record<Enum, string>` map becomes either (a) a `labelFn(value, t)` t-prop helper (the established, already-audited pattern — `uiModeLabel(mode, t)`, `wardOptions(t)`, `getPrescriptionColumns(..., t)`) whose body calls `t("section.key")` with literal keys that the existing t-prop trace test resolves, or (b) for pure non-React helpers, a `t: (key: string) => string` parameter threaded from the React caller. Consumers bind the **parent** namespace (`useTranslation("Settings")`, `useTranslation("FollowUps")`, ...) so `t("leaveTypes.casual")` resolves `Settings.leaveTypes.casual` at runtime and in the audit. A new 8th audit test scans for any remaining local `*_LABELS`/`*_LABEL_KEYS` const with English display values and fails the build unless allowlisted.

**Tech Stack:** react-i18next (dotted section namespaces via `buildResources` in `apps/app/src/i18n/index.ts`), Vitest (app suite, `apps/app`), en/hi message corpus at `apps/app/src/messages/{en,hi}.json`, the 7-test audit suite at `apps/app/src/i18n/__tests__/namespace-registration.test.ts`, and the t-prop trace built in commits `ab8523f69`/`a26efdc20`.

## Global Constraints

- **i18next key resolution:** consumers resolve `t("section.key")` against the **parent** namespace they bind (e.g. `useTranslation("Settings")` + `t("leaveTypes.casual")`). Never rely on fully-qualified dotted keys from a foreign namespace — i18next's `nsSeparator` is `":"`, so `t("Settings.leaveTypes.casual")` from another namespace would look up a literal dotted key.
- **en/hi parity is mandatory:** every new key must be added to BOTH `en.json` and `hi.json` in the same commit; `pnpm check:i18next-parity` (root) must pass (currently 2,774 = 2,774 leaves).
- **t-prop helper signature:** helpers take `t: (key: string) => string` — never `TFunction` (the t-prop signature guard test flags `TFunction` as untraceable).
- **Do NOT touch `@workspace/types` canonical maps** (AGENTS.md §15.12 SSOT): `APPOINTMENT_STATUS_LABELS`, `INVOICE_STATUS_LABELS`, `CLAIM_STATUS_LABELS`, `SMOKING_STATUS_LABELS`, `ALCOHOL_USE_STATUS_LABELS`, `CODE_STATUS_LABELS`, `ISOLATION_STATUS_LABELS`, `CONDITION_STATUS_LABELS`, `CONSENT_STATUS_LABELS`, `HOSPITAL_ROLE_LABELS`. These are imported, not app-local consts, and stay in the shared package.
- **No new dependencies.** Only existing libs: `react-i18next`, `@workspace/ui`, existing utils.
- **Validation per task:** `pnpm --filter @docita/app run check-types`, `pnpm --filter @docita/app run vitest run src/i18n/__tests__/namespace-registration.test.ts`, and `pnpm check:i18next-parity` (root). Full suite + gates at Task 11.
- **Commits:** use `git commit --no-verify` only when pre-commit `pnpm lint` fails on pre-existing warnings in unrelated packages (the repo's documented behavior this session); run `pnpm lint` in `apps/app` and fix any **new** errors before committing.
- **Copy preservation:** keep the exact English strings as values (e.g. "Comp Off", "Lab Technician", "Others / custom") — this is a translation transport change, not a copy change.
- **Scope:** the maps listed in Task 2–10 are the only app-local English maps (verified 2026-08-06 by scanning `const *_LABELS: Record<...> = {` across `apps/app/src`). Maps named `*_VARIANT` / `*_COLORS` (Tailwind variant names) and `STATUS_LABEL_KEY` (referral-partner, already key-valued) are out of scope.

---
## File Structure

**New files:**
- `apps/app/src/test-utils/en-message-resolver.ts` — `createEnMessageResolver()`: walks `en.json` for a dotted `namespace.key` and returns the string; used by pure-helper unit tests to supply `t`.
- `apps/app/src/features/settings/components/leave/leave-type-helpers.ts` — `leaveTypeLabel(type, t)`.
- `apps/app/src/features/follow-ups/lib/follow-up-status-label.ts` — `followUpStatusLabel(status, t)`.
- `apps/app/src/features/settings/components/management/member-role-label.ts` — `memberRoleLabel(role, t)`.
- `apps/app/src/features/medical-documents/lib/medical-document-type-label.ts` — `medicalDocumentTypeLabel(type, t)`.
- `apps/app/src/features/invoices/lib/payment-method-label.ts` — `formatInvoicePaymentMethodLabel(raw, t)` + `buildInvoicePaidSummaryLine(input, t)` (moved out of `invoice-payment-display.ts`).
- `apps/app/src/components/whatsapp/patient-response-label.ts` — `patientResponseLabel(type, delayMinutes, t)`.
- `apps/app/src/features/settings/components/whatsapp/template-category-label.ts` — `templateCategoryLabel(category, t)`.
- `apps/app/src/features/subscription/lib/billing-display-format.ts` — `formatInvoiceDescriptionForDisplay(raw, t)` + `subscriptionBillingCaption(t)`.
- `apps/app/src/features/subscription/config/plan-highlight-keys.ts` — `PLAN_ONBOARDING_KEY_HIGHLIGHT_KEYS: Record<string, string[]>` + `planHighlightKeys(tierName)`.

**Modified files (by task):** see each task. The messages corpus (`en.json`/`hi.json`) and the audit test are touched by every task.

---

### Task 1: Add the label-map guard test (8th audit test)

**Files:**
- Modify: `apps/app/src/i18n/__tests__/namespace-registration.test.ts` (append one `it(...)` inside the existing `describe` block)

**Interfaces:**
- Consumes: existing `glob`/`readFile` imports (already at top of the test file), `buildResources` (already imported), `en`/`hi` (already imported).
- Produces: the guard behavior later tasks rely on — a local `*_LABELS`/`*_LABEL_KEYS` const whose values contain an uppercase letter or a space fails the build unless its `file:NAME` is in the test's `allowlist`. Each conversion task (2–10) deletes its allowlist entries; Task 11 asserts the allowlist is empty.

- [ ] **Step 1: Write the failing guard test**

Append this test to the `describe("i18n namespace registration", ...)` block in `apps/app/src/i18n/__tests__/namespace-registration.test.ts`:

```ts
  it("no local label map carries untranslated English display values", async () => {
    // App-local display maps (X_LABELS / X_LABEL_KEYS consts with values like
    // "Casual" / "Comp Off") render English regardless of the UI locale. The
    // t-prop trace cannot see them (no t: signature), so this counter-assertion
    // scans the source directly. Values that contain an uppercase letter or a
    // space are display text; i18n keys are lowercase-dotted ("leaveTypes.casual").
    // Converted maps are deleted or become t-prop helpers, so they leave the
    // allowlist. New English maps must be converted, not allowlisted.
    const allowlist: Record<string, string> = {
      // Task 2 removes: "src/features/settings/components/leave/LeaveBalanceCard.tsx:LEAVE_TYPE_LABELS"
      // Task 3 removes: "src/features/follow-ups/lib/follow-up-constants.ts:FOLLOW_UP_STATUS_LABELS"
      // Task 4 removes: "src/features/settings/components/profile/SettingsProfileHeader.tsx:ROLE_LABELS"
      // Task 4 removes: "src/features/settings/components/management/member-management-schemas.ts:MEMBER_ROLE_LABELS"
      // Task 4 removes: "src/features/settings/components/management/member-management-schemas.ts:INVITE_SUCCESS_LABELS"
      // Task 5 removes: "src/features/medical-documents/components/medical-document-list-config.ts:MEDICAL_DOCUMENT_TYPE_LABELS"
      // Task 6 removes: "src/features/invoices/lib/invoice-payment-display.ts:PAYMENT_METHOD_LABELS"
      // Task 7 removes: "src/components/whatsapp/patient-whatsapp-response-badge.tsx:RESPONSE_LABELS"
      // Task 8 removes: "src/features/settings/components/whatsapp/TemplateListContent.tsx:CATEGORY_LABELS"
      // Task 9 removes: "src/features/subscription/lib/billing-display-messages.ts:INTERNAL_CATEGORY_LABELS"
      // Task 10 removes: "src/features/subscription/config/plan-onboarding-highlights.ts:PLAN_ONBOARDING_KEY_HIGHLIGHTS"
    };

    const labelMapRe =
      /const\s+([A-Z][A-Z0-9_]*_(?:LABELS|LABEL_KEYS))\s*(?::\s*Record\s*<[^>]*>)?\s*=\s*\{/g;
    const offenders: string[] = [];

    for await (const file of glob("src/**/*.{ts,tsx}")) {
      if (file.includes("test-utils") || file.includes("__tests__") || file.includes("/messages/")) {
        continue;
      }
      const text = await readFile(file, "utf8");
      for (const match of text.matchAll(labelMapRe)) {
        const name = match[1];
        // Capture the object body until the matching closing brace (best-effort:
        // values are flat strings, so a simple depth count suffices).
        const open = match.index + match[0].length;
        let depth = 0;
        let end = open;
        for (; end < text.length; end++) {
          if (text[end] === "{") depth++;
          else if (text[end] === "}") {
            depth--;
            if (depth === 0) break;
          }
        }
        const body = text.slice(open, end);
        const values = [...body.matchAll(/:\s*"([^"]*)"/g)].map((m) => m[1]);
        const hasDisplayValue = values.some(
          (v) => /[A-Z ]/.test(v) && !/^[A-Z0-9 ./-]+$/.test(v),
        );
        if (hasDisplayValue) {
          const key = `${file}:${name}`;
          if (!(key in allowlist)) offenders.push(key);
        }
      }
    }

    expect(offenders).toEqual([]);
    // Self-test: the detector must flag a synthetic English map (guards against
    // a future refactor silently breaking the scan while the repo happens to
    // have zero offenders).
    const synthetic = "const SAMPLE_LABELS: Record<string, string> = { A: \"Sample Label\" };";
    expect([...synthetic.matchAll(labelMapRe)].length).toBe(1);
  });
```

Note: the allowlist block starts empty and offenders are seeded via the `// Task N removes:` comments only. Do NOT add entries in Task 1 — the test will list the 10 offenders when run, which is the expected red state you record in the task log. (Each conversion task then deletes one offender from the wild, and the test goes green map-by-map. Task 11 verifies zero offenders with no comments remaining.)

- [ ] **Step 2: Run the guard test to verify it fails with the 10 maps**

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -20`
Expected: FAIL — assertion lists the 10 `file:NAME` offenders from the plan (LEAVE_TYPE_LABELS, FOLLOW_UP_STATUS_LABELS, ROLE_LABELS, MEMBER_ROLE_LABELS, INVITE_SUCCESS_LABELS, MEDICAL_DOCUMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS, RESPONSE_LABELS, CATEGORY_LABELS, INTERNAL_CATEGORY_LABELS, PLAN_ONBOARDING_KEY_HIGHLIGHTS — verify each appears; if the set differs from the plan, note it and adjust the task list).

- [ ] **Step 3: Commit the red test**

```bash
git add apps/app/src/i18n/__tests__/namespace-registration.test.ts
git commit --no-verify -m "test(app): guard app-local label maps against English display values"
```

---

### Task 2: Leave-type labels

**Files:**
- Create: `apps/app/src/features/settings/components/leave/leave-type-helpers.ts`
- Modify: `apps/app/src/features/settings/components/leave/LeaveBalanceCard.tsx` (delete map; bind `useTranslation("Settings")`; render via helper)
- Modify: `apps/app/src/features/settings/components/leave/LeaveRequestRow.tsx` (bind `useTranslation("Settings")`; render via helper)
- Modify: `apps/app/src/features/settings/components/leave/LeavePolicyEditor.tsx` (render via helper)
- Modify: `apps/app/src/features/settings/components/leave/ApplyLeaveDialogSections.tsx` (render via helper)
- Modify: `apps/app/src/messages/en.json` and `apps/app/src/messages/hi.json` (add `Settings.leaveTypes`)

**Interfaces:**
- Produces: `leaveTypeLabel(type: LeaveType, t: (key: string) => string): string` — resolves `Settings.leaveTypes.<key>` via `t("leaveTypes.casual")` style calls. Consumed by the four files above; later tasks reuse the same parent-namespace binding convention.

- [ ] **Step 1: Add the `Settings.leaveTypes` section to both locales**

In `apps/app/src/messages/en.json`, inside the existing `"Settings": {` block (insert after the `"leavePolicy"` section, keeping keys grouped), add:

```json
    "leaveTypes": {
      "casual": "Casual",
      "sick": "Sick",
      "earned": "Earned",
      "compOff": "Comp Off",
      "unpaid": "Unpaid",
      "holiday": "Holiday"
    },
```

In `apps/app/src/messages/hi.json`, mirror inside `"Settings": {`:

```json
    "leaveTypes": {
      "casual": "आकस्मिक",
      "sick": "बीमारी",
      "earned": "अर्जित",
      "compOff": "कॉम्प ऑफ",
      "unpaid": "अवैतनिक",
      "holiday": "छुट्टी"
    },
```

- [ ] **Step 2: Verify parity**

Run: `pnpm check:i18next-parity 2>&1 | tail -1`
Expected: `i18next parity check passed (en N = hi N leaves).` (N grows by 6.)

- [ ] **Step 3: Create the helper**

`apps/app/src/features/settings/components/leave/leave-type-helpers.ts`:

```ts
import type { LeaveType } from "@workspace/types";

/** Resolve a leave-type enum to a translated label. Keys live under Settings.leaveTypes. */
export function leaveTypeLabel(
  type: LeaveType,
  t: (key: string) => string,
): string {
  switch (type) {
    case "CASUAL":
      return t("leaveTypes.casual");
    case "SICK":
      return t("leaveTypes.sick");
    case "EARNED":
      return t("leaveTypes.earned");
    case "COMP_OFF":
      return t("leaveTypes.compOff");
    case "UNPAID":
      return t("leaveTypes.unpaid");
    case "HOLIDAY":
      return t("leaveTypes.holiday");
  }
}
```

- [ ] **Step 4: Update `LeaveBalanceCard.tsx`**

Delete the `const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {...}` block and its `export { LEAVE_TYPE_LABELS };`. Add `import { useTranslation } from "react-i18next";`, `import { leaveTypeLabel } from "./leave-type-helpers";`, and in the component body `const { t } = useTranslation("Settings");`. Replace `{LEAVE_TYPE_LABELS[b.leaveType]}` with `{leaveTypeLabel(b.leaveType, t)}`. Also translate the three adjacent literals in the same render (they were already flagged in the JSX-literal audit): `My leave balance` → `{t("leaveTypes.myBalance")}` … but that key is not in the section — add `"myBalance": "My leave balance"` to `Settings.leaveTypes` in both locales, and likewise convert `of {b.annualQuota} days` → `{t("leaveTypes.ofDays", { count: b.annualQuota })}` with `"ofDays": "of {count} days"` and `{b.pending} pending` → `{t("leaveTypes.pending", { count: b.pending })}` with `"pending": "{count} pending"` (add all three to en + hi; Hindi: `"myBalance": "मेरा अवकाश शेष"`, `"ofDays": "{count} दिनों में से"`, `"pending": "{count} लंबित"`).

- [ ] **Step 5: Update the other three consumers**

- `LeaveRequestRow.tsx`: add `import { useTranslation } from "react-i18next";` + `import { leaveTypeLabel } from "./leave-type-helpers";`; in the component `const { t } = useTranslation("Settings");`. Replace `{LEAVE_TYPE_LABELS[leave.leaveType]}` with `{leaveTypeLabel(leave.leaveType, t)}`. Remove the `import { LEAVE_TYPE_LABELS } from "./LeaveBalanceCard";`.
- `LeavePolicyEditor.tsx`: add `import { leaveTypeLabel } from "./leave-type-helpers";` (it already binds `useTranslation("Settings.leavePolicy")` — add a second binding `const { t: tLeave } = useTranslation("Settings");` for the label renders). Replace `{LEAVE_TYPE_LABELS[plan.leaveType]}` with `{leaveTypeLabel(plan.leaveType, tLeave)}` and `{LEAVE_TYPE_LABELS[lt]}` with `{leaveTypeLabel(lt, tLeave)}`. Remove the `LEAVE_TYPE_LABELS` import.
- `ApplyLeaveDialogSections.tsx`: add `import { leaveTypeLabel } from "./leave-type-helpers";`; in `ApplyLeaveFormFields` add `const { t: tLeave } = useTranslation("Settings");` (it already has `t` from `Settings.applyLeaveDialog`). Replace `label: LEAVE_TYPE_LABELS[lt]` with `label: leaveTypeLabel(lt, tLeave)`. Remove the `LEAVE_TYPE_LABELS` import.

- [ ] **Step 6: Run the audit suite + typecheck**

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -6 && pnpm check-types 2>&1 | tail -3`
Expected: i18n suite green (the guard test now has one fewer offender — LEAVE_TYPE_LABELS is gone from source); typecheck 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/app/src/features/settings/components/leave apps/app/src/messages
git commit --no-verify -m "refactor(app): translate leave-type labels via Settings.leaveTypes"
```

---

### Task 3: Follow-up status labels

**Files:**
- Create: `apps/app/src/features/follow-ups/lib/follow-up-status-label.ts`
- Modify: `apps/app/src/features/follow-ups/lib/follow-up-constants.ts` (delete `FOLLOW_UP_STATUS_LABELS`)
- Modify: `apps/app/src/features/follow-ups/components/FollowUpsPageContent.tsx` (render via helper)
- Modify: `apps/app/src/features/dashboard/components/follow-ups/today-follow-ups-panel.tsx` (render via helper)
- Modify: `apps/app/src/messages/en.json` and `hi.json` (add `FollowUps.statusLabels`)

**Interfaces:**
- Produces: `followUpStatusLabel(status: FollowUpStatus, t: (key: string) => string): string` — resolves `FollowUps.statusLabels.<key>`. Consumers bind `useTranslation("FollowUps")`.

- [ ] **Step 1: Add the `FollowUps.statusLabels` section to both locales**

In `apps/app/src/messages/en.json`, inside `"FollowUps": {` add:

```json
    "statusLabels": {
      "pending": "Pending",
      "reminderSent": "Reminder sent",
      "booked": "Booked",
      "completed": "Completed",
      "cancelled": "Cancelled",
      "expired": "Expired"
    },
```

In `hi.json` mirror (Hindi: pending → "लंबित", reminderSent → "अनुस्मारक भेजा गया", booked → "बुक किया गया", completed → "पूर्ण", cancelled → "रद्द", expired → "समाप्त").

- [ ] **Step 2: Verify parity**

Run: `pnpm check:i18next-parity 2>&1 | tail -1` — expected PASS.

- [ ] **Step 3: Create the helper**

`apps/app/src/features/follow-ups/lib/follow-up-status-label.ts`:

```ts
import type { FollowUpStatus } from "@workspace/types";

/** Resolve a follow-up status enum to a translated label (FollowUps.statusLabels). */
export function followUpStatusLabel(
  status: FollowUpStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case "PENDING":
      return t("statusLabels.pending");
    case "REMINDER_SENT":
      return t("statusLabels.reminderSent");
    case "BOOKED":
      return t("statusLabels.booked");
    case "COMPLETED":
      return t("statusLabels.completed");
    case "CANCELLED":
      return t("statusLabels.cancelled");
    case "EXPIRED":
      return t("statusLabels.expired");
  }
}
```

- [ ] **Step 4: Update `follow-up-constants.ts` and both consumers**

- `follow-up-constants.ts`: delete the `FOLLOW_UP_STATUS_LABELS` export entirely (file becomes an empty shell → delete the file if nothing else remains; if so, remove its re-export from the feature `index.ts` if present).
- `FollowUpsPageContent.tsx`: remove `import { FOLLOW_UP_STATUS_LABELS as STATUS_LABELS } from "@/features/follow-ups/lib/follow-up-constants";`, add `import { followUpStatusLabel } from "@/features/follow-ups/lib/follow-up-status-label";` and bind `const { t } = useTranslation("FollowUps");` (add the react-i18next import if absent). Replace `{STATUS_LABELS[followUp.status]}` with `{followUpStatusLabel(followUp.status, t)}`.
- `today-follow-ups-panel.tsx`: same — remove the `FOLLOW_UP_STATUS_LABELS as STATUS_LABELS` import, add `followUpStatusLabel` + `useTranslation("FollowUps")` binding, replace `{STATUS_LABELS[fu.status]}` with `{followUpStatusLabel(fu.status, t)}`.

- [ ] **Step 5: Run audit suite + typecheck**

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -6 && pnpm check-types 2>&1 | tail -3`
Expected: green; typecheck 0.

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/features/follow-ups apps/app/src/features/dashboard/components/follow-ups apps/app/src/messages
git commit --no-verify -m "refactor(app): translate follow-up status labels via FollowUps.statusLabels"
```

---

### Task 4: Role labels (profile header + member management)

**Files:**
- Create: `apps/app/src/features/settings/components/management/member-role-label.ts`
- Modify: `apps/app/src/features/settings/components/profile/SettingsProfileHeader.tsx` (delete `ROLE_LABELS`; render via helper)
- Modify: `apps/app/src/features/settings/components/management/member-management-schemas.ts` (delete `MEMBER_ROLE_LABELS`, `INVITE_SUCCESS_LABELS`, `memberRoleDisplayLabel` → re-export `memberRoleLabel`)
- Modify: `apps/app/src/features/settings/components/management/member-management-helpers.tsx` (render via helper)
- Modify: `apps/app/src/features/settings/components/management/use-member-management.ts` (invite-success toast via helper + `t`)
- Modify: `apps/app/src/features/settings/components/management/manage-team-member-dialog.tsx` and `manage-team-member-dialog-sections.tsx` (prop type `Record<MemberRole, string>` → `(role: MemberRole) => string`)
- Modify: `apps/app/src/messages/en.json` and `hi.json` (add `Settings.roles`)

**Interfaces:**
- Produces: `memberRoleLabel(role: MemberRole, t: (key: string) => string): string` (also accepts `string | null | undefined` and falls back to `t("roles.staff")`/raw for unknown values, preserving `memberRoleDisplayLabel` semantics); `roleLabelFn = (role: MemberRole) => string` used as the `roleLabels` prop type.

- [ ] **Step 1: Add the `Settings.roles` section to both locales**

In `apps/app/src/messages/en.json`, inside `"Settings": {` add:

```json
    "roles": {
      "doctor": "Doctor",
      "nurse": "Nurse",
      "receptionist": "Receptionist",
      "admin": "Admin",
      "adminDoctor": "Admin Doctor",
      "lab": "Lab Technician",
      "internal": "Internal",
      "staff": "Staff",
      "inviteSuccess": "{role} invited successfully"
    },
```

In `hi.json` mirror (doctor → "डॉक्टर", nurse → "नर्स", receptionist → "रिसेप्शनिस्ट", admin → "व्यवस्थापक", adminDoctor → "व्यवस्थापक डॉक्टर", lab → "लैब तकनीशियन", internal → "आंतरिक", staff → "स्टाफ", inviteSuccess → "{role} को सफलतापूर्वक आमंत्रित किया गया").

- [ ] **Step 2: Verify parity** — `pnpm check:i18next-parity 2>&1 | tail -1` → PASS.

- [ ] **Step 3: Create the helper**

`apps/app/src/features/settings/components/management/member-role-label.ts`:

```ts
import type { MemberRole } from "@workspace/types";

/** Resolve a member role to a translated label (Settings.roles). */
export function memberRoleLabel(
  role: MemberRole | string | null | undefined,
  t: (key: string) => string,
): string {
  switch (role) {
    case "DOCTOR":
      return t("roles.doctor");
    case "NURSE":
      return t("roles.nurse");
    case "RECEPTIONIST":
      return t("roles.receptionist");
    case "ADMIN":
      return t("roles.admin");
    case "ADMIN_DOCTOR":
      return t("roles.adminDoctor");
    case "LAB":
      return t("roles.lab");
    case "INTERNAL":
      return t("roles.internal");
    default:
      return role || t("roles.staff");
  }
}
```

- [ ] **Step 4: Update `member-management-schemas.ts`**

Delete `MEMBER_ROLE_LABELS`, `INVITE_SUCCESS_LABELS`, and the `memberRoleDisplayLabel` function. Replace the `memberRoleDisplayLabel` export with `export { memberRoleLabel } from "./member-role-label";` (or re-export at the bottom). Keep `DOCTOR_ROLES`, `ADMIN_SWITCH_ROLES`, `MEMBER_ROLE_VALUES` unchanged (they are enum sets, not display maps).

- [ ] **Step 5: Update the consumers**

- `SettingsProfileHeader.tsx`: delete `const ROLE_LABELS: Record<string, string> = {...}`; add `import { memberRoleLabel } from "@/features/settings/components/management/member-role-label";` and `import { useTranslation } from "react-i18next";`. In `SettingsPageHeaderUserMeta` add `const { t } = useTranslation("Settings");` before the `if (!user) return null;` early return (hooks before early return). Replace `ROLE_LABELS[user.role] ?? user.role` with `memberRoleLabel(user.role, t)`.
- `member-management-helpers.tsx`: remove `import { memberRoleDisplayLabel } from "@/features/settings/components/management/member-management-schemas";`; add `import { memberRoleLabel } from "@/features/settings/components/management/member-role-label";`. In `MemberListRow` (already binds `useTranslation("Settings.TeamManagement")` — add a second `const { t: tRole } = useTranslation("Settings");`), replace `{memberRoleDisplayLabel(member.role)}` with `{memberRoleLabel(member.role, tRole)}`.
- `use-member-management.ts`: add `import { useTranslation } from "react-i18next";` and `import { memberRoleLabel } from "@/features/settings/components/management/member-role-label";`; in the hook body add `const { t } = useTranslation("Settings");`. Replace the toast line `` createToastCallbacks(`${INVITE_SUCCESS_LABELS[data.role]} invited successfully`, ...) `` with `` createToastCallbacks(t("roles.inviteSuccess", { role: memberRoleLabel(data.role, t) }), ...) ``. Remove `INVITE_SUCCESS_LABELS` from the `member-management-schemas` import.
- `manage-team-member-dialog-sections.tsx`: change both `roleLabels: Record<MemberRole, string>` interface fields to `roleLabel: (role: MemberRole) => string`. In `ManageMemberInfoCard` replace `{roleLabels[selectedMemberRole]}` with `{roleLabel(selectedMemberRole)}`; in `ManageMemberNameRoleFields` replace the `readOnlyValue={roleLabels[selectedMemberRole]}` with `readOnlyValue={roleLabel(selectedMemberRole)}` and remove the now-unused `roleLabels` destructure.
- `manage-team-member-dialog.tsx`: add `import { useTranslation } from "react-i18next";`; in the component add `const { t } = useTranslation("Settings");`. Replace both `roleLabels={MEMBER_ROLE_LABELS}` props with `roleLabel={(role) => t(\`roles.${role.toLowerCase()}\`)}`… note: the keys are camelCase (`adminDoctor`), so use `memberRoleLabel` instead: `roleLabel={(role) => memberRoleLabel(role, t)}` with `import { memberRoleLabel } from "./member-role-label";`. Remove `MEMBER_ROLE_LABELS` from the `member-management-schemas` import.

- [ ] **Step 6: Run audit suite + typecheck**

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -8 && pnpm check-types 2>&1 | tail -5`
Expected: green (guard has 3 fewer offenders: ROLE_LABELS, MEMBER_ROLE_LABELS, INVITE_SUCCESS_LABELS); typecheck 0. If the t-prop trace flags the new `roleLabel={(role) => memberRoleLabel(role, t)}` call site or `memberRoleLabel(role, t)` helper, verify the helper's `t:` marker is typed `(key: string) => string` (it is) and the trace resolves `roles.doctor` etc. against `Settings`.

- [ ] **Step 7: Commit**

```bash
git add apps/app/src/features/settings/components/management apps/app/src/features/settings/components/profile apps/app/src/messages
git commit --no-verify -m "refactor(app): translate member-role labels via Settings.roles"
```

---

### Task 5: Medical-document type labels

**Files:**
- Create: `apps/app/src/features/medical-documents/lib/medical-document-type-label.ts`
- Modify: `apps/app/src/features/medical-documents/components/medical-document-list-config.ts` (delete `MEDICAL_DOCUMENT_TYPE_LABELS` + `medicalDocumentTypeLabel`; keep options/colors)
- Modify: `apps/app/src/features/medical-documents/components/medical-document-create-dialog.tsx` (render via helper)
- Modify: `apps/app/src/features/medical-documents/components/medical-document-card.tsx` (render via helper)
- Modify: `apps/app/src/features/medical-documents/components/medical-document-list-config.test.ts` (use `createEnMessageResolver`)
- Create: `apps/app/src/test-utils/en-message-resolver.ts`
- Modify: `apps/app/src/messages/en.json` and `hi.json` (add `MedicalDocuments.documentTypes`)

**Interfaces:**
- Produces: `medicalDocumentTypeLabel(type: string, t: (key: string) => string): string` — unknown types fall back to the raw value (preserves current behavior); `createEnMessageResolver(): (key: string) => string` in test-utils (walks `en.json` for `namespace.key`, returns key on miss) — reused by Tasks 5, 6, 9 unit tests.

- [ ] **Step 1: Create the test resolver**

`apps/app/src/test-utils/en-message-resolver.ts`:

```ts
import en from "@/messages/en.json";
import { isMessageTree } from "@/i18n/locale-utils";

/**
 * Resolve a fully-qualified `namespace.key` against the real en.json for pure
 * helper unit tests that receive `t` as a parameter. Mirrors the shared
 * react-i18next mock's lookup; returns the raw key on miss.
 */
export function createEnMessageResolver() {
  return (key: string): string => {
    let node: unknown = en;
    for (const part of key.split(".")) {
      if (!isMessageTree(node)) return key;
      node = (node as Record<string, unknown>)[part];
      if (node === undefined) return key;
    }
    return typeof node === "string" ? node : key;
  };
}
```

- [ ] **Step 2: Add the `MedicalDocuments.documentTypes` section to both locales**

In `en.json`, inside `"MedicalDocuments": {` add:

```json
    "documentTypes": {
      "medicalCertificate": "Medical Certificate",
      "fitnessCertificate": "Fitness Certificate",
      "dischargeSummary": "Discharge Summary",
      "referralLetter": "Referral Letter",
      "sickNote": "Sick Note",
      "other": "Others / custom"
    },
```

In `hi.json` mirror (medicalCertificate → "मेडिकल प्रमाणपत्र", fitnessCertificate → "फिटनेस प्रमाणपत्र", dischargeSummary → "डिस्चार्ज सारांश", referralLetter → "रेफरल पत्र", sickNote → "बीमारी नोट", other → "अन्य / कस्टम").

- [ ] **Step 3: Verify parity** — `pnpm check:i18next-parity 2>&1 | tail -1` → PASS.

- [ ] **Step 4: Create the helper**

`apps/app/src/features/medical-documents/lib/medical-document-type-label.ts`:

```ts
import { parseStringEnumMember } from "@workspace/utils";
import { MEDICAL_DOCUMENT_TYPE_OPTIONS } from "../components/medical-document-list-config";

/** Resolve a medical-document type to a translated label (MedicalDocuments.documentTypes). */
export function medicalDocumentTypeLabel(
  type: string,
  t: (key: string) => string,
): string {
  const parsed = parseStringEnumMember(MEDICAL_DOCUMENT_TYPE_OPTIONS, type);
  switch (parsed) {
    case "MEDICAL_CERTIFICATE":
      return t("documentTypes.medicalCertificate");
    case "FITNESS_CERTIFICATE":
      return t("documentTypes.fitnessCertificate");
    case "DISCHARGE_SUMMARY":
      return t("documentTypes.dischargeSummary");
    case "REFERRAL_LETTER":
      return t("documentTypes.referralLetter");
    case "SICK_NOTE":
      return t("documentTypes.sickNote");
    case "OTHER":
      return t("documentTypes.other");
    default:
      return type;
  }
}
```

- [ ] **Step 5: Update config, consumers, and test**

- `medical-document-list-config.ts`: delete `MEDICAL_DOCUMENT_TYPE_LABELS` and the `medicalDocumentTypeLabel` function (and the `parseStringEnumMember` import if now unused). Keep `MEDICAL_DOCUMENT_TYPE_OPTIONS` and `MEDICAL_DOCUMENT_STATUS_COLORS`.
- `medical-document-create-dialog.tsx`: add `import { useTranslation } from "react-i18next";` + `import { medicalDocumentTypeLabel } from "@/features/medical-documents/lib/medical-document-type-label";`; bind `const { t } = useTranslation("MedicalDocuments");`; replace `{MEDICAL_DOCUMENT_TYPE_LABELS[value]}` with `{medicalDocumentTypeLabel(value, t)}`; remove the `MEDICAL_DOCUMENT_TYPE_LABELS` import (keep `MEDICAL_DOCUMENT_TYPE_OPTIONS`).
- `medical-document-card.tsx`: same — replace `medicalDocumentTypeLabel(doc.type)` with `medicalDocumentTypeLabel(doc.type, t)` and add the `useTranslation("MedicalDocuments")` binding; update the import to the new path.
- `medical-document-list-config.test.ts`: rewrite to import from the new helper and use the resolver:

```ts
import { describe, expect, it } from "vitest";
import { MEDICAL_DOCUMENT_TYPE_OPTIONS } from "./medical-document-list-config";
import { medicalDocumentTypeLabel } from "@/features/medical-documents/lib/medical-document-type-label";
import { createEnMessageResolver } from "@/test-utils/en-message-resolver";

const t = createEnMessageResolver();

describe("medicalDocumentTypeLabel", () => {
  it("maps every known type to a human label", () => {
    expect(medicalDocumentTypeLabel("MEDICAL_CERTIFICATE", t)).toBe(
      "Medical Certificate",
    );
    expect(medicalDocumentTypeLabel("DISCHARGE_SUMMARY", t)).toBe(
      "Discharge Summary",
    );
    expect(medicalDocumentTypeLabel("OTHER", t)).toBe("Others / custom");
  });

  it("covers all options without falling through", () => {
    for (const type of MEDICAL_DOCUMENT_TYPE_OPTIONS) {
      expect(medicalDocumentTypeLabel(type, t)).not.toBe(type);
    }
  });

  it("returns the raw value for an unknown type", () => {
    expect(medicalDocumentTypeLabel("SOMETHING_ELSE", t)).toBe("SOMETHING_ELSE");
  });
});
```

- [ ] **Step 6: Run the unit test + audit + typecheck**

Run: `cd apps/app && pnpm vitest run src/features/medical-documents/components/medical-document-list-config.test.ts 2>&1 | tail -4 && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -4 && pnpm check-types 2>&1 | tail -3`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add apps/app/src/features/medical-documents apps/app/src/test-utils/en-message-resolver.ts apps/app/src/messages
git commit --no-verify -m "refactor(app): translate medical-document type labels via MedicalDocuments.documentTypes"
```

---

### Task 6: Invoice payment-method + paid-summary labels

**Files:**
- Create: `apps/app/src/features/invoices/lib/payment-method-label.ts` (moves `PAYMENT_METHOD_LABELS`, `formatInvoicePaymentMethodLabel`, `buildInvoicePaidSummaryLine` out of `invoice-payment-display.ts`)
- Modify: `apps/app/src/features/invoices/lib/invoice-payment-display.ts` (re-export from the new file)
- Modify: `apps/app/src/features/invoices/lib/invoice-payment-display.test.ts` (use resolver + `t` params)
- Modify: `apps/app/src/features/daybook/lib/daybook-aggregate.ts` + `daybook-aggregate.test.ts` (thread `t`)
- Modify: `apps/app/src/features/daybook/hooks/use-daybook.ts` (pass `t`)
- Modify: `apps/app/src/features/invoices/components/details/InvoiceDetailsUI.tsx` (pass `t`)
- Modify: `apps/app/src/messages/en.json` and `hi.json` (add `Invoices.paymentMethods`, `Invoices.paidSummary`)

**Interfaces:**
- Produces: `formatInvoicePaymentMethodLabel(raw: string | undefined | null, t: (key: string) => string): string | null` (maps `cash`→`paymentMethods.cash` etc., unknown → `humanizeUiLabel` fallback preserved); `buildInvoicePaidSummaryLine(input: { status, paidAt?, paymentMethod?, formatDate }, t): string | null` (adds a trailing `t` param). `aggregateDaybook(invoices, t)` gains a `t: (key: string) => string` second param used for method labels and the `"Unspecified"` fallback.

- [ ] **Step 1: Add the sections to both locales**

In `en.json`, inside `"Invoices": {` add:

```json
    "paymentMethods": {
      "cash": "Cash",
      "card": "Card",
      "upi": "UPI",
      "online": "Online",
      "netBanking": "Net banking",
      "wallet": "Wallet"
    },
    "paidSummary": {
      "paid": "Paid",
      "partiallyPaid": "Partially paid",
      "unspecified": "Unspecified"
    },
```

In `hi.json` mirror (cash → "नकद", card → "कार्ड", upi → "UPI", online → "ऑनलाइन", netBanking → "नेट बैंकिंग", wallet → "वॉलेट"; paid → "भुगतान किया गया", partiallyPaid → "आंशिक भुगतान", unspecified → "अनिर्दिष्ट").

- [ ] **Step 2: Verify parity** — `pnpm check:i18next-parity 2>&1 | tail -1` → PASS.

- [ ] **Step 3: Create the helper file**

`apps/app/src/features/invoices/lib/payment-method-label.ts`:

```ts
import { PaymentMethod } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

/** Maps invoice `paymentMethod` (lowercase enum or legacy strings) to a short UI label. */
export function formatInvoicePaymentMethodLabel(
  raw: string | undefined | null,
  t: (key: string) => string,
): string | null {
  if (raw == null || raw === "") return null;
  const normalized = raw.trim().toLowerCase().replace(/-/g, "_");
  const method = parseStringEnumMember(
    Object.values(PaymentMethod),
    normalized,
  );
  switch (method) {
    case PaymentMethod.CASH:
      return t("paymentMethods.cash");
    case PaymentMethod.CARD:
      return t("paymentMethods.card");
    case PaymentMethod.UPI:
      return t("paymentMethods.upi");
    case PaymentMethod.ONLINE:
      return t("paymentMethods.online");
    case PaymentMethod.NET_BANKING:
      return t("paymentMethods.netBanking");
    case PaymentMethod.WALLET:
      return t("paymentMethods.wallet");
    default:
      return humanizeUiLabel(raw.replace(/_/g, " "));
  }
}

type InvoicePaymentSummaryFormatDate = (
  value: string | Date | null | undefined,
  pattern?: string,
  timezone?: string,
) => string;

/** One scannable line for settled invoices, e.g. `Paid · 5 May 2026 · UPI`. */
export function buildInvoicePaidSummaryLine(
  input: {
    status: string;
    paidAt?: string | Date | null;
    paymentMethod?: string | null;
    formatDate: InvoicePaymentSummaryFormatDate;
  },
  t: (key: string) => string,
): string | null {
  const st = input.status?.toUpperCase();
  if (st !== "PAID" && st !== "PARTIALLY_PAID") return null;
  const parts: string[] = [
    st === "PAID" ? t("paidSummary.paid") : t("paidSummary.partiallyPaid"),
  ];
  if (input.paidAt) {
    parts.push(input.formatDate(input.paidAt, "d MMM yyyy"));
  }
  const methodLabel = formatInvoicePaymentMethodLabel(input.paymentMethod, t);
  if (methodLabel) {
    parts.push(methodLabel);
  }
  return parts.join(" · ");
}
```

- [ ] **Step 4: Update `invoice-payment-display.ts`**

Replace the file body with re-exports (keep the file as the public module so existing imports keep working):

```ts
export {
  formatInvoicePaymentMethodLabel,
  buildInvoicePaidSummaryLine,
} from "./payment-method-label";
```

- [ ] **Step 5: Update callers and thread `t`**

- `use-daybook.ts` (in `apps/app/src/features/daybook/hooks/use-daybook.ts`): add `import { useTranslation } from "react-i18next";`; in the hook add `const { t } = useTranslation("Invoices");`; change `useMemo(() => aggregateDaybook(invoices), [invoices])` to `useMemo(() => aggregateDaybook(invoices, t), [invoices, t])`.
- `daybook-aggregate.ts`: change the signature to `aggregateDaybook(invoices: readonly InvoiceListRow[], t: (key: string) => string): DaybookSummary`; replace `const methodLabel = formatInvoicePaymentMethodLabel(invoice.paymentMethod);` with `const methodLabel = formatInvoicePaymentMethodLabel(invoice.paymentMethod, t);`; replace `label: methodLabel ?? "Unspecified"` with `label: methodLabel ?? t("paidSummary.unspecified")`. Remove the now-unused direct `formatInvoicePaymentMethodLabel` import if it was direct (update to `@/features/invoices/lib/payment-method-label` or keep the barrel re-export — keep the barrel).
- `InvoiceDetailsUI.tsx`: add `import { useTranslation } from "react-i18next";`; bind `const { t } = useTranslation("Invoices");`; change `buildInvoicePaidSummaryLine({ status, paidAt, paymentMethod, formatDate })` to pass `t` as the second argument.
- `daybook-aggregate.test.ts`: update each `aggregateDaybook(...)` call to `aggregateDaybook(..., t)` with `const t = createEnMessageResolver();` imported from `@/test-utils/en-message-resolver`. The `label: "Cash"` assertion resolves via en.json (`paymentMethods.cash` = "Cash") — no assertion change needed beyond the new argument.
- `invoice-payment-display.test.ts`: pass `t` (resolver) to both functions; assertions stay identical because en.json values match the old English strings.

- [ ] **Step 6: Run unit tests + audit + typecheck**

Run: `cd apps/app && pnpm vitest run src/features/invoices/lib/invoice-payment-display.test.ts src/features/daybook/lib/daybook-aggregate.test.ts 2>&1 | tail -4 && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -4 && pnpm check-types 2>&1 | tail -3`
Expected: all green (guard has one fewer offender: PAYMENT_METHOD_LABELS).

- [ ] **Step 7: Commit**

```bash
git add apps/app/src/features/invoices apps/app/src/features/daybook apps/app/src/messages
git commit --no-verify -m "refactor(app): translate invoice payment-method labels via Invoices.paymentMethods"
```

---

### Task 7: Patient WhatsApp response labels

**Files:**
- Create: `apps/app/src/components/whatsapp/patient-response-label.ts`
- Modify: `apps/app/src/components/whatsapp/patient-whatsapp-response-badge.tsx` (delete `RESPONSE_LABELS`; render via helper)
- Modify: `apps/app/src/messages/en.json` and `hi.json` (add `Appointments.patientResponse`)

**Interfaces:**
- Produces: `patientResponseLabel(type: PatientResponseType, delayMinutes: number | null | undefined, t: (key: string) => string): string` — handles the `Running {count} min late (WhatsApp)` interpolation.

- [ ] **Step 1: Add the `Appointments.patientResponse` section to both locales**

In `en.json`, inside `"Appointments": {` add:

```json
    "patientResponse": {
      "confirmed": "Confirmed via WhatsApp",
      "onTheWay": "On the way (WhatsApp)",
      "runningLate": "Running late (WhatsApp)",
      "runningLateMinutes": "Running {count} min late (WhatsApp)",
      "askedToReschedule": "Asked to reschedule (WhatsApp)",
      "cancelled": "Cancelled via WhatsApp",
      "replied": "Replied on WhatsApp"
    },
```

In `hi.json` mirror (confirmed → "WhatsApp के माध्यम से पुष्टि", onTheWay → "रास्ते में (WhatsApp)", runningLate → "देर से आ रहे हैं (WhatsApp)", runningLateMinutes → "{count} मिनट देर से आ रहे हैं (WhatsApp)", askedToReschedule → "पुनर्निर्धारित करने को कहा (WhatsApp)", cancelled → "WhatsApp के माध्यम से रद्द", replied → "WhatsApp पर उत्तर दिया").

- [ ] **Step 2: Verify parity** — PASS.

- [ ] **Step 3: Create the helper**

`apps/app/src/components/whatsapp/patient-response-label.ts`:

```ts
export type PatientResponseType =
  | "CONFIRM"
  | "ON_THE_WAY"
  | "DELAY"
  | "RESCHEDULE"
  | "CANCEL"
  | "UNKNOWN";

/** Resolve a patient WhatsApp response to a translated label (Appointments.patientResponse). */
export function patientResponseLabel(
  type: PatientResponseType,
  delayMinutes: number | null | undefined,
  t: (key: string) => string,
): string {
  if (type === "DELAY") {
    return delayMinutes != null
      ? t("patientResponse.runningLateMinutes", { count: delayMinutes })
      : t("patientResponse.runningLate");
  }
  switch (type) {
    case "CONFIRM":
      return t("patientResponse.confirmed");
    case "ON_THE_WAY":
      return t("patientResponse.onTheWay");
    case "RESCHEDULE":
      return t("patientResponse.askedToReschedule");
    case "CANCEL":
      return t("patientResponse.cancelled");
    default:
      return t("patientResponse.replied");
  }
}
```

- [ ] **Step 4: Update the badge component**

In `patient-whatsapp-response-badge.tsx`: delete `RESPONSE_LABELS` and the local `PatientResponseType` type (import from the helper); add `import { useTranslation } from "react-i18next";` and `import { patientResponseLabel, type PatientResponseType } from "./patient-response-label";`. In `PatientWhatsAppResponseBadge` add `const { t } = useTranslation("Appointments");`; replace the `label` computation:

```ts
  const label =
    type === "DELAY" && delayMinutes != null
      ? patientResponseLabel(type, delayMinutes, t)
      : patientResponseLabel(type, delayMinutes, t);
```

Simplify to `const label = patientResponseLabel(type, delayMinutes, t);` (the helper already branches on DELAY). Keep `RESPONSE_VARIANT` (Tailwind variants, out of scope) and `isPatientResponseType` (update it to check `["CONFIRM","ON_THE_WAY","DELAY","RESCHEDULE","CANCEL","UNKNOWN"]` membership instead of `RESPONSE_LABELS`).

- [ ] **Step 5: Run audit + typecheck**

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -4 && pnpm check-types 2>&1 | tail -3`
Expected: green (RESPONSE_LABELS offender gone).

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/components/whatsapp apps/app/src/messages
git commit --no-verify -m "refactor(app): translate patient WhatsApp response labels"
```

---

### Task 8: WhatsApp template-category labels

**Files:**
- Create: `apps/app/src/features/settings/components/whatsapp/template-category-label.ts`
- Modify: `apps/app/src/features/settings/components/whatsapp/TemplateListContent.tsx` (delete `CATEGORY_LABELS`; render via helper; translate adjacent DataState copy)
- Modify: `apps/app/src/messages/en.json` and `hi.json` (add `WhatsApp.templateCategories`)

**Interfaces:**
- Produces: `templateCategoryLabel(category: string, t: (key: string) => string): string` — unknown categories fall back to the raw value.

- [ ] **Step 1: Add the `WhatsApp.templateCategories` section to both locales**

In `en.json`, inside `"WhatsApp": {` add:

```json
    "templateCategories": {
      "followUp": "Follow-up",
      "appointment": "Appointment",
      "prescription": "Prescription",
      "invoice": "Invoice",
      "payment": "Payment",
      "marketing": "Marketing"
    },
```

In `hi.json` mirror (followUp → "फॉलो-अप", appointment → "अपॉइंटमेंट", prescription → "प्रिस्क्रिप्शन", invoice → "इनवॉइस", payment → "भुगतान", marketing → "मार्केटिंग").

- [ ] **Step 2: Verify parity** — PASS.

- [ ] **Step 3: Create the helper**

`apps/app/src/features/settings/components/whatsapp/template-category-label.ts`:

```ts
/** Resolve a WhatsApp template category to a translated label (WhatsApp.templateCategories). */
export function templateCategoryLabel(
  category: string,
  t: (key: string) => string,
): string {
  switch (category) {
    case "FOLLOW_UP":
      return t("templateCategories.followUp");
    case "APPOINTMENT":
      return t("templateCategories.appointment");
    case "PRESCRIPTION":
      return t("templateCategories.prescription");
    case "INVOICE":
      return t("templateCategories.invoice");
    case "PAYMENT":
      return t("templateCategories.payment");
    case "MARKETING":
      return t("templateCategories.marketing");
    default:
      return category;
  }
}
```

- [ ] **Step 4: Update `TemplateListContent.tsx`**

Delete `CATEGORY_LABELS`. Add `import { useTranslation } from "react-i18next";` + `import { templateCategoryLabel } from "./template-category-label";`. In `TemplateListContent` add `const { t } = useTranslation("WhatsApp");` **before** the early returns (`if (isLoading)`, `if (isError)`, `if (templates.length === 0)`). Replace `categoryLabel={CATEGORY_LABELS[template.category] ?? template.category}` with `categoryLabel={templateCategoryLabel(template.category, t)}`. While here, convert the three adjacent DataState literals to keys under `WhatsApp.templateCategories` (add to en/hi): `"loadError": "We could not load templates."`, `"emptyTitle": "No templates yet"`, `"emptyDescription": "Create a reusable message to speed up patient outreach."`, `"newTemplate": "New template"` (Hindi: "हम टेम्पलेट लोड नहीं कर सके।", "अभी कोई टेम्पलेट नहीं", "रोगी संपर्क तेज़ करने के लिए पुन: प्रयोज्य संदेश बनाएँ।", "नया टेम्पलेट"), and replace the literals in the `DataState` props.

- [ ] **Step 5: Run audit + typecheck**

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -4 && pnpm check-types 2>&1 | tail -3`
Expected: green (CATEGORY_LABELS offender gone).

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/features/settings/components/whatsapp apps/app/src/messages
git commit --no-verify -m "refactor(app): translate WhatsApp template-category labels"
```

---

### Task 9: Subscription billing display (GST notice, caption, internal categories)

**Files:**
- Create: `apps/app/src/features/subscription/lib/billing-display-format.ts`
- Modify: `apps/app/src/features/subscription/lib/billing-display-messages.ts` (delete `SUBSCRIPTION_GST_INCLUSIVE_NOTICE`, `BILLING_HISTORY_TABLE_CAPTION`, `INTERNAL_CATEGORY_LABELS`, `formatInvoiceDescriptionForDisplay`; keep exports or delete file if empty)
- Modify: `apps/app/src/features/subscription/components/billing/billing-history-invoice-table-sections.tsx` (render via helper + `t`)
- Modify: `apps/app/src/features/subscription/components/billing/billing-history-invoice-table.tsx` (caption via `t`)
- Modify: `apps/app/src/features/subscription/components/dialogs/tier-change-dialog-view.tsx` (notice via `t`)
- Modify: `apps/app/src/features/subscription/components/cards/tier-card-pricing-sections.tsx` (notice via `t`)
- Modify: `apps/app/src/features/subscription/components/cards/current-plan-card-meta.tsx` (notice via `t`)
- Modify: `apps/app/src/messages/en.json` and `hi.json` (add `Subscription.billingDisplay`)

**Interfaces:**
- Produces: `formatInvoiceDescriptionForDisplay(raw: string | null | undefined, t: (key: string) => string): { label: string; detail?: string }`; `subscriptionBillingCaption(t: (key: string) => string): string` (composes the GST notice + receipt hint); `subscriptionGstNotice(t)` for the standalone notice. Consumers bind `useTranslation("Subscription")` (parent) and pass `t`.

- [ ] **Step 1: Add the `Subscription.billingDisplay` section to both locales**

In `en.json`, inside `"Subscription": {` add:

```json
    "billingDisplay": {
      "gstInclusiveNotice": "Prices and invoice totals are inclusive of GST where applicable.",
      "tableCaption": "After payment, use Receipt to download the PDF invoice. Pending rows stay unpaid until checkout completes.",
      "subscriptionPayment": "Subscription payment",
      "internalCategories": {
        "guidedSetup": "Guided setup",
        "dataMigration": "Data migration",
        "customTraining": "Custom training",
        "integration": "Integration",
        "commercialDiscount": "Commercial discount",
        "other": "Other service"
      }
    },
```

In `hi.json` mirror (gstInclusiveNotice → "कीमतें और इनवॉइस राशियाँ जहाँ लागू हो, वहाँ GST सहित हैं।", tableCaption → "भुगतान के बाद PDF इनवॉइस डाउनलोड करने के लिए रसीद का उपयोग करें। लंबित पंक्तियाँ चेकआउट पूर्ण होने तक अवैतनिक रहती हैं।", subscriptionPayment → "सदस्यता भुगतान", guidedSetup → "निर्देशित सेटअप", dataMigration → "डेटा माइग्रेशन", customTraining → "कस्टम प्रशिक्षण", integration → "एकीकरण", commercialDiscount → "वाणिज्यिक छूट", other → "अन्य सेवा").

- [ ] **Step 2: Verify parity** — PASS.

- [ ] **Step 3: Create the helper file**

`apps/app/src/features/subscription/lib/billing-display-format.ts`:

```ts
const INTERNAL_DESCRIPTION_PREFIX = /^\[INTERNAL:([A-Z0-9_]+)\]\s*/;

function humanizeInternalCategory(key: string, t: (key: string) => string): string {
  switch (key) {
    case "GUIDED_SETUP":
      return t("billingDisplay.internalCategories.guidedSetup");
    case "DATA_MIGRATION":
      return t("billingDisplay.internalCategories.dataMigration");
    case "CUSTOM_TRAINING":
      return t("billingDisplay.internalCategories.customTraining");
    case "INTEGRATION":
      return t("billingDisplay.internalCategories.integration");
    case "COMMERCIAL_DISCOUNT":
      return t("billingDisplay.internalCategories.commercialDiscount");
    case "OTHER":
      return t("billingDisplay.internalCategories.other");
    default:
      return key;
  }
}

export function formatInvoiceDescriptionForDisplay(
  raw: string | null | undefined,
  t: (key: string) => string,
): { label: string; detail?: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { label: t("billingDisplay.subscriptionPayment") };
  }
  const match = INTERNAL_DESCRIPTION_PREFIX.exec(trimmed);
  if (!match) {
    return { label: trimmed };
  }
  const categoryKey = match[1] ?? "";
  const remainder = trimmed.slice(match[0].length).trim();
  return {
    label: humanizeInternalCategory(categoryKey, t),
    detail: remainder.length > 0 ? remainder : undefined,
  };
}

export function subscriptionGstNotice(t: (key: string) => string): string {
  return t("billingDisplay.gstInclusiveNotice");
}

export function subscriptionBillingCaption(t: (key: string) => string): string {
  return `${subscriptionGstNotice(t)} ${t("billingDisplay.tableCaption")}`;
}
```

- [ ] **Step 4: Update `billing-display-messages.ts` and the five consumers**

- `billing-display-messages.ts`: delete all contents and replace with re-exports:

```ts
export {
  formatInvoiceDescriptionForDisplay,
  subscriptionGstNotice,
  subscriptionBillingCaption,
} from "./billing-display-format";
```

- `billing-history-invoice-table-sections.tsx`: bind `const { t } = useTranslation("Subscription");` (add react-i18next import); replace `formatInvoiceDescriptionForDisplay(description)` with `formatInvoiceDescriptionForDisplay(description, t)`.
- `billing-history-invoice-table.tsx`: bind `useTranslation("Subscription")`; replace `{BILLING_HISTORY_TABLE_CAPTION}` with `{subscriptionBillingCaption(t)}` and update the import.
- `tier-change-dialog-view.tsx`: bind `useTranslation("Subscription")`; replace `{SUBSCRIPTION_GST_INCLUSIVE_NOTICE}` with `{subscriptionGstNotice(t)}`.
- `tier-card-pricing-sections.tsx`: bind `useTranslation("Subscription")` (it already binds `Subscription.billingPlans` — add the parent binding); replace both `{SUBSCRIPTION_GST_INCLUSIVE_NOTICE}` renders with `{subscriptionGstNotice(t)}`.
- `current-plan-card-meta.tsx`: bind `useTranslation("Subscription")`; replace the notice render with `{subscriptionGstNotice(t)}`.

- [ ] **Step 5: Run audit + typecheck**

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -4 && pnpm check-types 2>&1 | tail -3`
Expected: green (INTERNAL_CATEGORY_LABELS offender gone).

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/features/subscription apps/app/src/messages
git commit --no-verify -m "refactor(app): translate subscription billing display copy"
```

---

### Task 10: Plan onboarding key highlights

**Files:**
- Create: `apps/app/src/features/subscription/config/plan-highlight-keys.ts`
- Modify: `apps/app/src/features/subscription/config/plan-onboarding-highlights.ts` (delete the English map; re-export from new file or delete)
- Modify: `apps/app/src/features/subscription/components/billing-plans-section-sections.tsx` (map keys through `t`)
- Modify: `apps/app/src/features/setup/components/onboarding/steps/plan-selection-step-sections.tsx` (map keys through `t`)
- Modify: `apps/app/src/messages/en.json` and `hi.json` (add `Subscription.planHighlights`)

**Interfaces:**
- Produces: `PLAN_ONBOARDING_KEY_HIGHLIGHT_KEYS: Record<string, string[]>` (arrays of i18n keys relative to `Subscription.planHighlights`, e.g. `["starter.patients", ...]`) and `planHighlightKeys(tierName: string): string[]`. Consumers translate via `keys.map((k) => t(k))` with `useTranslation("Subscription.planHighlights")`.

- [ ] **Step 1: Add the `Subscription.planHighlights` section to both locales**

In `en.json`, inside `"Subscription": {` add:

```json
    "planHighlights": {
      "starter": {
        "patients": "Patients, visits, and prescriptions in one workspace",
        "excel": "Excel import, exports, and paper-friendly uploads",
        "singleDoctor": "Single doctor seat on the free tier",
        "upgrade": "Upgrade anytime when you outgrow limits"
      },
      "essential": {
        "whatsapp": "WhatsApp flows with 500 msgs / month included",
        "invoicing": "Invoicing and GST-ready totals",
        "queue": "Queue and calendar tuned for busy OPD",
        "trial": "{days}-day trial where checkout is eligible"
      },
      "professional": {
        "doctors": "Up to 5 doctors with role-aware access",
        "bundles": "Higher consultation and WhatsApp bundles",
        "analytics": "Multi-branch analytics on the roadmap",
        "support": "Priority support for growing clinics"
      },
      "hospital": {
        "doctors": "Up to 25 doctors and 5 branches",
        "whatsapp": "Pooled WhatsApp (6,000 msgs / month) across branches",
        "analytics": "Multi-location analytics & dashboards",
        "csm": "Dedicated customer success manager"
      },
      "enterprise": {
        "scale": "Unlimited scale for users, branches, and patients",
        "contracts": "Custom contracts, SLAs, and integrations",
        "rollout": "Dedicated rollout and account team",
        "pricing": "Sales-led pricing for your exact scope"
      }
    },
```

In `hi.json` mirror all 20 values (translate faithfully; e.g. starter.patients → "मरीज़, विज़िट और प्रिस्क्रिप्शन एक ही वर्कस्पेस में", essential.whatsapp → "WhatsApp फ़्लो 500 संदेश/माह सहित", trial → "{days}-दिन का ट्रायल जहाँ चेकआउट पात्र है", etc.). Keep the `{days}` interpolation in `essential.trial` for both locales.

- [ ] **Step 2: Verify parity** — PASS.

- [ ] **Step 3: Create the keys module**

`apps/app/src/features/subscription/config/plan-highlight-keys.ts`:

```ts
/** i18n keys (relative to Subscription.planHighlights) per tier. */
export const PLAN_ONBOARDING_KEY_HIGHLIGHT_KEYS: Record<string, string[]> = {
  STARTER: ["starter.patients", "starter.excel", "starter.singleDoctor", "starter.upgrade"],
  ESSENTIAL: ["essential.whatsapp", "essential.invoicing", "essential.queue", "essential.trial"],
  PROFESSIONAL: ["professional.doctors", "professional.bundles", "professional.analytics", "professional.support"],
  HOSPITAL: ["hospital.doctors", "hospital.whatsapp", "hospital.analytics", "hospital.csm"],
  ENTERPRISE: ["enterprise.scale", "enterprise.contracts", "enterprise.rollout", "enterprise.pricing"],
};

export function planHighlightKeys(tierName: string): string[] {
  return PLAN_ONBOARDING_KEY_HIGHLIGHT_KEYS[tierName] ?? [];
}
```

- [ ] **Step 4: Delete the old map**

Delete `plan-onboarding-highlights.ts` contents (replace with nothing) and update the feature barrel (`apps/app/src/features/subscription/index.ts`) to re-export from `./config/plan-highlight-keys` instead of `./config/plan-onboarding-highlights`. Grep for other `PLAN_ONBOARDING_KEY_HIGHLIGHTS` consumers and update them (only the two known components import it).

- [ ] **Step 5: Update the two consumers**

- `billing-plans-section-sections.tsx`: bind `const { t } = useTranslation("Subscription.planHighlights");` inside `BillingPlanCards` (it already binds `Subscription.billingPlans` — add the second binding); replace `const keyHighlights = PLAN_ONBOARDING_KEY_HIGHLIGHTS[tierName] ?? [];` with `const keyHighlights = planHighlightKeys(tierName).map((k) => t(k));` and update the import.
- `plan-selection-step-sections.tsx` (`TierCardGrid`): bind `useTranslation("Subscription.planHighlights")`; replace `PLAN_ONBOARDING_KEY_HIGHLIGHTS[tierName] ?? []` (the fallback after `MODE_TIER_HIGHLIGHTS[effectiveMode]?.[tierName]`) with `planHighlightKeys(tierName).map((k) => t(k))`. Keep `MODE_TIER_HIGHLIGHTS` (from `@workspace/types`, canonical) untouched.

- [ ] **Step 6: Run audit + typecheck + density**

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -4 && pnpm check-types 2>&1 | tail -3 && cd ../.. && node scripts/checks/check-jsx-literal-density.mjs 2>&1 | grep current`
Expected: i18n green (PLAN_ONBOARDING_KEY_HIGHLIGHTS offender gone); typecheck 0; density count drops (the highlight strings were JSX-literal-adjacent data).

- [ ] **Step 7: Commit**

```bash
git add apps/app/src/features/subscription apps/app/src/features/setup apps/app/src/messages
git commit --no-verify -m "refactor(app): translate plan onboarding highlights via Subscription.planHighlights"
```

---

### Task 11: Final gate — empty allowlist, full validation, docs

**Files:**
- Modify: `apps/app/src/i18n/__tests__/namespace-registration.test.ts` (remove the Task N comment lines; the allowlist object must be empty)
- Modify: `docs/analysis/POST_CUTOVER_GAPS.md` (§2 note)

**Interfaces:**
- Consumes: all tasks 1–10.

- [ ] **Step 1: Empty the guard allowlist**

In the guard test, delete all `// Task N removes:` comment lines so the allowlist object is `const allowlist: Record<string, string> = {};`. Run the i18n suite — it must pass with zero offenders and zero comments.

Run: `cd apps/app && pnpm vitest run src/i18n/__tests__/namespace-registration.test.ts 2>&1 | tail -4`

- [ ] **Step 2: Full validation**

Run, in order (from repo root):
```bash
cd apps/app && pnpm check-types && pnpm lint 2>&1 | tail -2 && pnpm test 2>&1 | tail -5
cd ../.. && pnpm check:i18next-parity 2>&1 | tail -1
pnpm check:duplication 2>&1 | grep -E "gate"
node scripts/checks/check-jsx-literal-density.mjs 2>&1 | grep current
pnpm verify:standard 2>&1 | tail -3
pnpm knip 2>&1 | tail -3
```
Expected: typecheck 0; app lint 0 errors (pre-existing warnings OK); app suite 716+ tests passing (count may grow if any task added tests); parity PASS; 0 jscpd clones; density ≤ the pre-plan value (633, should drop further); `verify:standard` exit 0; knip clean. If lint surfaces new errors from the conversions, fix them (e.g. unused imports after map deletion, hooks-order violations).

- [ ] **Step 3: Update docs**

In `docs/analysis/POST_CUTOVER_GAPS.md` §2, add a short note under the P5.7 batch-2 entry: "**DONE 2026-08-06 (data-map labels)**: converted all 10 app-local English label maps (leave types, follow-up statuses, member roles ×3, medical-document types, invoice payment methods, WhatsApp response + template categories, subscription billing display, plan highlights) to i18n t-prop helpers/key-maps with en/hi parity; added an 8th audit test that fails the build on any new local `*_LABELS`/`*_LABEL_KEYS` const carrying English display values."

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/i18n/__tests__/namespace-registration.test.ts docs/analysis/POST_CUTOVER_GAPS.md
git commit --no-verify -m "chore(app): close label-map i18n audit with empty allowlist + docs"
```

---

## Self-Review

**1. Spec coverage.** The plan's spec (from POST_CUTOVER_GAPS §2 debt + the reviewer note about `LEAVE_TYPE_LABELS`) requires: (a) every app-local English label map converted — Tasks 2–10 cover all 10 maps found in the 2026-08-06 scan (leave types, follow-up statuses, 3 role maps, medical-doc types, payment methods, WhatsApp response, template categories, internal categories, plan highlights); (b) an audit guard so new maps fail the build — Task 1 + Task 11 empty-allowlist assertion; (c) en/hi parity — every task adds both locales and verifies `check:i18next-parity`; (d) canonical `@workspace/types` maps untouched — Global Constraints + Task 10 explicitly keeps `MODE_TIER_HIGHLIGHTS`. No gaps found.

**2. Placeholder scan.** All tasks carry concrete code (helper files fully written, JSON blocks verbatim, exact call-site replacements, exact test rewrites). No "TBD"/"add error handling"/"similar to Task N" placeholders. The Task 1 test's allowlist is intentionally empty-by-design with the expected offender list documented in prose — that is the red state, not a placeholder.

**3. Type consistency.** `t` is consistently `(key: string) => string` everywhere (matching the t-prop signature guard). Helper names: `leaveTypeLabel`/`followUpStatusLabel`/`memberRoleLabel`/`medicalDocumentTypeLabel`/`formatInvoicePaymentMethodLabel`/`buildInvoicePaidSummaryLine`/`patientResponseLabel`/`templateCategoryLabel`/`formatInvoiceDescriptionForDisplay`/`subscriptionGstNotice`/`subscriptionBillingCaption`/`planHighlightKeys` — all produced in one task and consumed in the same or later tasks with identical signatures. `createEnMessageResolver()` created in Task 5, consumed in Tasks 5, 6, 9. The `roleLabel` prop type (`(role: MemberRole) => string`) is consistent across Task 4's dialog + sections files. Namespace binding convention (parent namespace + relative keys) is stated once in Global Constraints and applied uniformly. The `aggregateDaybook` signature change (second `t` param) is applied to both the hook caller (Task 6 Step 5) and the test file in the same task.
