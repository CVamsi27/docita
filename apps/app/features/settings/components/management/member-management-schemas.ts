import * as z from "zod";

export const inviteSchema = z
  .object({
    name: z.string().min(1, "Enter the team member's name"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    role: z.enum([
      "DOCTOR",
      "NURSE",
      "RECEPTIONIST",
      "ADMIN",
      "ADMIN_DOCTOR",
    ]),
    phoneNumber: z.string().optional(),
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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
  });

export const memberSchema = z
  .object({
    name: z.string().min(1, "Enter the team member's name"),
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: z.string().optional(),
    role: z.enum(["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"]),
    specialization: z.string().optional(),
    qualification: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
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
  });

export type InviteFormValues = z.infer<typeof inviteSchema>;
export type MemberFormValues = z.infer<typeof memberSchema>;
export type MemberRole = MemberFormValues["role"];

export const DOCTOR_ROLES = new Set<MemberRole>(["DOCTOR", "ADMIN_DOCTOR"]);
export const ADMIN_SWITCH_ROLES = new Set<MemberRole>(["ADMIN", "ADMIN_DOCTOR"]);

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  RECEPTIONIST: "Receptionist",
  ADMIN: "Admin",
  ADMIN_DOCTOR: "Admin Doctor",
};

export const INVITE_SUCCESS_LABELS: Record<InviteFormValues["role"], string> = {
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  RECEPTIONIST: "Receptionist",
  ADMIN: "Admin",
  ADMIN_DOCTOR: "Admin Doctor",
};
