import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface SectionHeadingProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  align?: "left" | "center";
  size?: "section" | "page" | "hero";
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  titleAs?: "h1" | "h2" | "h3" | "div";
}

const sizeClasses = {
  section: {
    title: "ui-section-title",
    description: "ui-section-subtitle",
    container: "gap-3",
    copy: "ui-copy-stack",
  },
  page: {
    title: "ui-page-title",
    description: "ui-page-subtitle",
    container: "gap-3",
    copy: "ui-copy-stack",
  },
  hero: {
    title: "ui-hero-title",
    description: "ui-hero-subtitle",
    container: "gap-5",
    copy: "space-y-3",
  },
} as const;

const defaultTitleTags = {
  section: "h2",
  page: "h1",
  hero: "h1",
} as const;

export function SectionHeading({
  title,
  description,
  eyebrow,
  actions,
  align = "left",
  size = "section",
  className,
  titleClassName,
  descriptionClassName,
  titleAs,
}: SectionHeadingProps) {
  const classes = sizeClasses[size];
  const TitleTag = titleAs ?? defaultTitleTags[size];

  return (
    <div
      className={cn(
        "flex flex-col",
        classes.container,
        actions &&
          (align === "center"
            ? "items-center"
            : "md:flex-row md:items-start md:justify-between"),
        align === "center" && "text-center items-center",
        className,
      )}
    >
      <div className={cn("min-w-0", classes.copy)}>
        {eyebrow ? <div className="ui-eyebrow">{eyebrow}</div> : null}
        <TitleTag className={cn(classes.title, titleClassName)}>
          {title}
        </TitleTag>
        {description ? (
          <p
            className={cn(
              classes.description,
              align === "center" && "max-w-3xl",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            align === "center"
              ? "justify-center"
              : "md:shrink-0 md:justify-end",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
