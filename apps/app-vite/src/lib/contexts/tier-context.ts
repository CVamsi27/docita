import { createContext, useContext } from "react";

interface TierContextValue {
  tier: number | null;
  hasIntelligence: boolean;
}

const TierContext = createContext<TierContextValue>({
  tier: null,
  hasIntelligence: false,
});

export function useTier(): TierContextValue {
  return useContext(TierContext);
}

export { TierContext };
