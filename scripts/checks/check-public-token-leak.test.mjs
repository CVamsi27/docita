import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { blankJsComments } from "../lib/check-runner.mjs";
import {
  declaresField,
  findContractTokenLeaks,
  findRawTokenReturns,
  indexSchemaDefinitions,
  REFRESH_TOKEN_FIELDS,
  TOKEN_ISSUING_METHODS,
} from "./check-public-token-leak.mjs";

/** The lab-portal bug as it shipped: cookie set, raw result returned. */
const LAB_PORTAL_BUG = `
  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  @ZodSerializerDto(tokenIssueResponseSchema)
  async login(@Body() body: unknown, @Res() response: Response) {
    const dto = labPortalLoginSchema.parse(body);
    const result = await this.labPortalAuthCommandService.login(dto);
    setAuthCookies(response, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    }, this.configService);
    return result;
  }
`;

/** The same handler after the fix. */
const LAB_PORTAL_FIXED = LAB_PORTAL_BUG.replace(
  "return result;",
  "return stripRefreshTokenFromBody(result);",
);

/** A contract that deliberately omits the token, as the fix relies on. */
const CLEAN_CONTRACTS = `
  export const tokenIssueResponseSchema = z.object({
    access_token: z.string().min(1),
    user: sessionUserSchema,
  });

  export const mfaChallengeResponseSchema = z.object({
    mfa_required: z.literal(true),
    mfa_challenge_token: z.string().min(1),
  });

  export const otpRequestAckResponseSchema = z.object({
    message: z.string().min(1),
    expiresInSeconds: z.number().int().positive(),
  });

  export const partnerOtpVerifyResponseSchema = z.object({
    accessToken: z.string(),
    expiresIn: z.number().int().positive(),
    referrer: referrerSchema,
  });
`;

/** A contract that reintroduces the credential. */
const LEAKY_CONTRACTS = `
  export const leakyLoginResponseSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    user: sessionUserSchema,
  });
`;

const index = indexSchemaDefinitions([
  blankJsComments(CLEAN_CONTRACTS),
  blankJsComments(LEAKY_CONTRACTS),
]);

function rawReturns(source) {
  return findRawTokenReturns(blankJsComments(source));
}

function contractLeaks(source, schemaIndex = index) {
  return findContractTokenLeaks(blankJsComments(source), schemaIndex);
}

test("flags a public handler that returns a raw token-issuing result", () => {
  const findings = rawReturns(LAB_PORTAL_BUG);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verb, "Post");
  assert.equal(findings[0].path, "login");
  assert.equal(findings[0].variable, "result");
  assert.equal(findings[0].method, "login");
});

test("accepts the same handler once it strips the token", () => {
  assert.equal(rawReturns(LAB_PORTAL_FIXED).length, 0);
});

test("flags a contract that declares the refresh token", () => {
  const source = `
    @Public()
    @Post('login')
    @ZodSerializerDto(leakyLoginResponseSchema)
    async login() { return stripRefreshTokenFromBody(result); }
  `;
  const findings = contractLeaks(source);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].schema, "leakyLoginResponseSchema");
  assert.equal(findings[0].field, "refresh_token");
});

test("accepts every session contract that omits the token", () => {
  const source = `
    @Public()
    @Post('a')
    @ZodSerializerDto(tokenIssueResponseSchema)
    async a() { return x; }

    @Public()
    @Post('b')
    @ZodSerializerDto(mfaChallengeResponseSchema)
    async b() { return y; }

    @Public()
    @Post('c')
    @ZodSerializerDto(otpRequestAckResponseSchema)
    async c() { return z; }

    @Public()
    @Post('d')
    @ZodSerializerDto(partnerOtpVerifyResponseSchema)
    async d() { return w; }
  `;
  assert.equal(contractLeaks(source).length, 0);
});

