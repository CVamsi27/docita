import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAppointmentFormSchema,
  type CreateAppointmentInput,
} from "@workspace/types";
import type { Resolver } from "react-hook-form";

/** check-as-cast-density: allow-file — `superRefine` form schema vs RHF `Resolver<CreateAppointmentInput>` mismatch. */
export function createAppointmentFormResolver(
  wallTimezone: string,
): Resolver<CreateAppointmentInput> {
  return zodResolver(
    createAppointmentFormSchema(wallTimezone),
  ) as Resolver<CreateAppointmentInput>;
}
