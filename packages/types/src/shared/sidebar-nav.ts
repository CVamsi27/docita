import { z } from "zod";

export const sidebarNavOrderSchema = z
  .object({
    track: z.array(z.string()),
    services: z.array(z.string()),
  })
  .strict();

export type SidebarNavOrder = z.infer<typeof sidebarNavOrderSchema>;

