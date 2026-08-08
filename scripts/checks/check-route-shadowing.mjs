#!/usr/bin/env node
/**
 * Route-shadowing regression check.
 *
 * Express matches routes by REGISTRATION ORDER, not specificity. When two
 * controllers share a prefix and one exposes a `:param` route (e.g.
 * `@Controller('clinics')` + `@Get(':id')`) while another exposes a literal
 * single-segment route (`@Controller('clinics/referral')` + `@Get()`), the
 * literal is SHADOWED — requests hit the `:id` handler with the literal as the
 * param value — unless the literal controller is registered first. This bit
 * `clinic-referral` in the 2026-08-08 plural rename: the rename to
 * `/clinics/referral` would have been swallowed by `ClinicsController`'s
 * `/clinics/:id` if the controllers-array order had not been fixed.
 *
 * This check statically detects the hazard for future renames:
 *   - per Nest module, controllers register in the module's `controllers`
 *     array order (and handlers within a controller in declaration order);
 *   - a literal route (no `:param` segments) is flagged when an EARLIER
 *     route — same method (or `@All`), same segment count, matching literal
 *     segments, at least one `:param` — would match it.
 *
 * Coverage (framework semantics matter — see matrix below):
 *   1. Same-module ordering — controllers array order within one module, and
 *      within-controller handler declaration order.
 *   2. Cross-module ordering — Nest registers controllers in the order the
 *      modules enter the container, which is a depth-first walk of the module
 *      import graph starting from the root module's `imports` in array order
 *      (first visit wins). A dependency pulled in early through a shared
 *      module (e.g. SharedModule -> AuthModule -> forwardRef(ClinicsModule))
 *      registers BEFORE a module listed later in the root module imports, so
 *      the root-module array order alone cannot be trusted — this check walks
 *      the graph the same way Nest's scanner does.
 *   3. Hono proxy Workers (apps/<app>/api/index.ts) — Hono matches by
 *      SPECIFICITY (static > param > wildcard), NOT registration order, so
 *      the literal-after-:param hazard does not exist there. The only
 *      ordering-sensitive class is exact duplicates (same method + same path
 *      at identical specificity — one of the two is unreachable).
 *      Known limitation: the Hono pass only sees single-line
 *      `app.<method>("path", ...)` registrations (the proxies' style) —
 *      multi-line registrations and `app.route("/prefix", subApp)` mounts
 *      are not scanned.
 *
 * Framework semantics matrix:
 *   | Surface            | Framework | Matching          | Hazard class flagged |
 *   |--------------------|-----------|-------------------|----------------------|
 *   | apps/api/src       | Nest+Express | registration order | literal-after-:param |
 *   | apps/worker/src    | Nest (no HTTP adapter; createApplicationContext) | n/a (0 controllers today, scanned for future) | same as api if controllers appear |
 *   | apps/<app>/api/index.ts | Hono | specificity    | exact duplicates     |
 *   | apps/landing       | Astro     | file-based (static beats [dynamic] by design) | none — not scanned |
 *
 * The allowlist tracks pre-existing hazards found by the initial audit
 * (2026-08-08) — the audit found zero, so it MUST stay empty. Fix any
 * new hazard by reordering (literal controller registered before the
 * matching :param route), never by adding an allowlist entry; the check
 * fails if the allowlist ever becomes non-empty.
 *
 * Parser history: the first release resolved module arrays with paren-only
 * block gathering, which silently dropped every entry below a multi-line
 * `controllers: [` / `imports: [` — 16 modules plus app.module.ts use the
 * multi-line form, so the initial "audit found zero" was vacuous. The
 * 2026-08-08 bracket-aware fix surfaced three REAL hazards (all fixed by
 * reordering, none allowlisted): LabWorkflowController's `queue`/`labs`
 * under LabTestsController's `:id`, and JoinRequestsController's
 * `clinics/join-requests` list shadowed cross-module by ClinicsController's
 * `clinics/:id`.
 */

import fs from "node:fs";
import path from "node:path";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const SHADOW_ALLOWLIST = new Set([
  // keyed `${moduleFile}::${literalControllerFile}::${method}:${fullPath}`
]);

const controllerDecorator = /^\s*@Controller\s*\(/;
const routeDecorator = /^\s*@(Get|Post|Put|Patch|Delete|All)\s*\(([^)]*)\)/;

