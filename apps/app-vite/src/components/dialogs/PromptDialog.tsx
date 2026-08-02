import { Input } from "@workspace/ui/components";
import type { PromptOptions } from "./types";
import { DialogActionButtons } from "./dialog-action-buttons";
import { DialogShell } from "./dialog-shell";

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: PromptOptions | null;
  value: string;
  setValue: (value: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  onOpenChange,
  options,
  value,
  setValue,
  error,
  setError,
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  if (!options) return null;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={options.title}
      description={options.description}
      icon={options.icon}
      footer={
        <DialogActionButtons
          cancelText={options.cancelText}
          confirmText={options.confirmText || "Submit"}
          variant={options.variant}
          onCancel={onCancel}
          onConfirm={onSubmit}
        />
      }
    >
      <div className="py-4">
        <Input
          type={options.inputType || "text"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder={options.placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "prompt-input-error" : undefined}
        />
        {error && (
          <p id="prompt-input-error" className="text-sm text-destructive mt-1">
            {error}
          </p>
        )}
      </div>
    </DialogShell>
  );
}
