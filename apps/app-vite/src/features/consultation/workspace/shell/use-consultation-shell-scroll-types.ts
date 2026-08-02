import type { MutableRefObject } from "react";
import type { ConsultationSection } from "@/features/consultation/workspace/consultation-section-registry";

export interface ShellScrollRefs {
  sectionsRef: MutableRefObject<ConsultationSection[]>;
  mainScrollRef: MutableRefObject<HTMLElement | null>;
  sectionRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  layoutBumpRaf: MutableRefObject<number | null>;
  scrollSpyRaf: MutableRefObject<number | null>;
  pendingUrlScrollRef: MutableRefObject<string | null>;
  lastUrlScrollKeyRef: MutableRefObject<string>;
  scrollSpySuppressedUntilRef: MutableRefObject<number>;
}
