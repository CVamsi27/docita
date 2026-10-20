# Security Allowlist

Dependency exceptions must name an owner, compensating control, and expiration.
Expired exceptions block release. Keep OSV and pnpm audit exceptions aligned.

| Package      | Advisory            | Reason                                                                                       | Compensating control                                                                                                                           | Owner                  | Expires    |
| ------------ | ------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------- |
| braces 3.0.3 | GHSA-vfj7-8cjw-p6xm | No patched release available on 2026-10-12; transitive development glob/test/lint dependency | Only trusted repository patterns; absent from API and worker production dependency trees. Never pass user input to these tooling glob parsers. | Repository maintainers | 2026-11-12 |

Rechecked 16 October: the [upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
still lists no patched version. The fresh pnpm audit exits 0 after the configured
exception, with one HIGH advisory in metadata and zero actionable advisories.
The 12 November expiry is unchanged and falls inside the freeze; review/remediation
remains required, and this result must not be described as zero vulnerabilities.

OSV enforces the expiry through `ignoreUntil` in `osv-scanner.toml`. pnpm's
`auditConfig.ignoreGhsas` has no expiration support; remove its matching entry
by the date above and recheck upstream releases before every dependency update.
The full OSV scan fails after the exception expires; run it before release.

PR #320 remediation updates `astro>http-cache-semantics` to 4.3.0 and
`@tailwindcss/typography>postcss-selector-parser` to 7.1.6 or later. Older OSV
exceptions for already-remediated dependencies have been removed.
