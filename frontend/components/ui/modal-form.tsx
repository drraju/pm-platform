import React, { type FormHTMLAttributes, type ReactNode } from "react";

export function ModalForm({
  children,
  className = "",
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form className={`space-y-6 ${className}`.trim()} {...props}>
      {children}
    </form>
  );
}

export function ModalFormGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`.trim()}>{children}</div>
  );
}

export function ModalFormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
