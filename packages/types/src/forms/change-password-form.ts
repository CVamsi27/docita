import { z } from "zod";
import {
  NEW_PASSWORD_DIFFERENT_MESSAGE,
  passwordSchema,
  passwordsMustDiffer,
} from "../contracts/auth";

/** Clinician settings form: includes confirm-password field not sent to the API. */
// allow-no-base-schema: owner=app-platform reason=ui-confirm-password review=2026-09-30
export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Enter confirm password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(passwordsMustDiffer, {
    message: NEW_PASSWORD_DIFFERENT_MESSAGE,
    path: ["newPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
