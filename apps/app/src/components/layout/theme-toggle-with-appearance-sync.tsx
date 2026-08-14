import { useEffect, useState } from "react";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggleWithAppearanceSync({
  className,
}: {
  className?: string;
}) {
  const theme = useAppearanceStore((s) => s.theme);
  const setTheme = useAppearanceStore((s) => s.setTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const update = () => setSystemTheme(getSystemTheme());
    update();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Match ThemeProvider's resolution so the icon reflects the OS theme when
  // in "system" mode, instead of always showing light.
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <ThemeToggle
      className={className}
      resolvedTheme={resolvedTheme}
      onToggle={() => setTheme(nextTheme)}
    />
  );
}
