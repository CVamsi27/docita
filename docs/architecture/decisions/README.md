# Architecture Decision Records (ADRs)

This directory captures the *why* behind structural decisions in the codebase.
Each ADR is a small Markdown file documenting one decision: context, choice,
alternatives weighed, and consequences.

## When to write one

- A new external dependency that is hard to swap (DB engine, queue, hosting).
- A pattern that has to hold across the whole codebase (RLS, ALS context, CQS).
- A trade-off that future contributors will ask "why?" about (Postgres queue
  vs Redis, OpenNext vs Vercel, single schema.prisma vs per-domain files).
- A deferred decision with an explicit "decide later" trigger.

## Format

Use `NNNN-short-kebab-title.md` (zero-padded sequence).
Copy [`0000-template.md`](0000-template.md). Keep the file under ~150 lines.

## Relationship to AGENTS.md

`AGENTS.md` is **normative** — it tells contributors what to do.
ADRs are **descriptive of decisions** — they explain why a rule exists, and
make superseded decisions traceable. When an ADR is superseded, link the
new one in the old one's header and update the corresponding section of
`AGENTS.md` or [`SYSTEM_DESIGN_AND_PATTERNS.md`](../SYSTEM_DESIGN_AND_PATTERNS.md).
