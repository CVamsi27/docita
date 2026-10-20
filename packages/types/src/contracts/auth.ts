import { z } from "zod";
import { userSchema } from "../shared/users";

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
    "Use uppercase, lowercase, a number, and a special character",
  );

const onboardingStepSchema = z.enum([
  "NOT_STARTED",
  "CHOOSE_PATH",
  "CREATING_CLINIC",
  "JOINING_CLINIC",
  "COMPLETED",
]);

export const authUserSchema = userSchema
  .pick({
    id: true,
    email: true,
    name: true,
    role: true,
    clinicId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    clinicId: z.string().nullable().optional(),
    emailVerified: z.boolean().optional(),
    onboardingStep: onboardingStepSchema.optional(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional(),
  });

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Enter password"),
  // Cloudflare Turnstile proof token (P5.17). Optional so local dev and
  // non-browser clients keep working when TURNSTILE_SECRET_KEY is unset;
  // the API rejects missing tokens only when enforcement is configured.
  turnstileToken: z.string().min(1).optional(),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "Enter your first name")
    .min(2, "Use at least 2 characters"),
  lastName: z
    .string()
    .min(1, "Enter your last name")
    .min(2, "Use at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: passwordSchema,
  clinicName: z
    .string()
    .min(2, "Use at least 2 characters")
    .optional()
    .or(z.literal("")),
  role: z.enum(["ADMIN", "ADMIN_DOCTOR"]).optional(),
  // See loginSchema.turnstileToken.
  turnstileToken: z.string().min(1).optional(),
});

export const checkEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().optional(),
});

export const logoutSchema = z.object({
  refresh_token: z.string().optional(),
});

export const NEW_PASSWORD_DIFFERENT_MESSAGE =
  "New password must be different from current password";

/**
 * Shared refinement for every change-password surface.
 *
 * The clinician settings form adds a `confirmPassword` field the API never
 * receives, so it cannot reuse {@link changePasswordSchema} wholesale — but both
 * must enforce this same rule. One predicate and one message keep them from
 * drifting apart.
 */
export const passwordsMustDiffer = (data: {
  currentPassword: string;
  newPassword: string;
}) => data.currentPassword !== data.newPassword;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
  })
  .refine(passwordsMustDiffer, {
    message: NEW_PASSWORD_DIFFERENT_MESSAGE,
    path: ["newPassword"],
  });

/**
 * The user object carried by every session-issuing response.
 *
 * Deliberately narrower than {@link authUserSchema}: it drops `createdAt` /
 * `updatedAt`, which the auth services never put in a session payload.
 */
export const sessionUserSchema = authUserSchema.pick({
  id: true,
  email: true,
  name: true,
  role: true,
  clinicId: true,
  emailVerified: true,
  onboardingStep: true,
});

/**
 * Body of every response that issues a session: `POST /auth/login` (token
 * branch), `POST /auth/mfa/verify`, `POST /auth/refresh`, and the patient /
 * partner portal OTP routes.
 *
 * There is no `refresh_token` here, and that is the point. The refresh token is
 * a 30-day credential delivered ONLY as an httpOnly cookie; every handler
 * strips it from the body (see `stripRefreshTokenFromBody`) because echoing it
 * in JSON would let any payload or log leak expose it. Declaring the field
 * here would let a handler that forgot to strip hand the raw bundle straight
 * through the serializer. Declaring its absence means a regression is trimmed
 * instead of published.
 */
export const tokenIssueResponseSchema = z.object({
  access_token: z.string().min(1),
  user: sessionUserSchema,
});

/**
 * Body of `POST /auth/login` when the account has MFA enabled. Login then
 * issues no session: the caller must complete `POST /auth/mfa/verify` with the
 * challenge token and a TOTP code.
 */
export const mfaChallengeResponseSchema = z.object({
  mfa_required: z.literal(true),
  mfa_challenge_token: z.string().min(1),
});

/**
 * Full wire body of `POST /auth/login` — a union, because a single status code
 * carries either a session or an MFA challenge and the two are mutually
 * exclusive. Declared as the union so the serializer trims whichever branch
 * fires instead of forwarding the service result untrimmed.
 */
export const loginWireResponseSchema = z.union([
  mfaChallengeResponseSchema,
  tokenIssueResponseSchema,
]);

/**
 * Canonical acknowledgement body: `{ success, message? }`.
 *
 * Used by every endpoint whose only job is to confirm something. Two response
 * DTOs declared this inline and byte-identically, which is how the onboarding
 * completion DTO ended up describing a shape its service never returned —
 * `SafeZodSerializerInterceptor` passed the mismatch through and logged a
 * warning on every successful registration.
 */
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type SuccessResponse = z.infer<typeof successResponseSchema>;

/**
 * `{ message }` acknowledgement for the auth routes whose only effect is to
 * confirm a state change: `POST /auth/logout` and `POST /auth/mfa/disable`.
 *
 * Not {@link successResponseSchema}: these handlers do not set `success`, and
 * a contract that claims a field the handler never sends makes
 * `SafeZodSerializerInterceptor` log a warning on every successful call.
 */
export const messageAckResponseSchema = z.object({
  message: z.string().min(1),
});

/**
 * `{ message, expiresInSeconds }` from every OTP "send me a code" route.
 *
 * Shared by `POST /patient-portal/auth/request-otp` and
 * `POST /partner/auth/request-otp` — both return byte-identical bodies, and
 * the SPA resend countdown reads `expiresInSeconds`, so the field has to
 * survive serialization. Note this is deliberately NOT
 * {@link messageAckResponseSchema}: `z.object` strips unknown keys, so the
 * narrower schema would silently drop the countdown.
 */
export const otpRequestAckResponseSchema = z.object({
  message: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
});
export type OtpRequestAckResponse = z.infer<typeof otpRequestAckResponseSchema>;

/** `POST /auth/mfa/verify` request. */
export const mfaVerifySchema = z.object({
  mfa_challenge_token: z.string().min(1, "MFA challenge token is required"),
  code: z.string().min(1, "Enter the code from your authenticator app"),
});

/** `POST /auth/mfa/enable` / `disable` / `backup-codes` request. */
export const mfaCodeSchema = z.object({
  code: z.string().min(1, "Enter the code from your authenticator app"),
});

/** `POST /auth/mfa/setup` — the provisioning secret is shown exactly once. */
export const mfaSetupResponseSchema = z.object({
  qrCodeUrl: z.string().min(1),
  manualEntryKey: z.string().min(1),
});

export const mfaBackupCodesResponseSchema = z.object({
  backupCodes: z.array(z.string().min(1)).min(1),
});

export const registerResponseSchema = z.object({
  access_token: z.string().min(1),
  verificationEmailSent: z.boolean().optional(),
  user: sessionUserSchema,
});

export const validateSessionResponseSchema = z.object({
  valid: z.boolean(),
  user: sessionUserSchema,
});

export const checkEmailResponseSchema = z.object({
  exists: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CheckEmailInput = z.infer<typeof checkEmailSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type ValidateSessionResponse = z.infer<
  typeof validateSessionResponseSchema
>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type TokenIssueResponse = z.infer<typeof tokenIssueResponseSchema>;
export type MfaChallengeResponse = z.infer<typeof mfaChallengeResponseSchema>;
export type LoginWireResponse = z.infer<typeof loginWireResponseSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;
export type CheckEmailResponse = z.infer<typeof checkEmailResponseSchema>;
