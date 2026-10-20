import assert from "node:assert/strict";
import test from "node:test";

import {
  countDtoCallSites,
  enclosingClassName,
  findInlineResponseDtos,
  isInlineShapeArgument,
  normalizeDtoArgument,
} from "./check-inline-response-dto.mjs";

/**
 * Regression guard for the defect that motivated this check.
 *
 * `OnboardingCompletionResponseDto` wrapped `z.object({ accessToken, clinicId,
 * userId, email, name, role })` — a shape the service never produced. Because the
 * schema was referenced nowhere else, no test compared it with the service, and
 * `SafeZodSerializerInterceptor` passed the mismatch through while logging a
 * warning on every successful clinic registration.
 */

test("findInlineResponseDtos: flags the pre-fix onboarding completion DTO", () => {
  const source = `
    export class OnboardingCompletionResponseDto extends createZodDto(
      z.object({
        accessToken: z.string(),
        clinicId: z.string(),
      }),
    ) {}
  `;
  const findings = findInlineResponseDtos(source);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].className, "OnboardingCompletionResponseDto");
});

test("findInlineResponseDtos: accepts a shared schema identifier", () => {
  const source = `
    export class LoginResponseDto extends createZodDto(loginResponseSchema) {}
  `;
  assert.deepEqual(findInlineResponseDtos(source), []);
});

test("findInlineResponseDtos: accepts the multi-line identifier form", () => {
  const source = `
    export class RegisterResponseDto extends createZodDto(
      registerResponseSchema,
    ) {}
  `;
  assert.deepEqual(findInlineResponseDtos(source), []);
});

test("findInlineResponseDtos: accepts .array() composition around a shared schema", () => {
  const source = `
    export class AuditLogListResponseDto extends createZodDto(
      auditLogSchema.array(),
    ) {}
  `;
  assert.deepEqual(findInlineResponseDtos(source), []);
});

test("findInlineResponseDtos: accepts z.array() around a shared element schema", () => {
  // 15 of the 18 `z.`-rooted arguments in the tree are exactly this, so a rule
  // that flagged them would have produced 15 false positives on day one.
  const source = `
    export class InternalLogListResponseDto extends createZodDto(
      z.array(auditLogSchema),
    ) {}
  `;
  assert.deepEqual(findInlineResponseDtos(source), []);
});

test("findInlineResponseDtos: accepts .pick()/.extend() off a shared schema", () => {
  const source = `
    export class A extends createZodDto(successResponseSchema.pick({ success: true })) {}
    export class B extends createZodDto(fooSchema.extend({ bar: z.string() })) {}
  `;
  assert.deepEqual(findInlineResponseDtos(source), []);
});

test("findInlineResponseDtos: flags z.union and z.discriminatedUnion", () => {
  const source = `
    export class U extends createZodDto(
      z.union([z.object({ a: z.string() }), z.object({ b: z.string() })]),
    ) {}
    export class D extends createZodDto(
      z.discriminatedUnion("kind", [z.object({ kind: z.literal("a") })]),
    ) {}
  `;
  assert.deepEqual(
    findInlineResponseDtos(source).map((f) => f.className),
    ["U", "D"],
  );
});

// Each constructor is tested on its own. A `z.union([z.object(...)])` fixture
// matches through the `object` branch, so a union-only test built that way
// would still pass with the `union` branch of the rule deleted.
test("isInlineShapeArgument: matches each inline constructor on its own", () => {
  assert.ok(isInlineShapeArgument("z.object({ a: z.string() })"));
  assert.ok(isInlineShapeArgument("z.union([z.string(), z.number()])"));
  assert.ok(isInlineShapeArgument('z.discriminatedUnion("kind", [x])'));
  assert.ok(isInlineShapeArgument("z.intersection(a, b)"));
});

test("isInlineShapeArgument: rejects every healthy composition form", () => {
  assert.ok(!isInlineShapeArgument("fooSchema"));
  assert.ok(!isInlineShapeArgument("fooSchema.array()"));
  assert.ok(!isInlineShapeArgument("z.array(fooSchema)"));
  assert.ok(!isInlineShapeArgument("fooSchema.partial()"));
  assert.ok(!isInlineShapeArgument("fooSchema.extend({ a: z.string() })"));
  assert.ok(!isInlineShapeArgument("fooSchema.pick({ a: true })"));
  assert.ok(!isInlineShapeArgument("z.optional(fooSchema)"));
  assert.ok(!isInlineShapeArgument("z.string()"));
});

test("findInlineResponseDtos: reports one finding per offending DTO", () => {
  const source = `
    export class A extends createZodDto(z.object({ a: z.string() })) {}
    export class B extends createZodDto(fooSchema) {}
    export class C extends createZodDto(z.object({ c: z.string() })) {}
  `;
  assert.deepEqual(
    findInlineResponseDtos(source).map((f) => f.className),
    ["A", "C"],
  );
});

test("findInlineResponseDtos: reports the decorator's line", () => {
  const source = `\n\nclass Foo {\n  @ApiOk()\n  bar() {}\n}\n\nexport class Bad extends createZodDto(z.object({ a: z.string() })) {}\n`;
  assert.equal(findInlineResponseDtos(source)[0].line, 8);
});

test("findInlineResponseDtos: an unterminated call is skipped, not crashed on", () => {
  assert.deepEqual(findInlineResponseDtos("class A extends createZodDto("), []);
});

test("findInlineResponseDtos: a file with no DTOs yields nothing", () => {
  assert.deepEqual(findInlineResponseDtos("export const x = 1;"), []);
});

test("countDtoCallSites: counts every call, inline or not", () => {
  const source = `
    export class A extends createZodDto(fooSchema) {}
    export class B extends createZodDto(z.object({ a: z.string() })) {}
  `;
  assert.equal(countDtoCallSites(source), 2);
  assert.equal(countDtoCallSites("nothing here"), 0);
});

test("normalizeDtoArgument: strips wrapping whitespace and a trailing comma", () => {
  assert.equal(normalizeDtoArgument("\n  fooSchema,\n"), "fooSchema");
  assert.equal(normalizeDtoArgument('  "x"  '), '"x"');
});

test("enclosingClassName: returns the nearest preceding class", () => {
  const source = `class A {}\nclass B {\n  createZodDto(`;
  assert.equal(enclosingClassName(source, source.indexOf("createZodDto(")), "B");
});

test("enclosingClassName: falls back when no class precedes the call", () => {
  assert.equal(enclosingClassName("createZodDto(", 0), "<unknown>");
});