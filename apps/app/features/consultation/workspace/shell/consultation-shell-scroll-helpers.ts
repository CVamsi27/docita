export function buildScrollSpySelectorMap(): Record<"c" | "d" | "m", string> {
  return {
    c: '[data-section-id="subjective"] input[placeholder*="complaint" i], [data-section-id="subjective"] input',
    d: '[data-section-id="assessment"] input',
    m: '[data-section-id="plan"] input',
  };
}

export function buildScrollSpyRootId(kind: "c" | "d" | "m"): string {
  return kind === "c" ? "subjective" : kind === "d" ? "assessment" : "plan";
}

export function buildLetterNavMap(
  sections: { letter: string; id: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of sections) map[s.letter.toLowerCase()] = s.id;
  return map;
}

export function buildSectionUrlParams(
  currentSearch: string | null | undefined,
  targetId: string,
  firstSectionId: string,
): string {
  const next = new URLSearchParams(currentSearch ?? "");
  next.delete("tab");
  if (targetId !== firstSectionId) {
    next.set("section", targetId);
  } else {
    next.delete("section");
  }
  return next.toString();
}

export function cleanSectionUrlParams(
  currentSearch: string,
  validSectionId: string,
  defaultSectionId: string,
  tabQ: string | null,
): { params: string; changed: boolean } {
  const next = new URLSearchParams(currentSearch);
  let changed = false;
  if (tabQ) {
    next.delete("tab");
    changed = true;
  }
  if (validSectionId !== defaultSectionId) {
    if (next.get("section") !== validSectionId) {
      next.set("section", validSectionId);
      changed = true;
    }
  } else if (next.has("section")) {
    next.delete("section");
    changed = true;
  }
  return { params: next.toString(), changed };
}
