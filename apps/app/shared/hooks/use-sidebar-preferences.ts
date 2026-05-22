import { useState, useEffect, useCallback } from "react";
import { z } from "zod";

const STORAGE_KEY = "sidebar_hidden_items";

export function useSidebarPreferences(clinicId: string | null) {
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!clinicId) return;
    const stored = localStorage.getItem(`${STORAGE_KEY}_${clinicId}`);
    if (stored) {
      try {
        const parsed = z.array(z.string()).safeParse(JSON.parse(stored));
        if (parsed.success) {
          setHiddenItems(new Set(parsed.data));
        }
      } catch {
        // ignore malformed data
      }
    }
  }, [clinicId]);

  const toggleItem = useCallback(
    (href: string) => {
      setHiddenItems((prev) => {
        const next = new Set(prev);
        if (next.has(href)) {
          next.delete(href);
        } else {
          next.add(href);
        }
        if (clinicId) {
          localStorage.setItem(
            `${STORAGE_KEY}_${clinicId}`,
            JSON.stringify([...next]),
          );
        }
        return next;
      });
    },
    [clinicId],
  );

  const isHidden = useCallback(
    (href: string) => hiddenItems.has(href),
    [hiddenItems],
  );

  return { hiddenItems, toggleItem, isHidden };
}
