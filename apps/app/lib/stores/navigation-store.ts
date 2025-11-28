import { create } from "zustand";

interface NavigationState {
  history: string[];
  pushRoute: (route: string) => void;
  popRoute: () => string | null;
  clearHistory: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  history: [],

  pushRoute: (route: string) => {
    set((state) => ({
      history: [...state.history, route],
    }));
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
}));
