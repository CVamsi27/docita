import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AppearanceState {
  theme: "light" | "dark" | "system";
  primaryColor: string;
  compactMode: boolean;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setPrimaryColor: (color: string) => void;
  setCompactMode: (compact: boolean) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  devtools(
    persist(
      (set) => ({
        theme: "system",
        primaryColor: "blue",
        compactMode: false,
        setTheme: (theme) => set({ theme }),
        setPrimaryColor: (primaryColor) => set({ primaryColor }),
        setCompactMode: (compactMode) => set({ compactMode }),
      }),
      {
        name: "docita-appearance",
      },
    ),
    { name: "appearance-store" },
  ),
);