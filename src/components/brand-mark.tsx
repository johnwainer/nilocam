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
          <path
            d="M18 25c0-8 6-14 14-14s14 6 14 14v10c0 10-6.5 18-14 18s-14-8-14-18V25Z"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <path
            d="M24 18l-6-7v10M40 18l6-7v10"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="31" r="2.1" fill="currentColor" />
          <circle cx="38" cy="31" r="2.1" fill="currentColor" />
          <path d="M31 36h2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path
            d="M46 38c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7Z"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <path
            d="M52 32l7 7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
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
          Nilo Cam
        </p>
        <p className="text-xs text-[var(--app-muted)]">Gato espía para eventos</p>
      </div>
    </div>
  );
}
