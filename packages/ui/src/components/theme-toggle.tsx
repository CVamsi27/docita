"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useMounted } from "@workspace/hooks";

/**
 * Theme Toggle Button
 *
 * A button that toggles between light and dark themes.
 * Uses next-themes for theme management.
 *
 * @example
 * ```tsx
 * import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
 *
 * function Header() {
 *   return (
 *     <header>
 *       <nav>...</nav>
 *       <ThemeToggle />
 *     </header>
 *   );
 * }
 * ```
 */
export function ThemeToggle() {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();

  // Avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
