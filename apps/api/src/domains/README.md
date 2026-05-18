# Backend domains

Each domain follows the canonical `{application,core,infrastructure,presentation}` layout per AGENTS.md §15.1. The following domains deliberately omit some folders — those omissions are documented per-domain:

| Domain | Missing folders | Reason |
|---|---|---|
| `dashboards` | `core`, `infrastructure`, `presentation` | Container for the `dashboard` sub-domain only — see `dashboards/dashboard/`. |
| `custom-fields` | `core`, `infrastructure` | DTO-only domain — presentation forwards to a shared service. |
| `doctor-clinics` | `core`, `infrastructure` | Thin association layer over the doctors and clinics aggregates. |
| `documents` | `core` | No domain entity yet — repository + service operate on Prisma rows directly until a `Document` aggregate is needed. |
| `enterprise-contracts` | `core` | Same as `documents` — pre-aggregate state. |
| `payments` | `application`, `presentation` | Port-only domain (`core/ports/` defines `IPaymentLinkProvider`); concrete implementations live in adapter modules (billing, subscriptions). |
| `public-booking` | `core`, `infrastructure` | Token + slot-window concerns live in `application/services/`; no domain aggregate. |
| `reminders` | `core`, `infrastructure` | Pure orchestration of `appointments` + `notifications`; no aggregate of its own. |
| `webhooks` | `core`, `infrastructure`, `presentation` | Generic webhook ingestion is per-provider; each adapter exposes its own controller. |

When a domain gains a new aggregate root, restructure to add the missing folders and update this table.
