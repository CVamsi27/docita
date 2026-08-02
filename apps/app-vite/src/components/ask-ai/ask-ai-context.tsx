import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface AskAiScope {
  id: string;
  label: string;
  payload?: Record<string, unknown>;
}

interface AskAiContextValue {
  open: boolean;
  scope: AskAiScope | null;
  openOverlay: (scope?: AskAiScope) => void;
  closeOverlay: () => void;
  setScope: (scope: AskAiScope | null) => void;
}

const AskAiContext = createContext<AskAiContextValue | null>(null);

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

export function useAskAi(): AskAiContextValue {
  const value = useContext(AskAiContext);
  if (!value) throw new Error("useAskAi must be used within AskAiProvider");
  return value;
}