/** Viewport preset for one-shot scroll reveals. */
export const landingInViewViewport = {
  once: true,
  margin: "-10%",
  amount: 0.2,
} as const;

export function landingSpringTransition(prefersReducedMotion: boolean | null) {
  if (prefersReducedMotion) {
    return { duration: 0 };
  }
  return { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.85 };
}

export function landingFadeUpVariants(prefersReducedMotion: boolean | null) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1, y: 0 },
      visible: { opacity: 1, y: 0, transition: { duration: 0 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: landingSpringTransition(false),
    },
  };
}

export function landingStaggerContainer(
  prefersReducedMotion: boolean | null,
  stagger: number,
  delayChildren = 0,
) {
  if (prefersReducedMotion) {
    return {
      hidden: {},
      visible: {
        transition: { staggerChildren: 0, delayChildren: 0 },
      },
    };
  }
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}
