# Cutover Communication Template

## Scope

Reusable communication snippets for:

- Phase 1 production go-live
- Phase 2 Railway/Neon -> AWS/RDS cutover
- Rollback scenarios

Use this with operational docs in `docs/deployment`.

## 1) Pre-Window Announcement (T-24h or T-2h)

**Subject:** Scheduled maintenance window - Docita platform

Hello team,

We will perform a scheduled deployment/cutover during the following window:

- **Date:** <YYYY-MM-DD>
- **Start:** <HH:MM TZ>
- **End:** <HH:MM TZ>
- **Impact:** <No downtime / Intermittent latency / Read-only period>

Scope:

- Frontend: <unchanged / deploy updates>
- API: <Railway release / AWS cutover>
- Database: <Neon migrations / Neon to RDS cutover>

Operator contacts:

- Incident Lead: <name>
- Backup Lead: <name>
- Comms Owner: <name>

Next update will be posted at maintenance start.

## 2) Maintenance Start (T0)

**Subject:** Maintenance started - Docita platform

Maintenance has started at **<HH:MM TZ>**.

Current phase:

1. <Backup/freeze>
2. <Deploy/migrate>
3. <Health checks>
4. <Functional validation>

Expected completion remains **<HH:MM TZ>**.

## 3) In-Progress Update (Periodic)

**Subject:** Maintenance update - Docita platform

Status at **<HH:MM TZ>**:

- Phase complete: <name>
- Current phase: <name>
- Health status: <green/yellow/red>
- Risks/blockers: <none or short list>

ETA remains **<HH:MM TZ>**.

## 4) Go-Live / Cutover Success

**Subject:** Maintenance completed successfully - Docita platform

Maintenance completed at **<HH:MM TZ>**.

Completed actions:

- <API deploy/cutover complete>
- <DB migration/restore complete>
- <Health checks pass>
- <Smoke checks pass>

Post-release monitoring window: **<duration>**.

Please report any anomalies in <channel/ticket>.

## 5) Rollback Triggered

**Subject:** Rollback in progress - Docita platform

Rollback has been initiated at **<HH:MM TZ>** due to:

- <Trigger condition>

Rollback actions:

1. <DNS/API endpoint revert>
2. <Database endpoint revert>
3. <Service health revalidation>

Next update in **<N minutes>**.

## 6) Rollback Completed

**Subject:** Rollback completed - Docita platform

Rollback completed at **<HH:MM TZ>**.

Current state:

- Traffic served by: <Railway/AWS>
- Database backend: <Neon/RDS>
- Health status: <green/yellow/red>

Follow-up:

- Incident summary ETA: <time>
- Next cutover decision: <date/time>

## 7) Incident Summary (Post-Event)

**Subject:** Post-maintenance summary - Docita platform

Summary:

- Window: <start-end>
- Outcome: <success/rollback>
- User impact: <none/minor/major>
- Root issue (if any): <brief>
- Corrective actions: <brief list>
- Next planned action: <date/time>

## 8) Comms Checklist

- [ ] Channel(s) decided: <Slack/Email/Status page>
- [ ] Audience list confirmed
- [ ] Update cadence set (e.g., every 20-30 min)
- [ ] Single comms owner assigned
- [ ] All timestamps include timezone
- [ ] Success and rollback templates pre-filled before window
