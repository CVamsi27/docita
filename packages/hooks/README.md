# @workspace/hooks

Framework-agnostic React hooks shared across apps.

**Rule:** if a hook imports `next/navigation`, `next/router`, or any app store — it stays in the app, not here.

## When to add here vs apps/app/hooks

| Add to `@workspace/hooks` | Keep in `apps/app/hooks` (or feature) |
|---|---|
| No Next.js, no app routes, no domain API clients | Uses `useRouter`, `usePathname`, or `next/navigation` |
| Useful to at least two apps or packages today | Only consumed by one feature or one app |
| Pure React + Web APIs only | Calls `@workspace/data-access` hooks or app stores |

## Exports

| Hook | What it does |
|---|---|
| `useClickOutside` | Fires callback when a click occurs outside a ref |
| `useDebounce` | Returns a debounced value after a delay |
| `useDetectedCurrency` | Detects browser-locale currency code |
| `useIntersectionObserver` | Wraps `IntersectionObserver` |
| `useKeyboardShortcuts` | Registers keyboard shortcut handlers |
| `useLocalStorage` | Typed `localStorage` state with SSR safety |
| `useMediaQuery` | Returns boolean match for a CSS media query |
| `useMedicalCalculations` | BMI, BSA, and other clinical calculation helpers |
| `useMounted` | Returns `true` after first client render |
| `useSessionStorage` | Typed `sessionStorage` state |
| `useSpeechToText` | Web Speech API speech-to-text hook |
| `useToggle` | Boolean toggle with stable callbacks |

All hooks are exported from `src/index.ts`.
