import type { KeyboardShortcut } from "./keyboard-shortcut-types.js";

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  return [
    ...formatModifierParts(shortcut.modifiers || [], isMac),
    shortcut.key.toUpperCase(),
  ].join(isMac ? "" : "+");
}

function formatModifierParts(
  modifiers: NonNullable<KeyboardShortcut["modifiers"]>,
  isMac: boolean,
): string[] {
  const parts: string[] = [];
  if (modifiers.includes("meta") || modifiers.includes("ctrl")) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (modifiers.includes("alt")) parts.push(isMac ? "⌥" : "Alt");
  if (modifiers.includes("shift")) parts.push(isMac ? "⇧" : "Shift");
  return parts;
}
