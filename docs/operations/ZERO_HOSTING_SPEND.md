# Zero hosting spend and maintenance state

On **19 October 2026**, the operator selected **zero total Docita hosting spend**,
including existing infrastructure, after being told that this can interrupt
production. This supersedes the earlier uncertainty about additional versus
total spending. The feature freeze still runs through 13 December; production
readiness is not certified.

The operator subsequently directed retaining the two Fly machines and keeping
Fly's gross monthly usage **strictly below $5**, relying on the personal-org
small-invoice waiver. This is a zero-collection goal, not authorization to pay
$5. Machine deletion is **not authorized**. CLI confirms organization type
`PERSONAL`; current invoice totals and application of the waiver still need
billing-console verification before any runtime is restored.

## Applied controls

The following were verified through provider control planes on 19 October:

- `docita-api` machine `185de22c211008` is **stopped and cordoned**. Fly reports
  `cordoned=true`, so its proxy does not route requests to this machine. Its
  instance and image identities are unchanged; no config update, start or
  filesystem replacement occurred. The API has shared IPv4/IPv6 and no volume.
- `docita-worker` machine `6835051b497568` remains **stopped**, with its instance
  and image unchanged, no allocated IP and no volume.
- **Daily Worker Queue Drain**, **Synthetic uptime monitoring**, **Deploy
  Production** and the legacy **Deploy Staging API** workflow each read back
  `disabled_manually`. The existing migration, timed scaling and DB restart
  guard workflows were already disabled and were left that way. Source security
  checks and branch protections were not weakened.
- Machine metadata/configuration was encrypted locally to the existing approved
  age recipient before routing changed. This is **not a root-filesystem backup**.
  No private recovery identity was accessed or recreated.
- Backups remain unactivated: `DOCITA_BACKUPS_ENABLED=false`. No new workflow
  dispatch, source push, clinical dump, host purchase or provider test send was
  performed in this pass.

The unchanged `auto_start_machines=true` source configuration is not the active
maintenance control: the API's provider routing cordon is. A later deployment,
uncordon or manual start can invalidate this state. Do not do one while the
spending and restart gates below remain open.

## Provider billing evidence

| Provider   | Verified state                                                                                                                                                                                                                                                                                                                                                   | Remaining limit or charge                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fly        | Organization type is **PERSONAL**. Two stopped machines; API cordoned; no volumes or dedicated IPv4 in these apps. Both machines are preserved.                                                                                                                                                                                                                  | Verify current gross usage, remaining-month rootfs forecast, waiver application and any support/extension charge. Strictly-below-$5 operation is not yet established. |
| Render     | Docita workspace is **Hobby**; its only service is the suspended **Free** staging API. No Postgres or Key Value instances. October accrued and projected totals both display **$0.00**. Build pipeline displays **$0 monthly spend limit**, with builds stopping after included minutes run out. **Auto-Deploy is Off**, verified again through the service API. | Bandwidth overages are separate from the build cap. Keep the service suspended.                                                                                       |
| Neon       | Current `org-old-truth-42386674` is **Free**. Its two projects are production `icy-river-59903017` and isolated staging `wispy-forest-27565397`. Inspection opened no database connection.                                                                                                                                                                       | Null or zero API usage fields do not establish actual stored bytes. The older alerted organization/project remains outside current management access.                 |
| GitHub     | Repository is public; the four runtime/deployment workflows above are disabled. No new push or hosted run was requested.                                                                                                                                                                                                                                         | Personal billing page is signed out. Docita Actions/Packages $0 hard budgets, existing storage usage and accrued charges are unverified.                              |
| Cloudflare | Existing document and backup data was left untouched; backup activation stays false.                                                                                                                                                                                                                                                                             | Dashboard is signed out and the Wrangler auth check exits 1. Worker/zone subscriptions, R2 usage and controls are unverified.                                         |
| Sentry     | CLI authentication passes, but the token has only `org:ci`; organization reads return 403. No paid monitor or new check-in was activated.                                                                                                                                                                                                                        | Console/billing access, subscription, included quota and paid-overage settings remain unverified.                                                                     |

Fly [charges for stopped root filesystems](https://fly.io/docs/about/pricing/)
as well as running compute. No new account budget can erase usage already
accrued. Removing only a machine leaves its Fly app, app secret store and
separate Neon/R2 data intact, but **permanently discards that machine's temporary
filesystem**. Both filesystems are uninspected and are being retained under the
operator's latest direction. Configuration custody does not prove filesystem
recovery. A [May 2026 Fly support forum clarification](https://community.fly.io/t/convert-new-organization-to-personal-organization/27828)
describes the below-$5 waiver for personal organizations; the current billing
documentation does not promise a universal $5 hard spending cap. Verify actual
account eligibility and the invoice rather than treating a forum statement as a
budget enforcement mechanism.

Neon's [Free limits](https://neon.com/docs/introduction/plans) stop compute or
reject growth when exhausted instead of silently upgrading the plan. Keep the
current organization on Free; no snapshot, extra service or paid plan was added.
Render's [Free documentation](https://render.com/docs/free) distinguishes its
build spend limit from bandwidth overage billing. An included allowance or an
email alert is not a universal hard spending cap.

## Effect on production

The production API is intentionally unavailable through Fly routing. Static
frontend assets may still load, but login and clinician operations need the API.
Worker queues are not drained, payment webhook processing cannot complete while
the API is unavailable, and uptime monitoring/recovery is paused. This is a
cost-driven maintenance state, not successful uptime or freeze-readiness proof.

Neon databases, R2 documents/locked backups, app secret stores and offline keys
have not been deleted. Do not replay historical queues or financial webhooks as
part of a restart. Reconcile provider delivery state and review normal queue
processing first; never infer that an unavailable API safely accepted an event.

## Remaining work and restart boundary

1. Verify billing console access and actual Docita subscriptions/usage. On
   [GitHub](https://docs.github.com/en/billing/how-tos/set-up-budgets), use $0
   budgets with **Stop usage when budget limit is reached**, at the narrowest
   supported Docita scope. Inspect Actions/storage and Packages separately;
   preserve subscriptions unrelated to Docita. Do not replace a hard stop with
   alerts alone.
2. Read Fly's current-month usage and forecast all remaining rootfs, runtime,
   network and subscription costs before permitting any start. Keep the sum
   strictly below $5 and verify that the account's waiver produces $0 collected.
   Stop/cordon controls remain in place while the totals are unavailable. Do not
   delete the machines or start one merely to inspect its filesystem.
3. Verify R2's actual stored bytes and operation exposure, and preserve the
   approved lock/retention policy. Do not purge clinical objects or locked
   backups to meet a storage target. Verify free Worker/zone plans and Sentry
   paid-overage settings before activating any replacement execution.
4. Only after all future hosting costs are eliminated or effectively blocked,
   assess a free execution option against the existing clinical, encryption,
   RLS, recovery, authenticated journey and staging-soak gates. Do not repurpose
   the isolated staging database as production or weaken a release check to fit
   the budget.
5. Restoring routing or workflows requires both verified zero-dollar operation
   and a reviewed release/recovery decision. Keep the [stability plan](../superpowers/plans/2026-10-13-two-month-stability.md)
   and [backup activation gates](ENCRYPTED_DATABASE_BACKUPS.md) in force.

Protected evidence is outside Git in the 19 October operator evidence directory.
No secret, raw billing profile, patient data or recovery private key belongs in
this record. **A $0 total bill is not yet verified.**
