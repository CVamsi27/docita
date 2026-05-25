import type { ReactNode } from "react";
import { DataAccessContext, type DataAccessConfig } from "./context";

export function DataAccessProvider({
  config,
  children,
}: {
  config: DataAccessConfig;
  children: ReactNode;
}) {
  return (
    <DataAccessContext.Provider value={config}>
      {children}
    </DataAccessContext.Provider>
  );
}
