import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AskAiContext, type AskAiContextValue, type AskAiScope } from "./ask-ai-context";

export function AskAiProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scope, setScopeState] = useState<AskAiScope | null>(null);

  const openOverlay = useCallback((nextScope?: AskAiScope) => {
    if (nextScope) setScopeState(nextScope);
    setOpen(true);
  }, []);
  const closeOverlay = useCallback(() => setOpen(false), []);
  const setScope = useCallback(
    (next: AskAiScope | null) => setScopeState(next),
    [],
  );

  const value = useMemo<AskAiContextValue>(
    () => ({ open, scope, openOverlay, closeOverlay, setScope }),
    [open, scope, openOverlay, closeOverlay, setScope],
  );

  return (
    <AskAiContext.Provider value={value}>{children}</AskAiContext.Provider>
  );
}
