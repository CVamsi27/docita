import { useCallback, useState } from "react";
import type { PromptOptions } from "@/components/dialogs/types";
import type { PromptState } from "./use-confirm-sections";

/**
 * Owns the prompt-dialog state machine: open/options/resolve state, the
 * controlled input value/validation-error pair, and the promise-based
 * `prompt` API plus its submit/cancel resolution handlers.
 */
export function usePromptDialogState() {
  const [promptState, setPromptState] = useState<PromptState>({
    isOpen: false,
    options: null,
    resolve: null,
  });
  const [promptValue, setPromptValue] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);

  const prompt = useCallback(
    (options: PromptOptions): Promise<string | null> => {
      return new Promise((resolve) => {
        setPromptState({ isOpen: true, options, resolve });
        setPromptValue(options.defaultValue || "");
        setPromptError(null);
      });
    },
    [],
  );

  const handlePromptSubmit = useCallback(() => {
    setPromptState((prev) => {
      if (prev.options?.validation) {
        const error = prev.options.validation(promptValue);
        if (error) {
          setPromptError(error);
          return prev;
        }
      }
      prev.resolve?.(promptValue);
      setPromptValue("");
      setPromptError(null);
      return { isOpen: false, options: null, resolve: null };
    });
  }, [promptValue]);

  const handlePromptCancel = useCallback(() => {
    setPromptState((prev) => {
      prev.resolve?.(null);
      setPromptValue("");
      setPromptError(null);
      return { isOpen: false, options: null, resolve: null };
    });
  }, []);

  return {
    promptState,
    promptValue,
    setPromptValue,
    promptError,
    setPromptError,
    prompt,
    handlePromptSubmit,
    handlePromptCancel,
  };
}
