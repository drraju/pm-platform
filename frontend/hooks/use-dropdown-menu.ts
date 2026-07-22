"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, RefObject } from "react";

const openMenuClosers = new Set<() => void>();

type DismissibleMenuOptions<TriggerElement extends HTMLElement> = {
  closeOnWindowBlur?: boolean;
  closeOnWindowResize?: boolean;
  isOpen: boolean;
  onClose: () => void;
  restoreFocusRef?: RefObject<TriggerElement | null>;
};

export function useDismissibleMenu<
  ContainerElement extends HTMLElement = HTMLElement,
  TriggerElement extends HTMLElement = HTMLButtonElement,
>({
  closeOnWindowBlur = false,
  closeOnWindowResize = false,
  isOpen,
  onClose,
  restoreFocusRef,
}: DismissibleMenuOptions<TriggerElement>) {
  const containerRef = useRef<ContainerElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeWithoutFocus = useCallback(() => onCloseRef.current(), []);

  const close = useCallback(
    (restoreFocus = false) => {
      closeWithoutFocus();
      if (restoreFocus) {
        restoreFocusRef?.current?.focus();
      }
    },
    [closeWithoutFocus, restoreFocusRef],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    for (const closeOpenMenu of openMenuClosers) {
      if (closeOpenMenu !== closeWithoutFocus) {
        closeOpenMenu();
      }
    }
    openMenuClosers.add(closeWithoutFocus);

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !containerRef.current?.contains(target)
      ) {
        closeWithoutFocus();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      close(true);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    if (closeOnWindowBlur) {
      window.addEventListener("blur", closeWithoutFocus);
    }
    if (closeOnWindowResize) {
      window.addEventListener("resize", closeWithoutFocus);
    }

    return () => {
      openMenuClosers.delete(closeWithoutFocus);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("blur", closeWithoutFocus);
      window.removeEventListener("resize", closeWithoutFocus);
    };
  }, [
    close,
    closeOnWindowBlur,
    closeOnWindowResize,
    closeWithoutFocus,
    isOpen,
  ]);

  const onMenuClick = useCallback(
    (event: MouseEvent<ContainerElement>) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const selectedItem = event.target.closest(
        '[role="menuitem"], [role="menuitemradio"]',
      );
      if (
        !selectedItem ||
        !event.currentTarget.contains(selectedItem) ||
        selectedItem.matches(":disabled") ||
        selectedItem.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      close(true);
    },
    [close],
  );

  return {
    close,
    closeWithoutFocus,
    containerRef,
    onMenuClick,
  } as const;
}

export function useDropdownMenu<
  ContainerElement extends HTMLElement = HTMLElement,
  TriggerElement extends HTMLElement = HTMLButtonElement,
>() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<TriggerElement | null>(null);
  const dismissibleMenu = useDismissibleMenu<
    ContainerElement,
    TriggerElement
  >({
    isOpen,
    onClose: () => setIsOpen(false),
    restoreFocusRef: triggerRef,
  });

  const open = useCallback(() => {
    for (const closeOpenMenu of openMenuClosers) {
      if (closeOpenMenu !== dismissibleMenu.closeWithoutFocus) {
        closeOpenMenu();
      }
    }
    setIsOpen(true);
  }, [dismissibleMenu.closeWithoutFocus]);

  const toggle = useCallback(() => {
    if (isOpen) {
      dismissibleMenu.close();
    } else {
      open();
    }
  }, [dismissibleMenu, isOpen, open]);

  return {
    close: dismissibleMenu.close,
    containerRef: dismissibleMenu.containerRef,
    isOpen,
    onMenuClick: dismissibleMenu.onMenuClick,
    open,
    toggle,
    triggerRef,
  } as const;
}
