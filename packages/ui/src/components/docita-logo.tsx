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

function BrandImage({
  src,
  alt,
  className,
  blendClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  blendClassName?: string;
}) {
  return (
    <span className="relative inline-block shrink-0 align-middle leading-none isolate overflow-visible">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full select-none object-contain",
          blendClassName,
        )}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <img
        src={src}
        alt={alt}
        className={cn("relative z-10", className)}
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
      className={cn("block h-8 w-8 shrink-0 object-contain align-middle", className)}
      blendClassName="scale-[1.025] blur-md opacity-28"
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
      className={cn(
        "block h-8 w-auto shrink-0 rounded-xl object-contain align-middle",
        className,
        textClassName,
      )}
      blendClassName="rounded-[1.15rem] blur-xl opacity-72 scale-[1.04]"
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
        className={cn(
          "block h-16 w-auto max-w-full rounded-2xl object-contain",
          iconClassName,
          textClassName,
        )}
        blendClassName="rounded-[1.65rem] blur-2xl opacity-72 scale-[1.04]"
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
      className={cn(
        "block h-8 w-auto shrink-0 rounded-xl object-contain align-middle",
        className,
        textClassName,
      )}
      blendClassName="rounded-[1.15rem] blur-xl opacity-72 scale-[1.04]"
    />
  );
}
