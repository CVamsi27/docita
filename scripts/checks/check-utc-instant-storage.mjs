#!/usr/bin/env node

/**
 * Enforce the datetime-storage contract from AGENTS.md §3.3.1.
 *
 * Two halves, because either one alone lets clinic-local wall time leak into
 * persisted instants:
 *
 *  1. Every `DateTime` column must be `@db.Timestamptz(3)`. A bare `DateTime`
 *     is `timestamp without time zone`, which silently drops the offset and
 *     renders differently depending on which session reads it back.
 *     `@db.Date` is the deliberate exception: a calendar date has no instant
 *     and no offset to preserve, and timestamptz would only make it depend on
 *     the session zone (a clinic-local day boundary is exactly what a date
 *     column is for).
 *  2. Every `new Pool(...)` must be configured through `createUtcPoolConfig`,
 *     so the session `TimeZone` is UTC. `timestamptz` storage is only
 *     unambiguous if reads happen in a known zone; on a database whose server
 *     timezone is not UTC (an India-region RDS is Asia/Kolkata) an unconfigured
 *     session shifts every timestamp a script or backfill prints or compares
 *     by +05:30.
 */

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
  trackedFileExists,
} from "../lib/check-runner.mjs";

const SCHEMA_PATH = "packages/db/prisma/schema.prisma";
const REQUIRED_TYPE_ATTRIBUTE = "@db.Timestamptz(3)";
const POOL_FACTORY = "createUtcPoolConfig";

const findings = [];

/**
 * Read every `DateTime` field declaration in the Prisma schema together with
 * its full attribute block, so a field whose attributes wrap onto their own
 * lines is judged on all of them rather than just the first.
 */
function findDateTimeFields(source) {
  const lines = source.split(/\r?\n/);
  const fields = [];
  let block = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    const blockStart = line.match(/^(?:model|view)\s+(\w+)/);
    if (blockStart) {
      block = blockStart[1];
      continue;
    }
    if (/^\}/.test(line)) {
      block = null;
      continue;
    }
    if (!block) continue;

    const declaration = line.match(
      /^\s+([A-Za-z_]\w*)\s+DateTime(\?)?\s*(.*)$/,
    );
    if (!declaration) continue;

    let attributes = declaration[3] ?? "";
    let cursor = index + 1;
    while (cursor < lines.length) {
      const next = lines[cursor].trim();
      if (next.startsWith("//")) {
        cursor += 1;
        continue;
      }
      if (!next.startsWith("@")) break;
      attributes += ` ${next}`;
      cursor += 1;
    }

    fields.push({
      model: block,
      name: declaration[1],
      line: index + 1,
      attributes,
    });
    index = cursor - 1;
  }

  return fields;
}

/**
 * Return the text between the parentheses of a call starting at `openIndex`,
 * or null when the call is unterminated. Handles nesting so an argument
 * containing its own call does not truncate early.
 */
function extractCallArgument(source, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === "(") depth += 1;
    else if (character === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  return null;
}

// A missing schema is reported rather than thrown: a staged-but-deleted file
// must not crash the gate with a raw ENOENT.
if (!trackedFileExists(SCHEMA_PATH)) {
  findings.push(
    `${SCHEMA_PATH} is missing — the datetime-storage contract cannot be verified`,
  );
} else {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const dateTimeFields = findDateTimeFields(schema);

  if (dateTimeFields.length === 0) {
    findings.push(
      `${SCHEMA_PATH} declares no DateTime fields — the schema layout changed and this check no longer understands it`,
    );
  }

  for (const field of dateTimeFields) {
    const label = `${SCHEMA_PATH}:${field.line} ${field.model}.${field.name}`;
    // `@db.Date` stores a calendar day, not an instant, so the instant-storage
    // contract does not apply to it. The match is anchored so no other
    // `@db.Date...` spelling can inherit the exception.
    if (/@db\.Date(?![\w(])/.test(field.attributes)) {
      continue;
    }
    if (!field.attributes.includes("Timestamptz")) {
      findings.push(`${label} is DateTime without ${REQUIRED_TYPE_ATTRIBUTE}`);
    } else if (!field.attributes.includes(REQUIRED_TYPE_ATTRIBUTE)) {
      findings.push(
        `${label} uses a Timestamptz precision other than ${REQUIRED_TYPE_ATTRIBUTE}`,
      );
    }
  }
}

const poolConstructor = /new\s+(?:Prisma)?Pool\s*\(/g;
const files = gitLsSourceFiles(["apps", "packages", "scripts"], {
  extensions: [".ts", ".tsx", ".mjs", ".js"],
  exclude: [
    /\.(?:test|spec)\.(?:[cm]?js|[tj]sx?)$/,
    /(?:^|\/)dist\//,
    // The check's own constructor regex is a literal, not a call site.
    /^scripts\/checks\/check-utc-instant-storage\.mjs$/,
  ],
});

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const match of source.matchAll(poolConstructor)) {
    const openIndex = match.index + match[0].length - 1;
    const argument = extractCallArgument(source, openIndex);
    const line = source.slice(0, match.index).split(/\r?\n/).length;

    if (argument === null) {
      findings.push(
        `${file}:${line} could not parse the Pool constructor arguments`,
      );
      continue;
    }
    if (!argument.trim().startsWith(`${POOL_FACTORY}(`)) {
      findings.push(
        `${file}:${line} constructs a Pool without ${POOL_FACTORY}()`,
      );
    }
  }
}

reportFindingsAndExit("UTC instant storage check", findings, {
  failAlways: true,
  extraMessage: `Declare DateTime columns as ${REQUIRED_TYPE_ATTRIBUTE} and build pools with ${POOL_FACTORY}() from @workspace/db.`,
});
