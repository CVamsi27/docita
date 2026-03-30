"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useSmartBack } from "@/hooks/use-smart-back";

interface SmartBackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
}

export function SmartBackButton({
  fallback = "/",
  label,
  className,
}: SmartBackButtonProps) {
  const goBack = useSmartBack(fallback);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={goBack}
      className={className}
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      {label ?? "Back"}
    </Button>
  );
}
