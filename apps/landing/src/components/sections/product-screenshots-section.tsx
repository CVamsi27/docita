"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Maximize2,
  Receipt,
  Stethoscope,
  X,
} from "lucide-react";

import { useDialogFocus } from "@workspace/ui/lib/dialog-focus";
import { resolveRovingTablistTarget } from "@workspace/ui/lib/roving-tablist";
import { cn } from "@workspace/ui/lib/utils";
import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface ProductShotImage {
  src: string;
  width: number;
  height: number;
  format: string;
}

interface ProductShot {
  id: string;
  image: ProductShotImage;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
}

interface ProductScreenshotsSectionProps {
  shots: ProductShot[];
}

const ICON_MAP: Record<string, typeof CalendarDays> = {
  today: ClipboardList,
  consultation: Stethoscope,
  prescription: FileText,
  appointments: CalendarDays,
  invoices: Receipt,
};

type CategoryId = "all" | "clinical" | "reception";

const CATEGORIES: Array<{ id: CategoryId; label: string }> = [
  { id: "all", label: "All screens" },
  { id: "clinical", label: "Clinical & EMR" },
  { id: "reception", label: "Front Desk & Billing" },
];

const CLINICAL_IDS = new Set(["today", "consultation", "prescription"]);
const RECEPTION_IDS = new Set(["appointments", "invoices"]);

export function ProductScreenshotsSection({ shots }: ProductScreenshotsSectionProps) {
  const reduce = useReducedMotion();
  const modalHeadingId = useId();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [activeShotIndex, setActiveShotIndex] = useState<number | null>(null);
  const categoryRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useDialogFocus(activeShotIndex !== null);

  const selectCategoryAt = (index: number) => {
    const category = CATEGORIES[index];
    if (!category) return;
    setActiveCategory(category.id);
    setActiveShotIndex(null);
    categoryRefs.current[index]?.focus();
  };

  // Arrow keys are the only way to reach the inactive filter tabs, which sit at
  // tabindex -1 so the strip is a single tab stop.
  const handleCategoryKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const nextIndex = resolveRovingTablistTarget({
      key: event.key,
      count: CATEGORIES.length,
      currentIndex: CATEGORIES.findIndex(
        (category) => category.id === activeCategory,
      ),
    });
    if (nextIndex === null) return;

    event.preventDefault();
    selectCategoryAt(nextIndex);
  };

  const filteredShots = useMemo(() => {
    if (activeCategory === "clinical") {
      return shots.filter((s) => CLINICAL_IDS.has(s.id));
    }
    if (activeCategory === "reception") {
      return shots.filter((s) => RECEPTION_IDS.has(s.id));
    }
    return shots;
  }, [shots, activeCategory]);

  // Handle ESC and Arrow keys for screenshot modal
  useEffect(() => {
    if (activeShotIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveShotIndex(null);
      } else if (e.key === "ArrowLeft") {
        setActiveShotIndex((prev) =>
          prev !== null ? (prev - 1 + filteredShots.length) % filteredShots.length : null,
        );
      } else if (e.key === "ArrowRight") {
        setActiveShotIndex((prev) =>
          prev !== null ? (prev + 1) % filteredShots.length : null,
        );
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeShotIndex, filteredShots.length]);

  const item = landingFadeUpVariants(reduce ?? false);
  const stagger = landingStaggerContainer(reduce ?? false, 0.08, 0.04);

  return (
    <section
      id="product-screenshots"
      className="r2-section r2-section-lead r2-band-card"
      aria-labelledby="r2-product-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Inside the product</span>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-end lg:gap-12">
          <h2
            id="r2-product-heading"
            className="max-w-3xl r2-display-md text-foreground"
          >
            The screens your <em>team will actually use</em>.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Real product captures, not mock-ups. Each one is a click or two
            away from a live workflow.
          </p>
        </div>

        {/* Workflow Role Filter Tabs */}
        <div
          className="mt-8 flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter screens by department"
          onKeyDown={handleCategoryKeyDown}
        >
          {CATEGORIES.map((cat, index) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`r2-product-tab-${cat.id}`}
                type="button"
                role="tab"
                ref={(node) => {
                  categoryRefs.current[index] = node;
                }}
                tabIndex={isSelected ? 0 : -1}
                aria-selected={isSelected}
                aria-controls="r2-product-panel"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveShotIndex(null);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <motion.div
          id="r2-product-panel"
          role="tabpanel"
          aria-labelledby={`r2-product-tab-${activeCategory}`}
          className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {filteredShots.map((shot, idx) => {
            const Icon = ICON_MAP[shot.id] ?? CalendarDays;
            return (
              <motion.figure
                key={shot.id}
                variants={item}
                className="r2-product-shot group cursor-pointer transition-colors duration-150 hover:border-primary/40"
                onClick={() => setActiveShotIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveShotIndex(idx);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Enlarge ${shot.title}`}
                aria-haspopup="dialog"
              >
                <div className="r2-product-shot-frame">
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-shot-chrome-label">
                    DOCITA &middot; {shot.eyebrow.toUpperCase()}
                  </span>
                </div>
                <div className="r2-product-shot-image-wrap relative">
                  <img
                    src={shot.image.src}
                    alt={shot.alt}
                    loading="lazy"
                    decoding="async"
                    className="r2-product-shot-image"
                    width={shot.image.width}
                    height={shot.image.height}
                  />
                  {/* Subtle hover inspect indicator */}
                  <div className="absolute inset-0 flex items-center justify-center bg-background/25 opacity-0 backdrop-blur-[1px] transition-opacity duration-150 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                      <Maximize2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      Click to inspect
                    </span>
                  </div>
                </div>
                <figcaption className="r2-product-shot-caption">
                  <p className="r2-eyebrow r2-eyebrow-accent flex items-center gap-1.5">
                    <Icon className="h-3 w-3" aria-hidden />
                    {shot.eyebrow}
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold tracking-tight text-foreground">
                    {shot.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {shot.description}
                  </p>
                </figcaption>
              </motion.figure>
            );
          })}
        </motion.div>

        {/* High-res Lightbox Modal */}
        {activeShotIndex !== null && filteredShots[activeShotIndex] && (
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalHeadingId}
            tabIndex={-1}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4 sm:p-6 md:p-8"
            onClick={() => setActiveShotIndex(null)}
          >
            <div
              className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="r2-eyebrow r2-eyebrow-accent truncate">
                    {filteredShots[activeShotIndex].eyebrow}
                  </span>
                  <span className="text-muted-foreground/60" aria-hidden="true">·</span>
                  <h3
                    id={modalHeadingId}
                    className="truncate text-sm font-semibold text-foreground sm:text-base"
                  >
                    {filteredShots[activeShotIndex].title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {activeShotIndex + 1} / {filteredShots.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveShotIndex(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Screenshot display */}
              <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-auto bg-muted/20 p-2 sm:p-4">
                <img
                  src={filteredShots[activeShotIndex].image.src}
                  alt={filteredShots[activeShotIndex].alt}
                  className="max-h-[66vh] w-auto rounded-lg object-contain shadow-md"
                />

                {filteredShots.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveShotIndex(
                          (activeShotIndex - 1 + filteredShots.length) %
                            filteredShots.length,
                        )
                      }
                      className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Previous screenshot"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveShotIndex(
                          (activeShotIndex + 1) % filteredShots.length,
                        )
                      }
                      className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Next screenshot"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Caption */}
              <div className="border-t border-border/60 bg-muted/30 px-4 py-3 sm:px-6">
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {filteredShots[activeShotIndex].description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
