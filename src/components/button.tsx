import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

type BaseProps = {
  children: ReactNode;
  tone?: "primary" | "secondary" | "ghost" | "soft";
  className?: string;
};

const tones = {
  primary:
    "bg-[var(--app-accent)] text-white shadow-lg shadow-indigo-500/20 hover:opacity-95",
  secondary:
    "bg-white/8 text-white ring-1 ring-white/12 hover:bg-white/12",
  ghost: "bg-transparent text-[var(--app-fg)] hover:bg-white/8",
  soft: "bg-white/10 text-white hover:bg-white/14",
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
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
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
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

