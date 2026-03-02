import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const MAX_HISTORY_SIZE = 50;
const STORAGE_KEY = "docita-navigation-history";

interface NavigationState {
  history: string[];
  pushRoute: (route: string) => void;
  popRoute: () => string | null;
  clearHistory: () => void;
  canGoBack: () => boolean;
  getPreviousRoute: (fallback?: string) => string;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set, get) => ({
      history: [],

      pushRoute: (route: string) => {
        const { history } = get();

        if (history.length > 0 && history[history.length - 1] === route) {
          return;
        }

        set((state) => {
          const newHistory = [...state.history, route];

          if (newHistory.length > MAX_HISTORY_SIZE) {
            return { history: newHistory.slice(-MAX_HISTORY_SIZE) };
          }
          return { history: newHistory };
        });
      },

      popRoute: (): string | null => {
        const { history } = get();
        if (history.length === 0) return null;

        const previousRoute = history[history.length - 1];
        if (!previousRoute) return null;

        set((state) => ({
          history: state.history.slice(0, -1),
        }));

        return previousRoute;
      },

      clearHistory: () => {
        set({ history: [] });
      },

      canGoBack: (): boolean => {
        const { history } = get();

        return history.length > 1;
      },

      getPreviousRoute: (fallback: string = "/"): string => {
        const { history } = get();

        if (history.length > 1) {
          return history[history.length - 2] || fallback;
        }
        return fallback;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ history: state.history }),
    },
  ),
);
