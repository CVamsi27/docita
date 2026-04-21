"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface DialogEntry {
  id: string;
  render: (close: () => void) => ReactNode;
}

interface DialogStackContextValue {
  push: (entry: Omit<DialogEntry, "id">) => string;
  close: (id: string) => void;
  clear: () => void;
}

const DialogStackContext = createContext<DialogStackContextValue | null>(null);

export function DialogStackProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DialogEntry[]>([]);

  const push = useCallback((entry: Omit<DialogEntry, "id">) => {
    const id = `dlg_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    setStack((prev) => [...prev, { ...entry, id }]);
    return id;
  }, []);

  const close = useCallback((id: string) => {
    setStack((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setStack([]), []);

  const value = useMemo<DialogStackContextValue>(
    () => ({ push, close, clear }),
    [push, close, clear],
  );

  return (
    <DialogStackContext.Provider value={value}>
      {children}
      {stack.map((entry) => (
        <div key={entry.id}>{entry.render(() => close(entry.id))}</div>
      ))}
    </DialogStackContext.Provider>
  );
}

export function useDialogStack(): DialogStackContextValue {
  const ctx = useContext(DialogStackContext);
  if (!ctx) {
    throw new Error("useDialogStack must be used within a DialogStackProvider");
  }
  return ctx;
}
