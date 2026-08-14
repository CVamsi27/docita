"use client";

import type { LucideIcon } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { DifferentiatorIcon } from "./differentiator-icon";

interface DifferentiatorCardProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  variants: Variants;
  children: React.ReactNode;
}

export function DifferentiatorCard({
  icon,
  eyebrow,
  title,
  description,
  variants,
  children,
}: DifferentiatorCardProps) {
  return (
    <motion.article variants={variants} className="r2-diff-col">
      <DifferentiatorIcon icon={icon} eyebrow={eyebrow} />
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
    </motion.article>
  );
}
