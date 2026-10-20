# Synthetic monitor account

The current production probe verifies staff login and an access-token cookie.
It does not require a clinic membership. Use a new dedicated `RECEPTIONIST`
account with `clinicId = NULL`; do not give it access to a real clinic or reuse a
clinician/admin account. The dedicated noninteractive identity has no MFA; real
staff security settings remain unchanged.

## Generate the password hash locally

From the repository, run this command and enter the chosen strong password at
the hidden prompt. It prints only the bcrypt cost-10 hash used by Docita's auth
service. Keep the original password for the GitHub secret.

```sh
python3 - <<'PY'
import getpass
import subprocess

password = getpass.getpass('Dedicated monitor password: ')
subprocess.run(
    ['pnpm', '--filter', '@docita/api', 'exec', 'node', '-e',
     'const bcrypt = require("bcrypt"); let password = ""; '
     'process.stdin.setEncoding("utf8"); '
     'process.stdin.on("data", chunk => { password += chunk; }); '
     'process.stdin.on("end", async () => { '
     'process.stdout.write(await bcrypt.hash(password, 10) + "\n"); });'],
    input=password, text=True, check=True,
)
PY
```

Run [create-synthetic-monitor-user.sql](sql/create-synthetic-monitor-user.sql)
against the intended production database after replacing the email and hash
placeholders. The email must belong to the operator. The script inserts one new
user, returns only identity/role/membership metadata, and fails on an existing
email. It does not reset existing passwords or change existing account flags.
If an existing monitor needs recovery, use its normal account recovery path.

Set repository secrets interactively:

```sh
gh secret set SYNTHETIC_MONITOR_EMAIL --repo CVamsi27/docita
gh secret set SYNTHETIC_MONITOR_PASSWORD --repo CVamsi27/docita
```

Use the same email and the **original password**, not the hash, in these secrets.
Then run the existing production monitor and inspect its result:

```sh
gh workflow run synthetic-monitoring.yml --ref main --repo CVamsi27/docita
gh run list --workflow synthetic-monitoring.yml --limit 1 --repo CVamsi27/docita
```

On 13 October 2026 the SQL was exercised on the owned disposable PostgreSQL
database. The real API returned HTTP 201 and issued its access-token cookie.
This proves the current local provisioning/login path; the operator must still
insert the intended production identity and verify the GitHub run. Retain the
account owner and secret rotation dates in the release evidence.

## Current verification (14–15 October 2026)

The operator's dedicated production identity returns HTTP 201 and an access-token
cookie. Its working email/password were synchronized to GitHub through protected
stdin, and all three production probes pass when the existing script is run
locally. GitHub hosted runs are currently blocked before any step starts by an
account payment/spending restriction. Restore that access and rerun the workflow;
local success does not prove hosted execution, alert receipt or a clinical
patient-list journey. The account still has no clinic membership.
