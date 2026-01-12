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
}

export function WhatsAppButton({
  phoneNumber,
  message,
  className,
  variant = "outline",
  label = "WhatsApp",
  size = "default",
}: WhatsAppButtonProps) {
  const handleClick = () => {
    if (!phoneNumber) return;
    
    // Format phone number (remove non-digits)
    const formattedPhone = phoneNumber.replace(/\D/g, "");
    const encodedMessage = message ? encodeURIComponent(message) : "";
    const whatsappUrl = `https://wa.me/${formattedPhone}${encodedMessage ? `?text=${encodedMessage}` : ""}`;
    
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleClick}
      disabled={!phoneNumber}
    >
      <MessageCircle className="h-4 w-4" />
      {size !== "icon" && label}
    </Button>
  );
}