function parenBalance(text) {
  let balance = 0;
  for (const char of text) {
    if (char === "(") balance += 1;
    else if (char === ")") balance -= 1;
  }
  return balance;
}

function gatherBlock(lines, start) {
  let block = lines[start];
  let balance = parenBalance(lines[start]);
  let j = start + 1;
  while (balance > 0 && j < lines.length) {
    block += `\n${lines[j]}`;
    balance += parenBalance(lines[j]);
    j += 1;
  }
  return { block, end: j - 1 };
}

/**
 * Gather lines from `start` until square-bracket depth returns to zero.
 * Unlike gatherBlock (paren-tracking), this is for `key: [\n ... \n]` array
 * metadata: Nest modules commonly format `controllers:` / `imports:` across
 * multiple lines, and paren-tracking alone would stop at the opening line,
 * silently dropping every entry below it.
 */
function gatherBracketBlock(lines, start) {
  let block = lines[start];
  let balance = (lines[start].match(/\[/g) ?? []).length - (lines[start].match(/\]/g) ?? []).length;
  let j = start + 1;
  while (balance > 0 && j < lines.length) {
    block += `\n${lines[j]}`;
    balance +=
      (lines[j].match(/\[/g) ?? []).length - (lines[j].match(/\]/g) ?? []).length;
    j += 1;
  }
  return block;
}

/** Extract controller path strings (string / array / object forms). */
function controllerPaths(block) {
  const paths = [];
  for (const match of block.matchAll(/['"]([^'"]+)['"]/g)) {
    paths.push(match[1]);
  }
  return paths;
}

/** Parse a controller file into ordered routes across all its path prefixes. */
function parseController(source) {
  const lines = source.split(/\r?\n/);
  const routes = []; // { method, segs, line, pathLabel }
  let currentPaths = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (controllerDecorator.test(line)) {
      const { block } = gatherBlock(lines, i);
      currentPaths = controllerPaths(block).map((p) =>
        p.split("/").filter(Boolean),
      );
      continue;
    }
    const m = routeDecorator.exec(line);
    if (!m) continue;
    const method = m[1].toUpperCase();
    const handlerSegs = (m[2].trim().replace(/^['"]|['"]$/g, "") || "")
      .split("/")
      .filter(Boolean);
    const bases = currentPaths.length > 0 ? currentPaths : [[]];
    for (const base of bases) {
      routes.push({
        method,
        segs: [...base, ...handlerSegs],
        line: i + 1,
        pathLabel: [...base, ...handlerSegs].join("/") || "/",
      });
    }
  }
  return routes;
}

/**
 * Resolve the identifiers listed in a module metadata array (`controllers` or
 * `imports`) to tracked files, preserving array order. Unknown/external
 * identifiers (e.g. `ServeStaticModule`, `forwardRef`, `PrismaModule` from a
 * non-@/ spec) are skipped.
 */
function resolveModuleArrayRefs(file, source, arrayKey) {
  const lines = source.split(/\r?\n/);
  let arrayStart = -1;
  let bracketLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`${arrayKey}\\s*:\\s*\\[`).test(lines[i])) {
      arrayStart = i;
      break;
    }
  }
  if (arrayStart === -1) return null;
  for (let i = arrayStart; i < lines.length; i++) {
    if (lines[i].includes("[")) {
      bracketLine = i;
      break;
    }
  }
  if (bracketLine === -1) return null;
  const block = gatherBracketBlock(lines, bracketLine);
  const stripped = block.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const afterBracket = stripped.slice(stripped.indexOf("[") + 1);
  const namesInArray = [...afterBracket.matchAll(/[A-Za-z_$][\w$]*/g)].map(
    (m) => m[0],
  );

  // Resolve names to files via imports.
  const importMap = new Map();
  for (const m of source.matchAll(
    /import\s+(?:\{([^}]*)\}|\w+)\s+from\s+['"]([^'"]+)['"]/g,
  )) {
    const spec = m[2];
    const named = m[1] ? m[1].split(",") : [];
    for (const part of named) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name) importMap.set(name, spec);
    }
  }

  const dir = path.dirname(file);
  const resolved = [];
  for (const name of namesInArray) {
    if (name === arrayKey) continue;
    const spec = importMap.get(name);
    if (!spec) continue; // declared locally or unresolved — skip
    // `@/...` is the api tsconfig path alias for apps/api/src — it is
    // repo-root-relative, not relative to the module file. Relative specs
    // (./ ../) resolve against the module's directory.
    const aliasSpec = spec.startsWith("@/");
    const specPath = aliasSpec ? `apps/api/src/${spec.slice(2)}` : spec;
    const candidates = [specPath, `${specPath}.ts`, `${specPath}.controller.ts`];
    const base = aliasSpec ? process.cwd() : dir;
    let target = null;
    for (const cand of candidates) {
      const abs = path.resolve(base, cand);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        target = path.relative(process.cwd(), abs).replaceAll(path.sep, "/");
        break;
      }
    }
    if (target) resolved.push({ name, file: target });
  }
  return resolved;
}

