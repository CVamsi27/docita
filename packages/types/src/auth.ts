import { z } from "zod";
import { userSchema } from "./users";

export const loginResponseSchema = z.object({
    access_token: z.string(),
    user: userSchema,
});

export const registerResponseSchema = z.object({
    access_token: z.string(),
    user: userSchema,
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
