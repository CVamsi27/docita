import { useCallback } from "react";
import { useNavigate } from "react-router";
import { readInAppNavCount } from "@/hooks/use-can-go-back";

export function useBackNavigation(fallback: string, navigateOverride?: ReturnType<typeof useNavigate>) {
  const navigateFromHook = useNavigate();
  const navigate = navigateOverride ?? navigateFromHook;
  return useCallback(() => {
    if (readInAppNavCount() > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }, [navigate, fallback]);
}
