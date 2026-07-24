"use client";

import { BackButton as UIBackButton, type BackButtonProps as UIBackButtonProps } from "@workspace/ui/components/navigation/back-button";
import { useBackNavigation } from "@/hooks/use-back-navigation";

export interface BackButtonProps extends Omit<UIBackButtonProps, "onBack"> {
  fallback: string;
  onNavigateBack?: () => void;
}

export function BackButton({
  fallback,
  onNavigateBack,
  ...rest
}: BackButtonProps) {
  const defaultBack = useBackNavigation(fallback);
  const onBack = onNavigateBack ?? defaultBack;
  return <UIBackButton onBack={onBack} {...rest} />;
}
