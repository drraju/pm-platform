import React from "react";
import { classNames } from "./classnames";

type EmptyStateProps = {
  children: React.ReactNode;
  className?: string;
  surface?: "muted" | "white";
  variant?: "dashed" | "plain";
};

export function EmptyState({
  children,
  className,
  surface = "muted",
  variant = "plain",
}: EmptyStateProps) {
  return (
    <p
      className={classNames(
        "text-sm text-slate-500",
        variant === "dashed" &&
          "rounded-md border border-dashed border-slate-300 px-4 py-6",
        variant === "dashed" &&
          (surface === "white" ? "bg-white text-slate-600" : "bg-slate-50"),
        className,
      )}
    >
      {children}
    </p>
  );
}

export function LoadingSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={classNames("animate-pulse", className)}
    />
  );
}

export function ErrorState({
  children,
  className,
  variant = "inline",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "inline" | "page";
}) {
  return (
    <div
      className={classNames(
        "border border-red-200 bg-red-50 text-sm text-red-700",
        variant === "inline"
          ? "rounded-md px-3 py-2"
          : "rounded-lg px-4 py-3 leading-6",
        className,
      )}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
}
