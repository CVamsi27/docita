# @docita/landing (Legacy)

This app is deprecated and kept only as a rollback path during the Astro cutover.

- Primary landing app: `@docita/landing-astro`
- Legacy app: `@docita/landing` (Next.js/OpenNext)

Use legacy scripts only when explicitly validating or rolling back:

```bash
pnpm dev:landing:next
pnpm build:landing:next
pnpm build:landing:next:cloudflare
pnpm preview:landing:next:cloudflare
pnpm deploy:landing:next:cloudflare
pnpm audit:landing:next
```
