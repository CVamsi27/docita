import { cn } from "@workspace/ui/lib/utils";
import { DOCITA_ICON_CACHE_BUST } from "../lib/docita-brand";

interface DocitaLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  tone?: "auto" | "dark";
}

interface DocitaLogoFullProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  tagline?: string;
  taglineClassName?: string;
  tone?: "auto" | "dark";
}

interface DocitaIconProps {
  className?: string;
  alt?: string;
}

const brandAsset = (fileName: string) =>
  `/branding/${fileName}.png?${DOCITA_ICON_CACHE_BUST}`;

const ORIGINAL_WORDMARK_ASSET = brandAsset("Dark-background");
const ICON_FRAME_CLASS =
  "rounded-[var(--radius-xl)] shadow-[0_14px_30px_-14px_rgba(15,23,42,0.58)] dark:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.82)]";
const WORDMARK_FRAME_CLASS =
  "rounded-[var(--radius-xl)] shadow-[0_8px_18px_-16px_rgba(15,23,42,0.5)] dark:shadow-[0_8px_18px_-16px_rgba(0,0,0,0.7)]";

function BrandImage({
  src,
  alt,
  className,
  frameClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  frameClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center align-middle leading-none isolate",
        frameClassName,
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn("relative z-10 block", className)}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </span>
  );
}

export function DocitaIcon({
  className,
  alt = "Docita icon",
}: DocitaIconProps) {
  const src = brandAsset("Round_Logo");

  return (
    <BrandImage
      src={src}
      alt={alt}
      frameClassName={ICON_FRAME_CLASS}
      className={cn(
        "block h-9 w-9 shrink-0 rounded-[var(--radius-xl)] object-contain align-middle ring-1 ring-border/55 drop-shadow-[0_3px_8px_rgba(15,23,42,0.16)] dark:drop-shadow-[0_3px_8px_rgba(0,0,0,0.32)]",
        className,
      )}
    />
  );
}

export function DocitaIconMonochrome({ className }: { className?: string }) {
  return <DocitaIcon className={className} />;
}

export function DocitaLogo({
  className,
  iconClassName,
  textClassName,
  showText = true,
  tone: _tone = "auto",
}: DocitaLogoProps) {
  if (!showText) {
    return <DocitaIcon className={cn(className, iconClassName)} />;
  }

  return (
    <BrandImage
      src={ORIGINAL_WORDMARK_ASSET}
      alt="Docita"
      frameClassName={WORDMARK_FRAME_CLASS}
      className={cn(
        "block h-9 w-auto shrink-0 rounded-[var(--radius-xl)] object-contain align-middle drop-shadow-[0_2px_6px_rgba(15,23,42,0.12)] dark:drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]",
        className,
        textClassName,
      )}
    />
  );
}

export function DocitaLogoFull({
  className,
  iconClassName,
  textClassName,
  tagline = "Modern Healthcare Solutions",
  taglineClassName,
  tone: _tone = "auto",
}: DocitaLogoFullProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 text-foreground", className)}>
      <BrandImage
        src={ORIGINAL_WORDMARK_ASSET}
        alt="Docita"
        frameClassName={WORDMARK_FRAME_CLASS}
        className={cn(
          "block h-[4.125rem] w-auto max-w-full rounded-[var(--radius-xl)] object-contain drop-shadow-[0_2px_6px_rgba(15,23,42,0.12)] dark:drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]",
          iconClassName,
          textClassName,
        )}
      />
      {tagline && (
        <span
          className={cn(
            "text-xs font-semibold tracking-widest uppercase text-muted-foreground hidden",
            taglineClassName,
          )}
        >
          {tagline}
        </span>
      )}
    </div>
  );
}

export function DocitaWordmark({
  className,
  textClassName,
  tone: _tone = "auto",
}: {
  className?: string;
  textClassName?: string;
  tone?: "auto" | "dark";
}) {
  return (
    <BrandImage
      src={ORIGINAL_WORDMARK_ASSET}
      alt="Docita"
      frameClassName={WORDMARK_FRAME_CLASS}
      className={cn(
        "block h-9 w-auto shrink-0 rounded-[var(--radius-xl)] object-contain align-middle drop-shadow-[0_2px_6px_rgba(15,23,42,0.12)] dark:drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]",
        className,
        textClassName,
      )}
    />
  );
}
