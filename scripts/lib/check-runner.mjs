import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Guard for `git ls-files` output: keeps only paths the working tree still has.
 *
 * A deletion stays in the index until it is staged, so an agent that removes a
 * file and immediately runs a check would otherwise read a path that no longer
 * exists and crash with ENOENT instead of analysing the code that is actually
 * present. CI checkouts never hit this; local and multi-agent runs do.
 *
 * @param {string} file - relative path from `git ls-files`
 * @returns {boolean}
 */
export function trackedFileExists(file) {
  return existsSync(file);
}

/**
 * Blank out comment bodies so JSX scanners cannot parse prose as markup.
 *
 * Comments routinely mention the exact shape a check forbids — writing
 * `<div aria-label="x" />` to explain why it is wrong is the natural thing to do,
 * and a scanner that reads it will report a defect that does not exist.
 * Replaces comment content with spaces while preserving newlines, so offsets
 * and reported line numbers stay accurate against the original source.
 *
 * @param {string} source
 * @returns {string} same length, same line numbering, comments blanked
 */
export function blankJsComments(source) {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const pair = source.slice(index, index + 2);
    if (pair === "//") {
      while (index < source.length && source[index] !== "\n") {
        out += " ";
        index += 1;
      }
      continue;
    }
    if (pair === "/*") {
      while (index < source.length && source.slice(index, index + 2) !== "*/") {
        out += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      out += "  ";
      index += 2;
      continue;
    }
    out += source[index];
    index += 1;
  }
  return out;
}

/**
 * Discover source files tracked by git under root globs,
 * optionally filtered by extension, include, and exclude patterns.
 *
 * @param {string[]} globs - e.g. ["apps/api/src"]
 * @param {object} [opts]
 * @param {RegExp[]} [opts.exclude] - patterns to exclude (tested on relative path)
 * @param {string[]} [opts.extensions] - file extensions to include (e.g. [".ts", ".tsx"])
 * @param {RegExp[]} [opts.include] - patterns that must match the path
 * @returns {string[]} relative file paths
 */
export function gitLsSourceFiles(globs, { exclude = [], extensions, include } = {}) {
  let files = globs.flatMap((glob) =>
    execSync(`git ls-files '${glob}'`, { encoding: "utf8" })
      .split("\n")
      .filter(Boolean),
  );

  if (extensions && extensions.length > 0) {
    const extSet = new Set(
      extensions.map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)),
    );
    files = files.filter((f) => extSet.has(path.extname(f)));
  }

  if (include && include.length > 0) {
    files = files.filter((f) => include.some((p) => p.test(f)));
  }

  files = files.filter((f) => !exclude.some((p) => p.test(f)));
  files = files.filter((f) => existsSync(f));

  return files;
}

/**
 * Report findings and exit with the appropriate code.
 *
 * With `--enforce`: exits 1 on any finding.
 * Without `--enforce`: prints findings as a warning and exits 0.
 * `advisory`: never fails; always prints advisory and exits 0.
 *
 * @param {string} checkName
 * @param {string[]} findings
 * @param {object} [opts]
 * @param {boolean} [opts.advisory] - never fail, write advisory to stderr
 * @param {string} [opts.extraMessage] - explanation after findings
 */
export function reportFindingsAndExit(
  checkName,
  findings,
  { advisory = false, failAlways = false, extraMessage } = {},
) {
  if (findings.length === 0) {
    console.log(`${checkName} passed.`);
    return;
  }

  if (advisory) {
    process.stderr.write(
      `[${checkName}] ${findings.length} advisory finding(s):\n`,
    );
    for (const finding of findings) {
      process.stderr.write(`  - ${finding}\n`);
    }
    if (extraMessage) process.stderr.write(`${extraMessage}\n`);
    process.exit(0);
  }

  const enforce = failAlways || process.argv.includes("--enforce");
  if (enforce) {
    console.error(`${checkName} failed.\n`);
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    if (extraMessage) console.error(extraMessage);
    process.exit(1);
  }

  console.error(`${checkName} report:\n`);
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  console.log(
    `${checkName} reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}
