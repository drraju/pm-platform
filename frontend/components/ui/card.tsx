import React from "react";
import { classNames } from "./classnames";

type CardElement = "article" | "div" | "section";
type CardPadding = "compact" | "default" | "none";
type CardVariant = "standard" | "subtle";

type CardProps = React.HTMLAttributes<HTMLElement> & {
  as?: CardElement;
  padding?: CardPadding;
  variant?: CardVariant;
};

const variantStyles: Record<CardVariant, string> = {
  standard:
    "rounded-ui border border-ui-border bg-ui-surface shadow-ui",
  subtle:
    "rounded-ui-lg border border-slate-200/80 bg-ui-surface shadow-ui-subtle",
};

const paddingStyles: Record<CardPadding, string> = {
  compact: "p-4",
  default: "p-ui",
  none: "",
};

export function Card({
  as = "section",
  children,
  className,
  padding = "none",
  variant = "standard",
  ...props
}: CardProps) {
  return React.createElement(
    as,
    {
      ...props,
      className: classNames(
        variantStyles[variant],
        paddingStyles[padding],
        className,
      ),
    },
    children,
  );
}

export function SectionCard(props: Omit<CardProps, "padding">) {
  return <Card padding="default" {...props} />;
}
