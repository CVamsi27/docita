import { Button } from "@workspace/ui/components/button";
import { MessageCircle, Lock } from "lucide-react";
import { usePermissionStore, Feature } from "@/lib/stores/permission-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

interface WhatsAppButtonProps {
  phoneNumber: string;
  message?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function WhatsAppButton({
  phoneNumber,
  message = "",
  label = "WhatsApp",
  variant = "outline",
  size = "sm",
  className,
}: WhatsAppButtonProps) {
  const { canAccess } = usePermissionStore();
  const hasAccess = canAccess(Feature.ONE_WAY_WHATSAPP);

  const handleClick = () => {
    if (!hasAccess) return;

    // Clean phone number - remove non-digits
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    // Add country code if missing (assuming India +91 for now as per context)
    const formattedNumber =
      cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;

    window.open(url, "_blank");
  };

  if (!hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={`gap-2 text-muted-foreground cursor-not-allowed ${className}`}
              disabled
            >
              <Lock className="h-4 w-4" />
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upgrade to Core tier for WhatsApp sharing</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 ${className}`}
      onClick={handleClick}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </Button>
  );
}
