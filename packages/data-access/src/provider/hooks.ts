import { useContext } from "react";
import { DataAccessContext, type DataAccessConfig } from "./context";

export function useDataAccessContext(): DataAccessConfig {
  const ctx = useContext(DataAccessContext);
  if (ctx === null) {
    throw new Error(
      "useDataAccessContext: missing <DataAccessProvider>. Wrap your app in DataAccessProvider before using data-access hooks.",
    );
  }
  return ctx;
}

export function useDataAccessFetcher(): DataAccessConfig["fetcher"] {
  return useDataAccessContext().fetcher;
}
