"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonStyle = "primary" | "secondary" | "ghost";

type PrimaryButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> & {
  style?: ButtonStyle;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const STYLE_CLASSES: Record<ButtonStyle, string> = {
  primary:
    "bg-action text-actionText shadow-soft hover:brightness-105 active:scale-[0.985]",
  secondary:
    "bg-actionSecondary text-actionSecondaryText shadow-soft hover:bg-section active:scale-[0.985]",
  ghost:
    "bg-transparent text-link hover:bg-section active:scale-[0.985]",
};

export function PrimaryButton({
  children,
  className = "",
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  type = "button",
  style = "primary",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 font-body text-sm font-semibold transition-transform duration-fast ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:pointer-events-none disabled:opacity-50",
        STYLE_CLASSES[style],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {leadingIcon}
      <span>{children}</span>
      {trailingIcon}
    </button>
  );
}

export { PrimaryButton as Button };
export type { PrimaryButtonProps };
