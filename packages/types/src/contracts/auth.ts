import { z } from "zod";
import { userSchema } from "../shared/users";

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
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional(),
  });

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  clinicName: z
    .string()
    .min(2, "Clinic name must be at least 2 characters")
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
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
      ),
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
  user: authUserSchema,
});

export const validateSessionResponseSchema = z.object({
  valid: z.boolean(),
  user: userSchema.pick({
    id: true,
    email: true,
    name: true,
    role: true,
    clinicId: true,
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
