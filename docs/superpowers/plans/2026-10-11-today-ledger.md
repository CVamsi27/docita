# Today ledger implementation plan

> **For agentic workers:** Use test-driven-development to execute these checkbox steps in the current feature branch. The user has already requested implementation; no additional execution approval is required.

**Goal:** Implement the approved Today ledger in light and dark mode without changing consultation permissions or mutation semantics.

**Architecture:** Compose existing Table, ListRow, Section, DataState and Button primitives around the canonical dashboard appointment list. A shared RecordWorkspace composition provides a desktop record region and a narrow-screen Sheet, also consumed by internal. Keep the current visit separate from the selected appointment and reuse the existing start-next callback.

**Tech Stack:** Node >=22.22.0, pnpm@10.30.3, React, React Router, Vitest, Playwright, shared UI and existing semantic theme tokens.

## Global constraints

- Follow `docs/ui/UI_UX_STANDARD_2026.md` and the approved detailed design.
- No new dependencies, theme stores, patient-detail queries, API fields or changes to access policy.
- Patient identity uses Inter; heading typography and colors come from existing tokens.
- The list supplies scheduled time, not arrival time or a queue token. Use the honest Scheduled column.
- Preserve `dashboard-queue`, the Queue heading, scoped Ask AI and stable Start next accessible name.
- Landing is deferred by the user's explicit clarification.

### Task 1: Responsive record context

**Files:** create `packages/ui/src/components/layout/record-workspace.tsx` and its colocated test; update `docs/ui/UI_UX_STANDARD_2026.md`.

**Interface:** `RecordWorkspace` consumes children, context, contextTitle, contextDescription, previewOpen, onPreviewOpenChange and a return-focus button ref. It renders the same context in an xl desktop aside or the shared Sheet below xl.

- [x] Write a failing behavior test using a real matchMedia stub: a narrow preview has a named dialog, closes on Escape and returns focus; a wide workspace exposes a named complementary region without a dialog.
- [x] Run `pnpm --filter @workspace/ui exec vitest run src/components/layout/record-workspace.test.tsx --maxWorkers=1`; observe missing implementation failure.
- [x] Implement the composition with `useMediaQuery("(min-width: 1280px)")`, shared Sheet and existing tokens. Closing uses the initiating button when connected; disappearing records cannot retain editable context.

```tsx
<Sheet open={previewOpen && !wide} onOpenChange={onPreviewOpenChange}>
  <SheetContent>
    <SheetHeader><SheetTitle>{contextTitle}</SheetTitle><SheetDescription>{contextDescription}</SheetDescription></SheetHeader>
    <div className="min-h-0 overflow-y-auto p-4">{context}</div>
  </SheetContent>
</Sheet>
```

- [x] Run the new tests and UI typecheck; document the shared pattern without adding a new palette.

### Task 2: Today queue and active visit

**Files:** create `apps/app/src/features/dashboard/components/today/today-ledger.tsx`, `today-appointment-context.tsx`, and `today-ledger.test.tsx`; modify `today-page-content-sections.tsx`, `today-page-content.tsx`, both Dashboard message files and the bottom-bar test.

**Interface:** ledger consumes `AppointmentListItem[]`, currentPatient, nextPatient, canStartConsultation, isStarting and onStartNextPatient. Context takes the selected/current list record and active encounter independently. No data fetch is owned by either presentational component.

- [x] Add failing regressions with schema-parsed complete appointment fixtures: selecting a scheduled row previews it without calling start; Continue retains `/consultation/active-id`; Start next invokes the supplied operation once and is disabled while pending; selection clears when the appointment leaves the list; denied users see no consultation mutation.

```tsx
fireEvent.click(screen.getByRole("button", { name: "View appointment: Riya Iyer" }));
expect(screen.getByRole("dialog", { name: "Selected appointment" })).toBeInTheDocument();
expect(handleStartNext).not.toHaveBeenCalled();
expect(screen.getByRole("link", { name: "Continue consultation" })).toHaveAttribute("href", "/consultation/active-id");
```

- [x] Run the focused Vitest file and observe the missing-ledger failure before implementation.
- [x] Implement Table on desktop and continuous ListRowGroup on phone. View buttons store only a selected ID. Derive the record from the current props on every render; never keep a stale record snapshot. Use current clinic timezone via the existing formatter. Scheduled/status fields remain distinct from selection.
- [x] Wire the existing start-next hook once through TodayPageContent; its callback and pending state serve desktop and the dock. Current visit owns the filled Continue action; Start next is secondary while active. Replace old Today workspace cards and duplicate schedule with the ledger while preserving follow-ups, shortcuts and sharing/advisor actions below it.
- [x] Add English and Hindi ledger labels. Make Open queue a quiet action. Extend the mobile dock to retain Continue when there is no next appointment, while keeping the existing standalone Start next contract.
- [x] Run ledger, bottom-bar and state-shell regressions; then all app units and typecheck.

### Task 3: Due work and verification

**Files:** modify `today-follow-ups-panel.tsx` and add closest behavior coverage; update the approved specification status and implementation evidence.

- [x] Test optional follow-up request failure followed by retry with a real QueryClient and only the external request mocked. Assert existing records remain usable and empty follow-ups differ from empty Today.
- [x] Flatten the panel with Section and continuous dividers; use DataState and the query's refetch for error recovery. Keep patient links and canonical follow-up labels.
- [x] Run `pnpm lint`, app `check-types`, app units, `build:cloudflare`, `pnpm audit:app`, `pnpm verify:standard`, `pnpm check:hygiene`, `pnpm knip` and shared UI checks.
- [x] Capture real Today light/dark at desktop and 320/390/768/1024px, inspect comfortable/compact layout, keyboard preview, Start next and AI focus. Compare with the approved source image and record remaining differences in `design-qa.md`.
- [x] Commit only after relevant checks pass: `feat(today): implement responsive consultation ledger`.

### Browser review corrections

- Restore semantic StatusBadge/PriorityBadge fills without overriding canonical status tokens. Verify computed colors in the browser in both themes.
- Use the existing primary Button variant for clinical primary actions.
- Replace the inactive floating consultation affordance with permission-aware queue navigation; omit it on Today where the persistent dock owns the action. Cover routing and denied access.

Acceptance evidence and browser refinement history are recorded in [design-qa.md](../../../design-qa.md). This slice is committed together with its shared composition and dependent application slice so consumers and primitive changes remain atomic.
