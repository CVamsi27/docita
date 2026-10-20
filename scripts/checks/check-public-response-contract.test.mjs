import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { blankJsComments } from "../lib/check-runner.mjs";
import { collectDecorators } from "./check-internal-only-client-call.mjs";
import {
  contiguousDecoratorBlock,
  findUncoveredPublicHandlers,
} from "./check-public-response-contract.mjs";

/** Decorator order used by the onboarding signature controller. */
const PUBLIC_ABOVE_VERB = `
  @Public()
  @Post(':onboardingId/sla-signature-session')
  @ZodSerializerDto(UploadSessionCreateResponseDto)
  async createSession() {}
`;

/** A contract declared above the verb rather than below it. */
const VERB_ABOVE_PUBLIC = `
  @ZodSerializerDto(StatusDto)
  @Get('validate-token/:token')
  @Public()
  async validateToken() {}
`;

/** The shipped bug: public, no serializer. */
const UNCOVERED = `
  @Post('sla-signature-session')
  @Public()
  async createSession() {}
`;

function uncovered(source) {
  return findUncoveredPublicHandlers(blankJsComments(source));
}

test("reports a public handler with no response contract", () => {
  const findings = uncovered(UNCOVERED);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verb, "Post");
  assert.equal(findings[0].path, "sla-signature-session");
});

test("accepts a contract declared below the verb", () => {
  // Regression guard. The first version of the scan walked only upward from the
  // verb decorator and reported every one of these as uncovered: NestJS puts
  // `@Public()` above and `@ZodSerializerDto()` below in half the codebase.
  assert.deepEqual(uncovered(PUBLIC_ABOVE_VERB), []);
});

test("accepts a contract declared above the verb", () => {
  assert.deepEqual(uncovered(VERB_ABOVE_PUBLIC), []);
});

test("accepts a contract declared across a comment", () => {
  assert.deepEqual(
    uncovered(`
  @Public()
  @Get('status')
  // reached from an onboarding email, so it must be trimmed
  @ZodSerializerDto(StatusDto)
  async status() {}
`),
    [],
  );
});

test("credits a class-level contract to every handler in the class", () => {
  assert.deepEqual(
    uncovered(`
  @Controller('things')
  @ZodSerializerDto(ThingDto)
  export class ThingsController {
    @Get('a')
    @Public()
    async a() {}

    @Get('b')
    async b() {}
  }
`),
    [],
  );
});

test("does not credit one handler's contract to a sibling", () => {
  // Regression guard. Treating "this file mentions a serializer" as coverage
  // marked every route in a controller as covered as soon as one route had a
  // contract, which would have reported zero findings in the whole repo.
  const findings = uncovered(`
  @Controller('things')
  export class ThingsController {
    @Get('covered')
    @ZodSerializerDto(ThingDto)
    async covered() {}

    @Get('open')
    @Public()
    async open() {}
  }
`);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].path, "open");
});

test("ignores handlers that are not public", () => {
  assert.deepEqual(
    uncovered(`
  @Get('a')
  @Roles(Role.ADMIN)
  async a() {}

  @Post('b')
  @Roles(Role.ADMIN)
  @ZodSerializerDto(B)
  async b() {}
`),
    [],
  );
});

test("ignores a @Public() on a non-HTTP member", () => {
  // A guard can carry @Public-adjacent metadata; only HTTP verbs are routes.
  assert.deepEqual(
    uncovered(`
  @Public()
  private helper() {}
`),
    [],
  );
});

test("handles every HTTP verb", () => {
  for (const verb of ["Get", "Post", "Put", "Patch", "Delete"]) {
    const findings = uncovered(`
  @${verb}('x')
  @Public()
  async handler() {}
`);
    assert.equal(findings.length, 1, `${verb} was not detected`);
    assert.equal(findings[0].verb, verb);
  }
});

test("contiguousDecoratorBlock returns the whole run in both directions", () => {
  const source = blankJsComments(`
  @Public()
  @Get('x')
  @ZodSerializerDto(X)
  async handler() {}

  @Get('y')
  async other() {}
`);
  const decorators = collectDecorators(source);
  assert.deepEqual(
    decorators.map((decorator) => decorator.name),
    ["Public", "Get", "ZodSerializerDto", "Get"],
  );

  const aroundVerb = contiguousDecoratorBlock(
    source,
    decorators,
    decorators.findIndex((decorator) => decorator.name === "Get"),
  );
  assert.deepEqual(
    aroundVerb.map((decorator) => decorator.name),
    ["Public", "Get", "ZodSerializerDto"],
  );

  // A second handler's decorators must not join the first one's run: crediting
  // one handler's contract to its sibling is what the class-level rule has to
  // avoid.
  const other = contiguousDecoratorBlock(
    source,
    decorators,
    decorators.length - 1,
  );
  assert.deepEqual(
    other.map((decorator) => decorator.name),
    ["Get"],
  );
});

test("repo tree: the public signature routes declare contracts", () => {
  // Reads the real controllers, so dropping a @ZodSerializerDto from either
  // public signature route fails here as well as in the signature specs.
  for (const file of [
    "apps/api/src/domains/doctors/presentation/controllers/signature-upload.controller.ts",
    "apps/api/src/domains/clinics/presentation/controllers/clinic-signature.controller.ts",
  ]) {
    const findings = findUncoveredPublicHandlers(
      blankJsComments(readFileSync(file, "utf8")),
    );
    assert.deepEqual(
      findings,
      [],
      `${file} has an uncovered public handler`,
    );
  }
});

test("the check enforces cleanly on the current tree", () => {
  execFileSync("node", ["scripts/checks/check-public-response-contract.mjs", "--enforce"], {
    stdio: "pipe",
  });
});