import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface WorkspaceLayoutProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Controls spacing between top-level workspace regions, such as the header
   * and content. Use WorkspaceContent for spacing between content sections.
   */
  spacing?: "compact" | "default" | "none";
  /** @deprecated Use spacing instead. */
  density?: "compact" | "comfortable";
}

const spacingStyles = {
  compact: "space-y-4",
  default: "space-y-6",
  none: "",
} as const;

export const WorkspaceLayout = React.forwardRef<
  HTMLDivElement,
  WorkspaceLayoutProps
>(function WorkspaceLayout(
  {
    children,
    className,
    density,
    spacing = density === "compact" ? "compact" : "default",
    ...props
  },
  ref,
) {
  return (
    <div
      className={classNames("min-w-0", spacingStyles[spacing], className)}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  );
});
