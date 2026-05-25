import { z } from "zod";
import { passwordSchema } from "../contracts/auth";

export const resetPasswordFormSchema = z
  .object({
    newPassword: z.string().min(1, "Enter new password").pipe(passwordSchema),
    confirmPassword: z.string().min(1, "Confirm password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export const forgotPasswordFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
