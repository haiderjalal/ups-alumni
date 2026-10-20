import { cn } from "@/lib/utils";

interface PhotoPlaceholderProps {
  label: string;
  className?: string;
}

/**
 * Stand-in for approved campus or reunion photography until the school supplies it.
 * It is a nonrepresentational composition, so it never implies that a real place or person is shown.
 */
export function PhotoPlaceholder({ label, className }: PhotoPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] bg-brand-deep text-white",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <rect width="400" height="500" className="fill-brand-deep" />
        <path d="M0 360 C 90 300, 160 420, 260 360 S 380 300, 400 330 L400 500 L0 500 Z" className="fill-brand-night/55" />
        <path d="M0 410 C 110 360, 200 440, 300 400 S 380 380, 400 392 L400 500 L0 500 Z" className="fill-brand-night" />
        <circle cx="300" cy="140" r="58" fill="none" className="stroke-brand-lime" strokeWidth="1.5" opacity="0.7" />
        <circle cx="300" cy="140" r="34" fill="none" className="stroke-brand-lavender" strokeWidth="1" opacity="0.6" />
      </svg>
      <span className="absolute bottom-4 left-4 right-4 font-display text-xl leading-snug text-white/90">{label}</span>
    </div>
  );
}