test("does not flag a contract for a mention elsewhere in the file", () => {
  // The first version of R1 tested the whole controller source, so a file that
  // merely mentioned `refresh_token` elsewhere reported every route in it —
  // including `tokenIssueResponseSchema`, whose entire purpose is omitting the
  // key. Resolution has to be by name against the schema body.
  const source = `
    const REFRESH_TOKEN_MAX_AGE_MS = 1000;

    @Public()
    @Post('login')
    @ZodSerializerDto(tokenIssueResponseSchema)
    async login() {
      res.cookie('refresh_token', tokens.refresh_token);
      return stripRefreshTokenFromBody(tokens);
    }
  `;
  assert.equal(contractLeaks(source).length, 0);
});

test("ignores a private route that leaks", () => {
  const source = LAB_PORTAL_BUG.replace("@Public()", "");
  assert.equal(rawReturns(source).length, 0);
});

test("finds a contract declared above the verb as well as below", () => {
  const below = contractLeaks(`
    @Public()
    @Post('a')
    @ZodSerializerDto(leakyLoginResponseSchema)
    async a() { return stripRefreshTokenFromBody(x); }
  `);
  const above = contractLeaks(`
    @Public()
    @ZodSerializerDto(leakyLoginResponseSchema)
    @Post('b')
    async b() { return stripRefreshTokenFromBody(x); }
  `);
  assert.equal(below.length, 1);
  assert.equal(above.length, 1);
});

test("does not attribute one handler's bare return to its sibling", () => {
  const source = `
    @Public()
    @Post('login')
    async login() {
      const result = await this.authService.login(user);
      return result;
    }

    @Public()
    @Post('logout')
    async logout() { return { message: 'ok' }; }
  `;
  const findings = rawReturns(source);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].path, "login");
});

test("resolves braces correctly when a schema value contains an object", () => {
  const withNested = indexSchemaDefinitions([
    blankJsComments(`
      export const nestedUserSchema = z.object({
        user: z.object({ id: z.string() }),
        access_token: z.string(),
      });

      export const afterNestedSchema = z.object({
        refresh_token: z.string(),
      });
    `),
  ]);
  assert.equal(
    declaresField(withNested.get("nestedUserSchema"), "refresh_token"),
    false,
  );
  assert.equal(
    declaresField(withNested.get("afterNestedSchema"), "refresh_token"),
    true,
  );
});

test("tracks the token-issuing methods and not the OTP-request ones", () => {
  // An OTP-request method returns an acknowledgement, never a credential.
  // Listing `requestOtp` here would flag every portal's request-otp route.
  for (const method of ["login", "loginWithMfaCheck", "loginAfterMfa", "refreshTokens"]) {
    assert.ok(TOKEN_ISSUING_METHODS.has(method), `${method} should be tracked`);
  }
  for (const method of ["requestOtp", "verifyOtp"]) {
    assert.ok(!TOKEN_ISSUING_METHODS.has(method), `${method} should not be tracked`);
  }
});

test("covers both refresh-token field spellings", () => {
  assert.deepEqual(REFRESH_TOKEN_FIELDS, ["refresh_token", "refreshToken"]);
  assert.equal(
    declaresField('{ accessToken: z.string(), refreshToken: z.string() }', "refreshToken"),
    true,
  );
  assert.equal(declaresField('{ refresh_token: z.string() }', "refreshToken"), false);
});

test("the shipped API tree has no public route leaking a refresh token", () => {
  // The gate's own regression test: if this ever fails, a real route is
  // delivering the 30-day credential in a body.
  const output = execFileSync(
    process.execPath,
    ["scripts/checks/check-public-token-leak.mjs"],
    { encoding: "utf8" },
  );
  assert.match(output, /0 finding\(s\)/);
  assert.match(output, /check passed/);
});

test("the check is wired into verify:standard", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.ok(
    pkg.scripts["check:public-token-leak"],
    "check:public-token-leak script is missing",
  );
  assert.match(pkg.scripts["verify:standard"], /check:public-token-leak/);
});
