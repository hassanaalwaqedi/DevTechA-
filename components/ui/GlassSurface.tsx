import React from "react";

type GlassSurfaceProps<T extends React.ElementType = "div"> = {
  as?: T;
  variant?: "default" | "pill" | "panel" | "card" | "ribbon";
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "variant" | "className" | "children">;

export function GlassSurface<T extends React.ElementType = "div">({
  as,
  variant = "default",
  className = "",
  children,
  ...rest
}: GlassSurfaceProps<T>) {
  const Component = as || "div";
  const classes = `dt-glass dt-glass-${variant}${className ? ` ${className}` : ""}`;
  return (
    <Component className={classes} {...rest}>
      {children}
    </Component>
  );
}

