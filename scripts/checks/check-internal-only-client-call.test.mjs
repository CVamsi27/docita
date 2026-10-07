import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  classifyControllerRoutes,
  collectDecorators,
  decoratorsAbove,
  decoratorsBelow,
  findInternalOnlyCalls,
  readRoleNames,
} from "./check-internal-only-client-call.mjs";

/** Shorthand for a route entry in the find-phase fixtures. */
const route = (path, internalOnly) => ({ path, internalOnly });

test("readRoleNames: reads a single qualified role", () => {
  assert.deepEqual(readRoleNames("Role.INTERNAL"), ["INTERNAL"]);
});

test("readRoleNames: reads a multi-role list", () => {
  assert.deepEqual(readRoleNames("\n  Role.ADMIN,\n  Role.DOCTOR,\n"), [
    "ADMIN",
    "DOCTOR",
  ]);
});

test("classifyControllerRoutes: a controller-level INTERNAL list marks every route internal", () => {
  // `@Controller('clinics') @Roles(Role.INTERNAL)` is the real shape in
  // ClinicsController, and it is the case this check was written for.
  const routes = classifyControllerRoutes(`
    @Controller('clinics')
    @Roles(Role.INTERNAL)
    export class ClinicsController {
      @Get()
      findAll() { return []; }

      @Get(':id')
      findOne(@Param('id') id: string) { return id; }
    }
  `);
  assert.deepEqual(
    routes.map((r) => [r.verb, r.path, r.internalOnly]),
    [
      ["GET", "clinics", true],
      ["GET", "clinics/:id", true],
    ],
  );
});

test("classifyControllerRoutes: a handler-level list overrides the class-level one", () => {
  // getAllAndOverride in RolesGuard means the handler list wins, so these two
  // routes are reachable by admins even though the controller is INTERNAL-only.
  const routes = classifyControllerRoutes(`
    @Controller('clinics')
    @Roles(Role.INTERNAL)
    export class ClinicsController {
      @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
      @Post(':clinicId/doctors')
      createDoctor() {}

      @Get()
      findAll() {}
    }
  `);
  assert.deepEqual(
    routes.map((r) => [r.path, r.internalOnly]),
    [
      ["clinics/:clinicId/doctors", false],
      ["clinics", true],
    ],
  );
});

test("classifyControllerRoutes: @Public bypasses the role list entirely", () => {
  const routes = classifyControllerRoutes(`
    @Controller('doctors')
    @Roles(Role.INTERNAL)
    export class DoctorsController {
      @Public()
      @Get('public-directory')
      directory() {}
    }
  `);
  assert.deepEqual(routes.map((r) => r.internalOnly), [false]);
});

test("classifyControllerRoutes: a multi-line class-level list is read", () => {
  const routes = classifyControllerRoutes(`
    @Controller('internal/billing')
    @Roles(
      Role.INTERNAL,
    )
    export class InternalBillingController {
      @Get('summary')
      summary() {}
    }
  `);
  assert.deepEqual(routes.map((r) => [r.path, r.internalOnly]), [
    ["internal/billing/summary", true],
  ]);
});

test("classifyControllerRoutes: two controllers in one file do not cross-contaminate", () => {
  // The repo has several of these (clinics.controller.ts, clinic-settings.ts).
  // Reading a class-level list from the wrong controller silently reclassifies
  // an entire route table.
  const routes = classifyControllerRoutes(`
    @Controller('clinics')
    @Roles(Role.INTERNAL)
    export class ClinicsController {
      @Get()
      findAll() {}
    }

    @Controller('clinics')
    @Roles(Role.ADMIN, Role.DOCTOR)
    export class ClinicSettingsController {
      @Get('settings')
      settings() {}
    }
  `);
  assert.deepEqual(
    routes.map((r) => [r.path, r.internalOnly]),
    [
      ["clinics", true],
      ["clinics/settings", false],
    ],
  );
});

test("classifyControllerRoutes: a const-referenced prefix resolves", () => {
  const routes = classifyControllerRoutes(`
    const PREFIX = 'internal/clinics';
    @Controller(PREFIX)
    @Roles(Role.INTERNAL)
    export class ClinicQuotasController {
      @Get(':clinicId/quota')
      quota() {}
    }
  `);
  assert.deepEqual(routes.map((r) => [r.path, r.internalOnly]), [
    ["internal/clinics/:clinicId/quota", true],
  ]);
});

test("classifyControllerRoutes: a decorator separated by code does not leak onto the handler", () => {
  // The guard is `nextSignificantIndex(end) === next.start`, so a blank line or
  // comment still counts as adjacent but intervening code does not.
  const routes = classifyControllerRoutes(`
    @Controller('clinics')
    @Roles(Role.INTERNAL)
    export class ClinicsController {
      @Roles(Role.ADMIN)
      @Get('a')
      a() {}

      // A comment between decorators keeps them adjacent.
      @Roles(Role.ADMIN)
      @Get('b')
      b() {}

      @Roles(Role.ADMIN)
      const unrelated = 1;

      @Get('c')
      c() {}
    }
  `);
  assert.deepEqual(
    routes.map((r) => [r.path, r.internalOnly]),
    [
      ["clinics/a", false],
      ["clinics/b", false],
      ["clinics/c", true],
    ],
  );
});

