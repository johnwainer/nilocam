import { cx } from "@/lib/utils";

type Props = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className }: Props) {
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--app-border)] bg-white shadow-[0_12px_30px_rgba(17,17,17,0.08)]">
        <svg viewBox="0 0 64 64" className="h-8 w-8 text-black" fill="none" aria-hidden="true">
          {/* camera body */}
          <rect x="6" y="24" width="52" height="32" rx="7" stroke="currentColor" strokeWidth="2.4" />
          {/* viewfinder bump */}
          <path d="M22 24 L22 17 Q22 14 25 14 L39 14 Q42 14 42 17 L42 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* shutter button */}
          <circle cx="13" cy="18" r="4" stroke="currentColor" strokeWidth="2" />
          <circle cx="13" cy="18" r="1.8" fill="currentColor" />
          {/* lens outer */}
          <circle cx="32" cy="40" r="10" stroke="currentColor" strokeWidth="2.4" />
          {/* lens inner */}
          <circle cx="32" cy="40" r="5" fill="currentColor" />
          {/* lens highlight */}
          <circle cx="29" cy="37" r="1.6" fill="white" opacity="0.7" />
        </svg>
      </div>
      <div>
        <p
          className={
            compact
              ? "text-sm font-semibold tracking-[0.18em] uppercase"
              : "text-base font-semibold tracking-[0.22em] uppercase"
          }
        >
          Memorica
        </p>
        <p className="text-xs text-[var(--app-muted)]">Recuerdos en vivo para tu evento</p>
      </div>
    </div>
  );
}
