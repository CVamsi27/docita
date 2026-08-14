import prisma from "./prisma-script-client";

/**
 * Backfill `Referrer.code` for every row where the column is NULL.
 *
 * The migration `20260727120000_referral_partner_self_service` adds the
 * `code` column as nullable so the schema-lock rule (additive-only) is
 * preserved. Existing rows must get a code before the partner self-service
 * portal exposes them — the portal reads `code` to build share links.
 *
 * Codes follow the same format the live creation path uses:
 *   `RFR-XXXXXX` where XXXXXX is 6 chars from
 *   `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (I/O/0/1 excluded).
 *
 * Usage:
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-referrer-codes.ts          # dry-run
 *   pnpm --filter @workspace/db exec ts-node scripts/backfill-referrer-codes.ts --apply  # write
 */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferrerCode(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    suffix += CODE_ALPHABET[index];
  }
  return `RFR-${suffix}`;
}

async function generateUniqueCode(reserved: Set<string>): Promise<string> {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const code = generateReferrerCode();
    if (reserved.has(code)) continue;
    const existing = await prisma.referrer.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) {
      reserved.add(code);
      return code;
    }
  }
  throw new Error("Unable to generate a unique referrer code after 16 attempts");
}

async function run(): Promise<void> {
  const isApply = process.argv.includes("--apply");
  const referrers = await prisma.referrer.findMany({
    where: { code: null },
    select: { id: true, name: true, type: true },
    orderBy: { createdAt: "asc" },
  });

  if (referrers.length === 0) {
    process.stdout.write("No referrers with NULL code. Nothing to backfill.\n");
    return;
  }

  process.stdout.write(
    `Scanned referrers with NULL code=${referrers.length}\n`,
  );

  if (!isApply) {
    process.stdout.write(
      "Dry run only. Run again with --apply to write codes.\n",
    );
    return;
  }

  const reserved = new Set<string>();
  let written = 0;
  for (const referrer of referrers) {
    const code = await generateUniqueCode(reserved);
    await prisma.referrer.update({
      where: { id: referrer.id },
      data: { code },
    });
    written += 1;
  }

  process.stdout.write(
    `Backfill applied: referrers=${written}\n`,
  );
}

run()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown referrer-code backfill error";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
