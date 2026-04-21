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

const authUserSchema = userSchema
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

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const loginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  user: authUserSchema,
});

export const registerResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  verificationEmailSent: z.boolean().optional(),
  user: authUserSchema,
});

export const validateSessionResponseSchema = z.object({
  valid: z.boolean(),
  user: authUserSchema.pick({
    id: true,
    email: true,
    name: true,
    role: true,
    clinicId: true,
    emailVerified: true,
    onboardingStep: true,
  }),
});

export const checkEmailResponseSchema = z.object({
  exists: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CheckEmailInput = z.infer<typeof checkEmailSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type ValidateSessionResponse = z.infer<
  typeof validateSessionResponseSchema
>;
export type CheckEmailResponse = z.infer<typeof checkEmailResponseSchema>;
