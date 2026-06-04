import type { KeyboardShortcut } from "./keyboard-shortcut-types.js";
import { matchesShortcutKey } from "./keyboard-shortcut-key.js";
import { matchesShortcutModifiers } from "./keyboard-shortcut-modifiers.js";
import { isTypingTarget } from "./keyboard-shortcut-target.js";

export function shouldRunShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut,
): boolean {
  if (shortcut.enabled === false) return false;
  if (isTypingTarget(event.target) && !hasModifiers(shortcut)) return false;
  return (
    matchesShortcutKey(event, shortcut) &&
    matchesShortcutModifiers(event, shortcut)
  );
}

function hasModifiers(shortcut: KeyboardShortcut): boolean {
  return (shortcut.modifiers || []).length > 0;
}
