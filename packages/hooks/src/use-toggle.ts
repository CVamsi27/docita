import { useCallback, useState } from "react";

/**
 * Custom hook for managing boolean toggle state
 *
 * Provides a simple way to manage boolean state with toggle functionality.
 * Useful for expand/collapse states, modal visibility, feature toggles, etc.
 *
 * @param initialValue - Initial state value (default: false)
 * @returns Tuple containing [state, toggle function, setState function]
 *
 * @example
 * ```typescript
 * // Basic toggle
 * const [isOpen, toggle] = useToggle();
 * <button onClick={toggle}>Open/Close</button>
 *
 * // With explicit set
 * const [isExpanded, toggleExpanded, setExpanded] = useToggle(false);
 * <button onClick={() => setExpanded(true)}>Expand</button>
 * <button onClick={() => setExpanded(false)}>Collapse</button>
 * <button onClick={toggleExpanded}>Toggle</button>
 * ```
 */
export function useToggle(
  initialValue = false,
): [boolean, () => void, (value: boolean) => void] {
  const [state, setState] = useState(initialValue);

  // Memoize toggle function to prevent unnecessary re-renders
  const toggle = useCallback(() => {
    setState((prev) => !prev);
  }, []);

  return [state, toggle, setState];
}
