import { QRCodeSVG } from "qrcode.react";
import { cn } from "@workspace/ui/lib/utils";

interface QrCodeCardProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCodeCard({ value, size = 180, className }: QrCodeCardProps) {
  return (
    <div className={cn("ui-card-surface p-4 shadow-sm", className)}>
      <QRCodeSVG value={value} size={size} />
    </div>
  );
}
