import { Button } from "@workspace/ui/components/button"
import { MessageCircle } from "lucide-react"

interface WhatsAppButtonProps {
  phoneNumber: string
  message?: string
  label?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function WhatsAppButton({ 
  phoneNumber, 
  message = "", 
  label = "WhatsApp", 
  variant = "outline",
  size = "sm",
  className
}: WhatsAppButtonProps) {
  const handleClick = () => {
    // Clean phone number - remove non-digits
    const cleanNumber = phoneNumber.replace(/\D/g, "")
    // Add country code if missing (assuming India +91 for now as per context)
    const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber
    
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/${formattedNumber}?text=${encodedMessage}`
    
    window.open(url, "_blank")
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
  )
}
