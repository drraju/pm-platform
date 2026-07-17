import React from "react";
import { classNames } from "./classnames";

export function ActionGroup({
  children,
  className,
  wrap = true,
}: {
  children: React.ReactNode;
  className?: string;
  wrap?: boolean;
}) {
  return (
    <div
      className={classNames(
        "flex items-center gap-2",
        wrap && "flex-wrap",
        className,
      )}
    >
      {children}
    </div>
  );
}
