# `prisma/schema/` — documentation-style decomposition (NOT the source)

This folder is a **per-topic decomposition** of the canonical schema kept
here for documentation and onboarding readability. It is **not** what
Prisma reads at build/migrate time.

The single source of truth is [`../schema.prisma`](../schema.prisma).
Edits to this folder **do not** affect the generated Prisma client or
migrations.

## Why this folder exists

The consolidated `schema.prisma` is 4000+ lines. Splitting models by
topic (auth, billing, appointments, ...) makes the data model easier to
read when onboarding. It does not provide structural advantages and is
not consumed by Prisma.

## When to update this folder

When you change a model in `schema.prisma`, also update the matching
topic file here so the decomposition stays useful. A future improvement
(tracked in `SYSTEM_DESIGN_AND_PATTERNS.md` §56 item 43) is to either
auto-generate this folder from `schema.prisma` or stop maintaining it.

## How to find a model

`rg "^model <ModelName>" .` from this folder.
