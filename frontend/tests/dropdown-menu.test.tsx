import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDropdownMenu } from "@/hooks/use-dropdown-menu";

function TestDropdown({
  label,
  onSelect = () => {},
}: {
  label: string;
  onSelect?: () => void;
}) {
  const dropdown = useDropdownMenu<HTMLDivElement>();

  return (
    <div ref={dropdown.containerRef}>
      <button
        aria-expanded={dropdown.isOpen}
        aria-haspopup="menu"
        onClick={dropdown.toggle}
        ref={dropdown.triggerRef}
        type="button"
      >
        {label}
      </button>
      {dropdown.isOpen ? (
        <div onClickCapture={dropdown.onMenuClickCapture} role="menu">
          <button onClick={onSelect} role="menuitem" type="button">
            Select {label}
          </button>
          <button aria-checked="false" role="menuitemcheckbox" type="button">
            Keep {label} open
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DropdownHarness({ onSelect }: { onSelect?: () => void }) {
  return (
    <div>
      <TestDropdown label="First menu" onSelect={onSelect} />
      <TestDropdown label="Second menu" />
      <button type="button">Outside target</button>
    </div>
  );
}

describe("useDropdownMenu", () => {
  it("opens from its trigger and closes immediately after single selection", () => {
    const onSelect = vi.fn();
    render(<DropdownHarness onSelect={onSelect} />);

    const trigger = screen.getByRole("button", { name: "First menu" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("menuitem", { name: "Select First menu" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when a pointer event occurs outside its container", () => {
    render(<DropdownHarness />);

    fireEvent.click(screen.getByRole("button", { name: "First menu" }));
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Outside target" }),
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape and restores focus to its trigger", () => {
    render(<DropdownHarness />);

    const trigger = screen.getByRole("button", { name: "First menu" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes the current dropdown before opening another dropdown", () => {
    render(<DropdownHarness />);

    const firstTrigger = screen.getByRole("button", { name: "First menu" });
    const secondTrigger = screen.getByRole("button", { name: "Second menu" });
    fireEvent.click(firstTrigger);
    fireEvent.click(secondTrigger);

    expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("menu")).toHaveLength(1);
    expect(
      screen.getByRole("menuitem", { name: "Select Second menu" }),
    ).toBeInTheDocument();
  });

  it("keeps a multi-select menu open while checkbox items are toggled", () => {
    render(<DropdownHarness />);

    fireEvent.click(screen.getByRole("button", { name: "First menu" }));
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Keep First menu open" }),
    );

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
