// jscpd:ignore-start
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { PromptOptions } from "@/features/dialogs/types";
import { getConfirmButtonVariant, getVariantStyles } from "@/features/dialogs/utils";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {options.icon}
            {options.title}
          </DialogTitle>
          <DialogDescription>{options.description || ""}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
{/* jscpd:ignore-end */}
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
            <p
              id="prompt-input-error"
              className="text-sm text-destructive mt-1"
            >
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {options.cancelText || "Cancel"}
          </Button>
          <Button
            variant={getConfirmButtonVariant(options.variant)}
            onClick={onSubmit}
            className={cn(getVariantStyles(options.variant))}
          >
            {options.confirmText || "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}