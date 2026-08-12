import { AlertCircle } from "lucide-react";

export function InlineFieldError({
  id: _id,
  message,
}: {
  id: string;
  message: string;
}) {
  return (
    <p id={_id} className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}
