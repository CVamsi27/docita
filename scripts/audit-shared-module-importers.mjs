#!/usr/bin/env node
/**
 * Zero-importer audit for apps/api/src/shared/modules/*.
 *
 * For every module directory it lists every tracked file OUTSIDE the module
 * itself that imports the module path (`shared/modules/<name>` followed by a
 * path separator or a closing quote), then classifies the importer:
 *
 *   - aggregator : apps/api/src/shared/shared.module.ts (module class wired here)
 *   - api        : any other file under apps/api/src
 *   - worker     : apps/worker/**
 *   - e2e        : apps/api/test/**
 *   - other-code : a *.ts/*.tsx file in another app/package
 *   - non-code   : docs, knip.json, scripts, AGENTS.md (reference only)
 *
 * A module is "zero-importer" when no code file outside it imports the path,
 * and "aggregator-only" when the only external code reference is
 * shared.module.ts. Both classes are the candidates for deletion review
 * (aggregator-only needs the shared.module.ts wiring removed too).
 *
 * Usage: node scripts/audit-shared-module-importers.mjs [--json]
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MODULES_DIR = join(ROOT, 'apps/api/src/shared/modules');
const jsonOut = process.argv.includes('--json');

function gitGrepFiles(pattern) {
  try {
    const out = execFileSync('git', ['grep', '-lE', pattern], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return []; // git grep exits 1 when nothing matches
  }
}

function classify(file) {
  if (file === 'apps/api/src/shared/shared.module.ts') return 'aggregator';
  if (file.startsWith('apps/worker/')) return 'worker';
  if (file.startsWith('apps/api/test/')) return 'e2e';
  if (file.startsWith('apps/api/src/')) return 'api';
  if (file.startsWith('scripts/') || file === 'knip.json' || file === 'AGENTS.md') {
    return 'tooling'; // analysis scripts and configs reference paths, not code
  }
  // A *.ts/*.tsx file in another app/package is a real importer.
  return /\.(c|m)?[jt]sx?$/.test(file) ? 'other-code' : 'non-code';
}

function isCodeClass(cls) {
  // aggregator (shared.module.ts) is itself a code reference — it counts for
  // ZERO-IMPORTER detection, but modules referenced only by it are flagged
  // separately as AGGREGATOR-ONLY.
  return ['api', 'worker', 'e2e', 'other-code', 'aggregator'].includes(cls);
}

const modules = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const results = modules.map((name) => {
  // Word-boundary-safe path anchor on the module segment: `modules/<name>`
  // followed by `/`, a quote, or end of string. Covers both absolute
  // (`@/shared/modules/<name>/...`) and relative (`./modules/<name>/...`,
  // `../../shared/modules/<name>`) imports. Avoids prefix collisions
  // (e.g. queue vs queue-*).
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = `modules/${esc}(/|['"\`]|$)`;
  const selfPrefix = `apps/api/src/shared/modules/${name}/`;
  const files = gitGrepFiles(pattern).filter(
    (f) => !f.startsWith(selfPrefix) && !f.endsWith(`/modules/${name}/index.ts`),
  );
  const byClass = {};
  for (const f of files) {
    const cls = classify(f);
    (byClass[cls] ??= []).push(f);
  }
  const codeFiles = files.filter((f) => isCodeClass(classify(f)));
  return { name, pattern, files, byClass, codeFiles };
});

const summary = results.map((r) => {
  const codeClasses = Object.keys(r.byClass).filter(isCodeClass);
  let status;
  if (r.codeFiles.length === 0) status = 'ZERO-IMPORTER';
  else if (
    codeClasses.length === 1 &&
    codeClasses[0] === 'aggregator' &&
    r.codeFiles.length === (r.byClass.aggregator ?? []).length
  ) {
    status = 'AGGREGATOR-ONLY';
  } else {
    status = 'imported';
  }
  const countByClass = Object.fromEntries(
    codeClasses.map((c) => [c, r.byClass[c].length]),
  );
  return {
    module: r.name,
    status,
    externalImporters: r.codeFiles.length,
    countByClass,
    importers: r.codeFiles,
    nonCodeRefs: r.files.filter((f) => !isCodeClass(classify(f))),
  };
});

summary.sort((a, b) => {
  const rank = (s) =>
    s.status === 'ZERO-IMPORTER' ? 0 : s.status === 'AGGREGATOR-ONLY' ? 1 : 2;
  return rank(a) - rank(b) || a.module.localeCompare(b.module);
});

if (jsonOut) {
  console.log(JSON.stringify({ summary, checked: summary.length }, null, 2));
} else {
  console.log(
    `Audited ${summary.length} modules under ${MODULES_DIR} (code importers only; docs/knip/scripts refs excluded)\n`,
  );
  console.log('MODULE'.padEnd(34), 'STATUS'.padEnd(16), 'IMP'.padEnd(4), 'where (class:count)');
  console.log('-'.repeat(110));
  for (const s of summary) {
    const where = Object.entries(s.countByClass)
      .map(([c, n]) => `${c}:${n}`)
      .join(' ');
    console.log(
      s.module.padEnd(34),
      s.status.padEnd(16),
      String(s.externalImporters).padEnd(4),
      where,
    );
  }

  const zero = summary.filter((s) => s.status === 'ZERO-IMPORTER');
  const agg = summary.filter((s) => s.status === 'AGGREGATOR-ONLY');
  console.log(
    `\nZERO-IMPORTER (${zero.length}): ${zero.map((s) => s.module).join(', ') || 'none'}`,
  );
  console.log(
    `AGGREGATOR-ONLY (${agg.length}): ${agg.map((s) => s.module).join(', ') || 'none'}`,
  );

  const candidates = [...zero, ...agg];
  if (candidates.length > 0) {
    console.log('\n--- Importer detail for candidates ---');
    for (const s of candidates) {
      console.log(`\n## ${s.module} (${s.status})`);
      if (s.importers.length === 0) {
        console.log('  no external code importers');
      } else {
        for (const f of s.importers) console.log(`  [${classify(f)}] ${f}`);
      }
    }
  }
}
