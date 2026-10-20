# @workspace/hooks

Framework-agnostic React hooks shared across apps.

**Rule:** if a hook imports `react-router` (`useNavigate`, `useLocation`), or any app store — it stays in the app, not here.

## When to add here vs app-local hooks

| Add to `@workspace/hooks` | Keep in `apps/<app>/src/hooks` (or feature `hooks/`) |
|---|---|
| No `react-router`, no app routes, no domain API clients | Uses `useNavigate`, `useLocation`, or `react-router` |
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
| `useSpeechToText` | Web Speech API speech-to-text hook |
| `useToggle` | Boolean toggle with stable callbacks |

All hooks are exported from `src/index.ts`.
