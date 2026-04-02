"use client";

import { Button } from "@workspace/ui/components/button";
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

export function WhatsAppButton({
  phoneNumber,
  message,
  className,
  variant = "outline",
  label = "WhatsApp",
  size = "default",
  allowGenericLink = false,
}: WhatsAppButtonProps) {
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

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleClick}
      disabled={!phoneNumber && !allowGenericLink}
    >
      <MessageCircle className="h-4 w-4" />
      {size !== "icon" && label}
    </Button>
  );
}
