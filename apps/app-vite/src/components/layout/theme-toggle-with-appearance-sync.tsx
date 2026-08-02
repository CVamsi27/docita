import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { useAppearanceStore } from "@/lib/stores/appearance-store";

export function ThemeToggleWithAppearanceSync({
  className,
}: {
  className?: string;
}) {
  const theme = useAppearanceStore((s) => s.theme);
  const setTheme = useAppearanceStore((s) => s.setTheme);

  const resolvedTheme = theme === "system" ? "light" : theme;
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <ThemeToggle
      className={className}
      resolvedTheme={resolvedTheme}
      onToggle={() => setTheme(nextTheme)}
    />
  );
}