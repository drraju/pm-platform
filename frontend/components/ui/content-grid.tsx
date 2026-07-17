import React from "react";
import { classNames } from "./classnames";

type ContentGridProps = React.HTMLAttributes<HTMLElement> & {
  columns?: 2 | 3;
  gap?: 4 | 6;
};

export function ContentGrid({
  children,
  className,
  columns = 2,
  gap = 6,
  ...props
}: ContentGridProps) {
  return (
    <section
      className={classNames(
        "grid",
        gap === 4 ? "gap-4" : "gap-6",
        columns === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
