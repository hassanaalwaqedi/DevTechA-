import React from "react";
import Link from "next/link";

type GradientButtonProps = {
  href?: string;
  variant?: "primary" | "secondary" | "nav";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  type?: "button" | "submit" | "reset";
};

export function GradientButton({
  href,
  variant = "primary",
  className = "",
  children,
  onClick,
  ariaLabel,
  type = "button",
}: GradientButtonProps) {
  const classes = `dt-btn dt-btn-${variant}${className ? ` ${className}` : ""}`;

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

