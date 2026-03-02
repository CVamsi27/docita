import { cn } from "@workspace/ui/lib/utils";

interface DocitaLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export function DocitaIcon({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {}
      <rect width="32" height="32" rx="8" fill="url(#docita_logo_gradient)" />

      {}
      <path d="M9 7H13V25H9V7Z" fill="white" />
      <path
        d="M13 7H17C21.4183 7 25 10.5817 25 15V17C25 21.4183 21.4183 25 17 25H13V20H17C18.6569 20 20 18.6569 20 17V15C20 13.3431 18.6569 12 17 12H13V7Z"
        fill="white"
      />
      <path d="M6 13.5H13V18.5H6V13.5Z" fill="white" />

      <defs>
        <linearGradient
          id="docita_logo_gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DocitaLogo({
  className,
  iconClassName,
  textClassName,
  showText = true,
}: DocitaLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DocitaIcon className={cn("h-8 w-8", iconClassName)} />
      {showText && (
        <span className={cn("text-xl font-bold tracking-tight", textClassName)}>
          Docita
        </span>
      )}
    </div>
  );
}
