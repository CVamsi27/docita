# 0014: Cloudflare Origin Protection for docita-api

- **Status**: accepted
- **Date**: 2026-08-17
- **Deciders**: platform, security
- **Tags**: infra, security, networking

## Context

The API (`docita-api`) sits on Fly.io behind Cloudflare. Cloudflare's DNS points to Fly's shared Anycast IP, so the Fly origin is publicly reachable — anyone who discovers the Fly IP (via DNS history, scanning, or Fly's `.fly.dev` hostname) can bypass Cloudflare entirely and hit the API directly.

This matters because:
1. **Rate limiting bypass**: `CF-Connecting-IP` can be spoofed on direct-to-origin traffic, rotating the per-IP throttle key. The OTP 5/min and partner 60/20 limits were bypassable (fixed at the application layer in PR #294).
2. **WAF/bot protection bypass**: Cloudflare's bot detection, challenge pages, and geo-blocking are skipped.
3. **Origin IP exposure**: The Fly origin IP is a attack surface that Cloudflare's proxy is designed to hide.

Fly.io does **not** support source-IP-based ingress filtering for `http_service` traffic. The Network Policies API (`POST /v1/apps/<app>/network_policies`) only applies to traffic directly to and from Machines — not traffic routed through the Fly Proxy, which is what `[http_service]` uses. A Fly.io staff member confirmed (Dec 2025, community thread #26532): *"We do have plans to eventually support the ability for you to 'program' the proxy to only accept connections that match a certain pattern, but no ETA on that yet."*

## Decision

Accept the application-level mitigation (PR #294: Cloudflare peer verification for throttler IP resolution) as the current maximum achievable in-repo defense. Document the Fly.io platform limitation and the three paths forward for network-level origin protection. Do not implement a Cloudflare Tunnel in this change — it requires a separate architectural decision and ops work.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| **Accept residual + app-level fix (chosen)** | Zero infra change; PR #294 already ships the application-level defense; throttler limits are scoped to the real client IP when traffic arrives through Cloudflare | Direct-to-origin traffic still bypasses Cloudflare's WAF/bot protection; the Fly origin IP is exposed | Maximum achievable without infra changes; app-level fix is already shipped |
| **Cloudflare Tunnel (cloudflared sidecar)** | Eliminates direct-to-origin entirely; origin accepts connections only from Cloudflare's edge; no exposed IP | New sidecar process per Machine (~30 MB RAM); `fly.toml` `[http_service]` becomes internal-only; adds a network hop (latency); failure mode: if cloudflared dies, Machine is unreachable even to Fly health checks; requires `cloudflared` config, tunnel creation, DNS routing, and deploy verification | Significant ops work + architectural tradeoffs (latency, failure mode, cost) — defer to a separate decision |
| **Wait for Fly.io native firewall** | Zero implementation effort; Fly's built-in solution when it ships | No ETA (community-requested since 2021); Fly staff confirmed plans but no timeline | Cannot rely on an undated platform feature |
| **Fly.io Network Policies** | Available today via API | **Does not apply to proxy-routed traffic** — explicitly documented in Fly docs: "Network policies only apply to traffic directly to and from Machines. They do not affect traffic routed through the Fly Proxy." | Fundamentally incompatible with `http_service` |

## Consequences

- **Positive**: Application-level defense (PR #294) is shipped and verified — throttler limits are correctly scoped to real client IPs when traffic arrives through Cloudflare. The Cloudflare IP ranges are pinned and verified against `cloudflare.com/ips/` (fetched 2026-08-17). The finding is documented for future reference.
- **Negative**: The Fly origin IP remains publicly reachable. Direct-to-origin traffic bypasses Cloudflare's WAF, bot detection, and challenge pages. Full origin protection requires a Cloudflare Tunnel (separate decision + ops work).
- **Neutral**: The three paths are documented with evidence and tradeoffs. The next step is a product/ops decision on whether to implement the Cloudflare Tunnel.

## Evidence chain

1. `fly.toml` uses `[http_service]` — traffic arrives via the Fly Proxy (Anycast edge → Fly Proxy → Machine internal port 3001).
2. Fly.io Network Policies docs: *"Network policies only apply to traffic directly to and from Machines. They do not affect traffic routed through the Fly Proxy."*
3. Fly.io staff (Dec 2025, community #26532): *"We do have plans to eventually support the ability for you to 'program' the proxy... but no ETA on that yet."*
4. Community threads #2782, #1137: IP whitelisting for `http_service` has been requested since 2021 with no resolution.
5. `cloudflare-ips.ts`: Pinned 15 v4 + 7 v6 ranges, verified against `cloudflare.com/ips/` (last updated Sep 28, 2023 — ranges unchanged).
6. `client-ip.ts`: Production-only peer verification gate — `CF-Connecting-IP` only trusted when socket peer is a Cloudflare IP.

## Follow-up

- **Cloudflare Tunnel**: If the team decides to implement origin protection, the steps are documented in the Fly ingress analysis (see `docs/audits/2026-08-17-security-review-partner-portal-and-public-ingress.md`). Key tradeoffs: +1 network hop latency, cloudflared sidecar RAM/CPU, failure mode changes, `fly.toml` restructuring.
- **Cloudflare IP refresh**: The pinned ranges in `cloudflare-ips.ts` should be refreshed when Cloudflare publishes changes (https://api.cloudflare.com/client/v4/ips). Add a quarterly calendar reminder or CI check.
- **Fly.io firewall feature**: Track Fly's roadmap for proxy-level source filtering. When available, replace the application-level peer verification with the native feature.
