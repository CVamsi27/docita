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
const ICON_FRAME_CLASS = "rounded-[var(--radius-xl)]";
const WORDMARK_FRAME_CLASS = "rounded-[var(--radius-xl)]";

function BrandImage({
  src,
  alt,
  className,
  frameClassName,
  width,
  height,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  frameClassName?: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
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
        width={width}
        height={height}
        className={cn("relative z-10 block", className)}
        loading={loading}
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
      width={64}
      height={64}
      frameClassName={ICON_FRAME_CLASS}
      loading="eager"
      className={cn(
        "block h-9 w-9 shrink-0 rounded-[var(--radius-xl)] object-contain align-middle ring-1 ring-border/55",
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
      width={857}
      height={413}
      frameClassName={WORDMARK_FRAME_CLASS}
      loading="eager"
      className={cn(
        "block h-9 w-auto shrink-0 rounded-[var(--radius-xl)] object-contain align-middle",
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
      width={857}
      height={413}
      frameClassName={WORDMARK_FRAME_CLASS}
      loading="eager"
      className={cn(
        "block h-[4.125rem] w-auto max-w-full rounded-[var(--radius-xl)] object-contain",
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
      width={857}
      height={413}
      frameClassName={WORDMARK_FRAME_CLASS}
      loading="eager"
      className={cn(
        "block h-9 w-auto shrink-0 rounded-[var(--radius-xl)] object-contain align-middle",
        className,
        textClassName,
      )}
    />
  );
}
