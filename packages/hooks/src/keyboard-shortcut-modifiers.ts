import type { KeyboardShortcut } from "./keyboard-shortcut-types.js";

export function matchesShortcutModifiers(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut,
): boolean {
  const modifiers = shortcut.modifiers || [];
  return (
    matchesPrimaryModifier(event, modifiers) &&
    matchesAltModifier(event, modifiers) &&
    matchesShiftModifier(event, modifiers)
  );
}

function matchesPrimaryModifier(
  event: KeyboardEvent,
  modifiers: NonNullable<KeyboardShortcut["modifiers"]>,
): boolean {
  const metaOrCtrl = modifiers.includes("meta") || modifiers.includes("ctrl");
  return (
    modifiers.length === 0 || !metaOrCtrl || event.metaKey || event.ctrlKey
  );
}

function matchesAltModifier(
  event: KeyboardEvent,
  modifiers: NonNullable<KeyboardShortcut["modifiers"]>,
): boolean {
  return modifiers.includes("alt") ? event.altKey : !event.altKey;
}

function matchesShiftModifier(
  event: KeyboardEvent,
  modifiers: NonNullable<KeyboardShortcut["modifiers"]>,
): boolean {
  return modifiers.includes("shift") ? event.shiftKey : !event.shiftKey;
}
