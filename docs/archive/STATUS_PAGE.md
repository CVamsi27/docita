# Docita Status Page Runbook

**Purpose:** canonical incident communication page for customers and internal teams.  
**Owner:** Engineering Operations  
**Last Updated:** February 15, 2026

---

## Public Status Endpoint

- Production URL: `https://status.docita.health`
- Fallback URL: `https://status.docita.work`
- Uptime source: UptimeRobot + API `/api/health`

> If the public page is unavailable, send updates via incident mailbox and PagerDuty timeline notes.

---

## Incident Communication SLA

- **SEV-1:** initial update within 15 minutes, then every 15 minutes
- **SEV-2:** initial update within 60 minutes, then every 30-60 minutes
- **SEV-3/4:** update at start and resolution

---

## Update Template

```markdown
Title: [Investigating | Identified | Monitoring | Resolved] - [Issue Summary]

Impact: [Who is affected and what functionality is impacted]
Start Time: [IST timestamp]
Current Status: [Investigating/Identified/Fix in progress/Monitoring]
Workaround: [If available]
Next Update: [IST timestamp]
```

---

## Resolution Template

```markdown
Title: Resolved - [Issue Summary]

Summary: [Brief cause and fix]
Start Time: [IST timestamp]
Resolved Time: [IST timestamp]
Customer Impact: [Scope and duration]
Follow-up: [Link to postmortem ticket]
```

---

## Operator Checklist

- [ ] Post incident start message
- [ ] Confirm affected components (API, App, Admin, Landing, Messaging)
- [ ] Keep timeline updates at SLA cadence
- [ ] Post resolution notice
- [ ] Link postmortem ticket
- [ ] Archive incident communication in incident log