/** Resolve a module's ordered controller files from its `controllers` array. */
function parseModuleControllers(file, source) {
  return resolveModuleArrayRefs(file, source, "controllers");
}

/** Resolve a module's ordered imported module files from its `imports` array. */
function parseModuleImports(file, source) {
  return resolveModuleArrayRefs(file, source, "imports");
}

/**
 * Compute the Nest container registration order for modules reachable from
 * app.module.ts: depth-first pre-order over the import graph, starting from
 * app.module's `imports` in array order, first visit wins. This mirrors how
 * Nest's DependenciesScanner inserts modules (a dependency pulled in early
 * through a shared module registers before a later top-level import).
 * Returns an ordered array of module file paths, or [] if app.module.ts is
 * absent (e.g. isolated fixtures).
 */
function computeModuleRegistrationOrder(moduleFiles, readSourceFn, rootModulePath) {
  if (!moduleFiles.includes(rootModulePath)) return [];
  const appSource = readSourceFn(rootModulePath);
  if (!appSource) return [];

  const moduleSet = new Set(moduleFiles);
  const order = [];
  const visited = new Set();

  const visit = (file) => {
    if (visited.has(file)) return;
    visited.add(file);
    order.push(file);
    const source = readSourceFn(file);
    if (!source) return;
    const imports = parseModuleImports(file, source);
    if (!imports) return;
    for (const imp of imports) {
      if (moduleSet.has(imp.file)) visit(imp.file);
    }
  };

  visit(rootModulePath);
  return order;
}

/**
 * Nest app roots scanned for route-registration hazards. Express (the default
 * Nest HTTP adapter) matches routes by registration order, so every Nest app
 * that serves HTTP is subject to the literal-after-:param shadowing hazard.
 *
 * - apps/api/src: the API (HTTP adapter, app.module.ts).
 * - apps/worker/src: belt-and-suspenders coverage. The worker boots via
 *   NestFactory.createApplicationContext (no HTTP adapter), registers zero
 *   controllers, and its real code lives in apps/api/src through the @/
 *   alias — so worker controllers would already be covered. This root guards
 *   against a future apps/worker/src-local controller being added and
 *   skipped.
 */
const NEST_APP_ROOTS = ["apps/api/src", "apps/worker/src"];

// Controllers are discovered via each module's `controllers` array (see
// parseModuleControllers); a standalone controller-file listing is not needed.
const moduleFiles = gitLsSourceFiles(NEST_APP_ROOTS, {
  include: [/\.module\.ts$/],
  exclude: [/\.(spec|e2e-spec)\.ts$/],
});

/**
 * Hono proxy Workers (Cloudflare) — apps/<app>/api/index.ts. Hono's production
 * router (SmartRouter -> RegExpRouter) matches by SPECIFICITY, not
 * registration order: static segments beat :params beat wildcards regardless
 * of declaration order. So the Express literal-after-:param hazard does not
 * apply and must NOT be flagged here. The one ordering-sensitive class in
 * Hono is EXACT duplicates — two registrations with the same method + same
 * path have identical specificity and the later one is unreachable.
 */
const HONO_PROXY_GLOBS = ["apps/*/api/index.ts"];  const sourceCache = new Map();
function readSource(file) {
  if (!sourceCache.has(file)) {
    sourceCache.set(
      file,
      fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null,
    );
  }
  return sourceCache.get(file);
}

