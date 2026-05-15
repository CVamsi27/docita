# @workspace/types

Zod-first contract package.

## Boundaries

- Defines reusable Zod schemas and `z.infer` types.
- Owns HTTP request/response contracts shared by API and clients.
- Does not contain persistence, UI, or app-specific business orchestration.
- Prefer schema composition with `.pick()`, `.omit()`, and `.extend()` over copying field lists.

Update this package before changing API DTOs or frontend forms for the same shape.
