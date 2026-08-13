import { createContext, useContext } from "react";

export interface AskAiScope {
  id: string;
  label: string;
  payload?: Record<string, unknown>;
}

export interface AskAiContextValue {
  open: boolean;
  scope: AskAiScope | null;
  openOverlay: (scope?: AskAiScope) => void;
  closeOverlay: () => void;
  setScope: (scope: AskAiScope | null) => void;
}

export const AskAiContext = createContext<AskAiContextValue | null>(null);

export function useAskAi(): AskAiContextValue {
  const value = useContext(AskAiContext);
  if (!value) throw new Error("useAskAi must be used within AskAiProvider");
  return value;
}