// parseController runs in both passes; cache per file so the O(M²) cross-module
// pass does not re-lex every controller.
const controllerRouteCache = new Map();
function parseControllerCached(file) {
  if (!controllerRouteCache.has(file)) {
    const source = readSource(file);
    controllerRouteCache.set(file, source ? parseController(source) : []);
  }
  return controllerRouteCache.get(file);
}

function methodsCompatible(a, b) {
  return a === b || a === "ALL" || b === "ALL";
}

function routeMatches(paramRoute, literalRoute) {
  if (paramRoute.segs.length !== literalRoute.segs.length) return false;
  let hasParam = false;
  for (let i = 0; i < paramRoute.segs.length; i++) {
    const p = paramRoute.segs[i];
    const l = literalRoute.segs[i];
    if (p.startsWith(":")) {
      hasParam = true;
    } else if (p !== l) {
      return false;
    }
  }
  return hasParam;
}

const findings = [];

// ── Pass 1: same-module controller ordering ────────────────────────────────

for (const moduleFile of moduleFiles) {
  const source = readSource(moduleFile);
  if (!source) continue;
  const ordered = parseModuleControllers(moduleFile, source);
  if (!ordered || ordered.length === 0) continue;

  // Pre-resolve routes per controller.
  const withRoutes = ordered
    .map((entry) => ({ ...entry, routes: parseControllerCached(entry.file) }))
    .filter((entry) => entry.routes.length > 0);

  for (let i = 0; i < withRoutes.length; i++) {
    for (let j = i + 1; j < withRoutes.length; j++) {
      const earlier = withRoutes[i];
      const later = withRoutes[j];
      for (const lit of later.routes) {
        if (lit.segs.some((s) => s.startsWith(":"))) continue; // only literals
        for (const param of earlier.routes) {
          if (
            methodsCompatible(param.method, lit.method) &&
            routeMatches(param, lit)
          ) {
            const fullPath = lit.segs.join("/") || "/";
            const key = `${moduleFile}::${later.file}::${lit.method}:${fullPath}`;
            if (!SHADOW_ALLOWLIST.has(key)) {
              findings.push(
                `[route-shadowing] ${moduleFile}: ${later.file}:${lit.line} ${lit.method} ${fullPath} is registered after ${earlier.file}:${param.line} ${param.method} ${param.segs.join("/")} which shadows it — reorder so the literal controller registers first`,
              );
            }
          }
        }
      }
    }
    // Within-controller handler order: literal handler declared after a
    // matching param handler in the SAME controller is equally shadowed.
    const self = withRoutes[i];
    for (let a = 0; a < self.routes.length; a++) {
      const param = self.routes[a];
      if (!param.segs.some((s) => s.startsWith(":"))) continue;
      for (let b = a + 1; b < self.routes.length; b++) {
        const lit = self.routes[b];
        if (lit.segs.some((s) => s.startsWith(":"))) continue;
        if (
          methodsCompatible(param.method, lit.method) &&
          routeMatches(param, lit)
        ) {
          const fullPath = lit.segs.join("/") || "/";
          const key = `${moduleFile}::${self.file}::${lit.method}:${fullPath}`;
          if (!SHADOW_ALLOWLIST.has(key)) {
            findings.push(
              `[route-shadowing] ${moduleFile}: ${self.file}:${lit.line} ${lit.method} ${fullPath} is declared after ${self.file}:${param.line} ${param.method} ${param.segs.join("/")} which shadows it — declare the literal handler first`,
            );
          }
        }
      }
    }
  }
}

// ── Pass 2: cross-module ordering ──────────────────────────────────────────
// Nest registers controllers in container insertion order, which is a DFS of
// the module import graph from the root module. Two controllers in DIFFERENT
// modules that share a prefix shadow each other the same way two controllers
// in one module do — a literal in a LATER-registered module is swallowed by a
// matching :param in an EARLIER-registered module. app.module array order is
// NOT the trust anchor: SharedModule -> AuthModule -> forwardRef(ClinicsModule)
// pulls ClinicsModule into the container before ClinicsSettingsModule, so the
// graph walk below reproduces the real registration order.

