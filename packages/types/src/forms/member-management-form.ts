import { z } from "zod";

const memberRoleSchema = z.enum([
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "ADMIN_DOCTOR",
]);

function requireDoctorRegistration(
  data: { role: z.infer<typeof memberRoleSchema>; registrationNumber?: string },
  ctx: z.RefinementCtx,
) {
  if (
    (data.role === "DOCTOR" || data.role === "ADMIN_DOCTOR") &&
    !data.registrationNumber?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["registrationNumber"],
      message: "Enter the medical registration number",
    });
  }
}

export const inviteTeamMemberFormSchema = z
  .object({
    name: z.string().min(1, "Enter the team member's name"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    role: memberRoleSchema,
    phoneNumber: z.string().optional(),
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine(requireDoctorRegistration);

export const memberManagementFormSchema = z
  .object({
    name: z.string().min(1, "Enter the team member's name"),
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: z.string().optional(),
    role: memberRoleSchema,
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine(requireDoctorRegistration);

export type InviteFormValues = z.infer<typeof inviteTeamMemberFormSchema>;
export type MemberFormValues = z.infer<typeof memberManagementFormSchema>;
export type MemberRole = MemberFormValues["role"];
