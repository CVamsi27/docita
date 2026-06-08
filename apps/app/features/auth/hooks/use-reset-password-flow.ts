"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "@workspace/types";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { api } from "@/lib/api/api-client";
import { logger } from "@/lib/monitoring/logger";

/**
 * Owns the reset-password page's full flow — token resolution, form state,
 * submit/error/success state, and the password-visibility toggle. Extracted
 * from `ResetPasswordInner` so the state machine lives independent of the
 * page's render wiring (which branches on token presence and submit state).
 */
export function useResetPasswordFlow() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError("This reset link is no longer valid. Please request a new one.");
      return;
    }

    setError("");
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      setSubmitted(true);
    } catch (err) {
      logger.error("Password reset failed", { error: err });
      setError(
        getUserFacingErrorMessage(err, {
          fallback:
            "We could not reset your password. Please request a new reset link.",
          context: "auth",
        }),
      );
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return {
    token,
    submitted,
    error,
    showPassword,
    form,
    onSubmit,
    togglePasswordVisibility,
  };
}