test("findInternalOnlyCalls: reports a call whose only routes are internal", () => {
  const routes = [route("clinics", true), route("clinics/:id", true)];
  const calls = [{ path: "clinics", line: 12, dynamic: false }];
  assert.deepEqual(findInternalOnlyCalls(calls, routes), [
    { path: "clinics", line: 12 },
  ]);
});

test("findInternalOnlyCalls: leaves a shadowed path alone", () => {
  // `clinics/settings` matches the INTERNAL `clinics/:id` as well. Reporting it
  // produced twelve false positives on the first run; shadowing is
  // check:route-shadowing's problem, not a permissions one.
  const routes = [
    route("clinics/:id", true),
    route("clinics/:id/stats", true),
    route("clinics/settings", false),
  ];
  const calls = [{ path: "clinics/settings", line: 5, dynamic: false }];
  assert.deepEqual(findInternalOnlyCalls(calls, routes), []);
});

test("findInternalOnlyCalls: the accessible set must exclude internal routes", () => {
  // Regression guard for the exact bug this rule shipped with: building the
  // "some accessible route matches" set from *all* routes made the second
  // guard mirror the first, so every call was skipped and the check reported
  // nothing while appearing to run.
  const routes = [route("clinics", true)];
  const calls = [{ path: "clinics", line: 1, dynamic: false }];
  assert.equal(findInternalOnlyCalls(calls, routes).length, 1);
});

test("findInternalOnlyCalls: ignores a call that matches no internal route", () => {
  const routes = [route("clinics", true), route("queue", false)];
  const calls = [{ path: "queue/today", line: 3, dynamic: false }];
  assert.deepEqual(findInternalOnlyCalls(calls, routes), []);
});

test("findInternalOnlyCalls: skips empty paths", () => {
  const routes = [route("clinics", true)];
  assert.deepEqual(findInternalOnlyCalls([{ path: "", line: 1, dynamic: false }], routes), []);
});

test("collectDecorators: spans a multi-line argument list", () => {
  const decorators = collectDecorators(`
    @Controller('clinics')
    @Roles(
      Role.ADMIN,
      Role.DOCTOR,
    )
    @Get('members')
    members() {}
  `);
  assert.deepEqual(decorators.map((d) => d.name), ["Controller", "Roles", "Get"]);
  assert.match(decorators[1].args, /Role\.ADMIN/);
});

test("decoratorsBelow / decoratorsAbove: read opposite directions", () => {
  // NestJS writes class metadata below `@Controller(...)` and handler metadata
  // above the verb decorator, so the two helpers must not be swapped.
  const source = `
    @SkipSubscriptionCheck()
    @Controller('clinics')
    @Roles(Role.INTERNAL)
    export class C {
      @Get('x')
      x() {}
    }
  `;
  const decorators = collectDecorators(source);
  const controllerIndex = decorators.findIndex((d) => d.name === "Controller");
  const getIndex = decorators.findIndex((d) => d.name === "Get");

  assert.deepEqual(
    decoratorsBelow(source, decorators, controllerIndex).map((d) => d.name),
    ["Controller", "Roles"],
  );
  assert.deepEqual(
    decoratorsAbove(source, decorators, getIndex).map((d) => d.name),
    [],
  );
});

// --- repo-tree invariants -------------------------------------------------
// A gate that silently selects nothing still reports "passed", so the baseline
// is asserted here rather than eyeballed in a run log.

const REPO_ROOT = process.cwd();

test("repo tree: the check classifies a non-trivial, INTERNAL-bearing route table", () => {
  const output = execFileSync(
    "node",
    [join("scripts/checks", "check-internal-only-client-call.mjs")],
    { encoding: "utf8", cwd: REPO_ROOT },
  );
  const routes = Number(output.match(/against (\d+) controller route/)[1]);
  const internal = Number(output.match(/\((\d+) INTERNAL-only\)/)[1]);
  const calls = Number(output.match(/matched (\d+) client API call/)[1]);

  assert.ok(routes > 600, `expected the full route table, got ${routes}`);
  assert.ok(internal > 50, `expected INTERNAL-only routes, got ${internal}`);
  assert.ok(calls > 300, `expected the client call sites, got ${calls}`);
  assert.ok(
    output.includes("passed"),
    "repo tree must be clean; this check was added to keep it that way",
  );
});

test("repo tree: AppsController's real source classifies as INTERNAL-only", () => {
  // Reads the actual file rather than a fixture, so a refactor that moves the
  // `@Roles(Role.INTERNAL)` annotation out of reach of the parser fails here.
  const source = readFileSync(
    join(REPO_ROOT, "apps/api/src/domains/clinics/presentation/controllers/clinics.controller.ts"),
    "utf8",
  );
  const routes = classifyControllerRoutes(source);
  const findAll = routes.find((r) => r.path === "clinics" && r.verb === "GET");
  assert.equal(findAll.internalOnly, true);

  const createDoctor = routes.find((r) => r.path === "clinics/:clinicId/doctors");
  assert.equal(createDoctor.internalOnly, false);
});