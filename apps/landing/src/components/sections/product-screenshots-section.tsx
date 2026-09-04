"use client";

import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, ClipboardList, FileText, Receipt, Stethoscope } from "lucide-react";

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

export function ProductScreenshotsSection({ shots }: ProductScreenshotsSectionProps) {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);
  const stagger = landingStaggerContainer(reduce ?? false, 0.08, 0.04);

  return (
    <section
      id="product-screenshots"
      className="r2-section r2-band-card"
      aria-labelledby="r2-product-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Inside the product</span>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-end lg:gap-12">
          <h2
            id="r2-product-heading"
            className="max-w-3xl r2-display-sm text-foreground"
          >
            The screens your <em>team will actually use</em>.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Real product captures, not mock-ups. Each one is a click or two
            away from a live workflow.
          </p>
        </div>

        <motion.div
          className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          {shots.map((shot) => {
            const Icon = ICON_MAP[shot.id] ?? CalendarDays;
            return (
              <motion.figure
                key={shot.id}
                variants={item}
                className="r2-product-shot group"
              >
                <div className="r2-product-shot-frame">
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-chrome-dot" aria-hidden />
                  <span className="r2-product-shot-chrome-label">
                    DOCITA &middot; {shot.eyebrow.toUpperCase()}
                  </span>
                </div>
                <div className="r2-product-shot-image-wrap">
                  <img
                    src={shot.image.src}
                    alt={shot.alt}
                    loading="lazy"
                    decoding="async"
                    className="r2-product-shot-image"
                    width={shot.image.width}
                    height={shot.image.height}
                  />
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
      </div>
    </section>
  );
}
