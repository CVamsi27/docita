"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { CheckCircle2, Copy } from "lucide-react";

interface CopyableLinkFieldProps {
  value: string;
  helperText?: string;
  actionLabel?: string;
  onCopy?: (value: string) => Promise<void> | void;
}

export function CopyableLinkField({
  value,
  helperText,
  actionLabel,
  onCopy,
}: CopyableLinkFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (onCopy) {
        await onCopy(value);
      } else {
        await navigator.clipboard.writeText(value);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex min-w-0 items-center gap-2 rounded-md border bg-background p-2">
        <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
        {!actionLabel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
            aria-label="Copy upload link"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>

      {helperText ? (
        <p className="text-center text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}

      {actionLabel ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
