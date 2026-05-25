"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/form/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  allowGenericLink?: boolean;
}

export const WhatsAppButton = React.forwardRef<
  HTMLButtonElement,
  WhatsAppButtonProps
>(function WhatsAppButton(
  {
    phoneNumber,
    message,
    className,
    variant = "outline",
    label = "WhatsApp",
    size = "default",
    allowGenericLink = false,
  },
  ref,
) {
  const handleClick = () => {
    const encodedMessage = message ? encodeURIComponent(message) : "";
    const formattedPhone = phoneNumber?.replace(/\D/g, "");

    if (!formattedPhone) {
      if (!allowGenericLink) return;
      const genericUrl = `https://wa.me/${encodedMessage ? `?text=${encodedMessage}` : ""}`;
      window.open(genericUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}${encodedMessage ? `?text=${encodedMessage}` : ""}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const isIconOnly = size === "icon" || label === "";
  const accessibleLabel = label || "Send via WhatsApp";

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleClick}
      disabled={!phoneNumber && !allowGenericLink}
      aria-label={isIconOnly ? accessibleLabel : undefined}
    >
      <MessageCircle className="h-4 w-4" />
      {size !== "icon" && label}
    </Button>
  );
});
