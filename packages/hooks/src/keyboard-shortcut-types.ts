export interface KeyboardShortcut {
  key: string;
  modifiers?: ("meta" | "ctrl" | "alt" | "shift")[];
  description: string;
  action: () => void;
  scope?: string;
  enabled?: boolean;
}