const moduleOrder = computeModuleRegistrationOrder(
  moduleFiles,
  readSource,
  "apps/api/src/app.module.ts",
);
const byModule = new Map();
for (const moduleFile of moduleFiles) {
  const source = readSource(moduleFile);
  if (!source) continue;
  const ordered = parseModuleControllers(moduleFile, source);
  if (!ordered || ordered.length === 0) continue;
  const withRoutes = ordered
    .map((entry) => ({ ...entry, routes: parseControllerCached(entry.file) }))
    .filter((entry) => entry.routes.length > 0);
  byModule.set(moduleFile, withRoutes);
}

if (moduleOrder.length > 0) {
  for (let i = 0; i < moduleOrder.length; i++) {
    const earlierModule = moduleOrder[i];
    const earlierEntries = byModule.get(earlierModule) ?? [];
    for (let j = i + 1; j < moduleOrder.length; j++) {
      const laterModule = moduleOrder[j];
      const laterEntries = byModule.get(laterModule) ?? [];
      for (const earlier of earlierEntries) {
        for (const later of laterEntries) {
          if (later.file === earlier.file) continue; // same controller file
          for (const lit of later.routes) {
            if (lit.segs.some((s) => s.startsWith(":"))) continue; // only literals
            for (const param of earlier.routes) {
              if (
                methodsCompatible(param.method, lit.method) &&
                routeMatches(param, lit)
              ) {
                const fullPath = lit.segs.join("/") || "/";
                const key = `${laterModule}::${later.file}::${lit.method}:${fullPath}`;
                if (!SHADOW_ALLOWLIST.has(key)) {
                  findings.push(
                    `[route-shadowing] ${laterModule}: ${later.file}:${lit.line} ${lit.method} ${fullPath} is registered after ${earlierModule}:${earlier.file}:${param.line} ${param.method} ${param.segs.join("/")} which shadows it across modules — register the literal controller in the same module BEFORE the :param controller (cross-module import order cannot fix this: the AuthModule forwardRef cycle pulls ClinicsModule into the container before ClinicsSettingsModule is scanned)`,
                  );
                }
              }
            }
          }
        }
      }
    }
  }
}

// ── Pass 3: Hono proxy Workers (specificity-based; exact duplicates only) ──
// Hono's RegExpRouter sorts by specificity (static > param > wildcard), so a
// literal registered AFTER a :param or wildcard route is still matched first
// — the Express-style hazard does NOT apply. What DOES apply: two
// registrations with the same method and identical path have identical
// specificity, so the later one is unreachable (Hono keeps the first match at
// equal specificity). Flag that class only.

const honoFiles = gitLsSourceFiles(HONO_PROXY_GLOBS);
const honoRouteDecorator =
  /^\s*app\.(all|get|post|put|patch|delete|options|head)\(\s*['"]([^'"]+)['"]/;

for (const honoFile of honoFiles) {
  const source = readSource(honoFile);
  if (!source) continue;
  const lines = source.split(/\r?\n/);
  const seenRoutes = new Map(); // `${method}:${path}` -> first line
  for (let i = 0; i < lines.length; i++) {
    const m = honoRouteDecorator.exec(lines[i]);
    if (!m) continue;
    const method = m[1].toUpperCase();
    const path = m[2];
    const key = `${method}:${path}`;
    if (seenRoutes.has(key)) {
      findings.push(
        `[route-shadowing] ${honoFile}:${i + 1} ${method} ${path} duplicates the registration at line ${seenRoutes.get(key)} — identical specificity in Hono means one of the two registrations is unreachable (remove or distinguish the duplicate)`,
      );
    } else {
      seenRoutes.set(key, i + 1);
    }
  }
}

// Ratchet: the initial audit found zero pre-existing hazards, so the
// allowlist must never grow — a non-empty allowlist is itself a failure.
if (SHADOW_ALLOWLIST.size > 0) {
  findings.push(
    `[allowlist-ratchet] route-shadowing allowlist has ${SHADOW_ALLOWLIST.size} entry/entries but must stay empty — fix the hazard by reordering instead of allowlisting`,
  );
}

reportFindingsAndExit("Route shadowing check", findings, {
  failAlways: true,
  extraMessage:
    "Express matches by registration order: a literal route must be registered before any same-method :param route that would match it (reorder the module's controllers array or the handler declarations). The allowlist must stay empty — reorder, never allowlist.",
});
