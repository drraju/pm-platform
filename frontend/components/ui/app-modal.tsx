"use client";

import React, { useEffect, type ReactNode } from "react";

type AppModalProps = {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  labelledById: string;
  onClose: () => void;
  title: string;
  widthClassName?: string;
};

export function AppModal({
  children,
  description,
  footer,
  labelledById,
  onClose,
  title,
  widthClassName = "max-w-3xl",
}: AppModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      aria-labelledby={labelledById}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-3 py-4 sm:px-4 sm:py-6"
      data-testid="app-modal-overlay"
      role="dialog"
    >
      <section
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl ${widthClassName}`}
        data-testid="app-modal-panel"
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950" id={labelledById}>
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            aria-label={`Close ${title}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5"
          data-testid="app-modal-body"
        >
          {children}
        </div>

        {footer ? (
          <footer
            className="sticky bottom-0 z-10 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4"
            data-testid="app-modal-footer"
          >
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
