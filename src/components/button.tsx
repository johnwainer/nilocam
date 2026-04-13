import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

type BaseProps = {
  children: ReactNode;
  tone?: "primary" | "secondary" | "ghost" | "soft";
  className?: string;
};

const tones = {
  primary:
    "bg-[var(--app-accent)] text-white hover:bg-black/90 shadow-[0_14px_30px_rgba(17,17,17,0.12)]",
  secondary:
    "bg-white text-[var(--app-fg)] ring-1 ring-[var(--app-border)] hover:bg-black/5",
  ghost: "bg-transparent text-[var(--app-fg)] hover:bg-black/5",
  soft: "bg-black/5 text-[var(--app-fg)] hover:bg-black/8",
};

export function Button({
  children,
  tone = "primary",
  className,
  ...props
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition duration-200",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  tone = "secondary",
  className,
  ...props
}: BaseProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition duration-200",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
