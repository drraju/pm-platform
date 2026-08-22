"use client";

import React, { useEffect, useRef, type ReactNode } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type AppModalProps = {
  bodyClassName?: string;
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  labelledById: string;
  onClose: () => void;
  placement?: "center" | "right";
  title: string;
  widthClassName?: string;
};

export function AppModal({
  bodyClassName,
  children,
  description,
  footer,
  labelledById,
  onClose,
  placement = "center",
  title,
  widthClassName = "max-w-3xl",
}: AppModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusableElements() {
      return Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const currentIndex = focusableElements.findIndex(
        (element) => element === document.activeElement,
      );
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + focusableElements.length) %
            focusableElements.length;

      event.preventDefault();
      focusableElements[nextIndex]?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    getFocusableElements()[0]?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div
      aria-labelledby={labelledById}
      aria-modal="true"
      className={
        placement === "right"
          ? "fixed inset-0 z-50 flex justify-end bg-slate-950/30"
          : "fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-3 py-4 sm:px-4 sm:py-6"
      }
      data-testid="app-modal-overlay"
      ref={dialogRef}
      role="dialog"
    >
      <section
        className={`flex w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-xl ${
          placement === "right"
            ? "h-full max-h-none rounded-none sm:rounded-l-md"
            : "max-h-[90vh] rounded-md"
        } ${widthClassName}`}
        data-testid="app-modal-panel"
      >
        <header
          className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4"
          data-testid="app-modal-header"
        >
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
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand/30"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 ${bodyClassName ?? ""}`.trim()}
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
