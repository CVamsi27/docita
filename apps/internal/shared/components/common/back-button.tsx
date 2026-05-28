"use client";

import {
  BackButton as UIBackButton,
  type BackButtonProps as UIBackButtonProps,
} from "@workspace/ui/components/navigation/back-button";
import { useBackNavigation } from "@/hooks/use-back-navigation";

interface BackButtonProps extends Omit<UIBackButtonProps, "onBack"> {
  fallback: string;
}

export function BackButton({ fallback, ...rest }: BackButtonProps) {
  const onBack = useBackNavigation(fallback);
  return <UIBackButton onBack={onBack} {...rest} />;
}
