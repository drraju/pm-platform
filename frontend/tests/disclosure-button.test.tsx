import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DisclosureButton } from "@/components/ui/disclosure-button";

describe("DisclosureButton", () => {
  it("renders the shared disclosure chevrons", () => {
    render(
      <DisclosureButton
        expanded={false}
        label="Integrations"
        onClick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Expand Integrations" }),
    ).toHaveTextContent("▸");
  });

  it("does not bubble clicks to a parent row action", () => {
    const parentClick = vi.fn();
    const disclosureClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <DisclosureButton
          expanded
          label="Integrations"
          onClick={disclosureClick}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse Integrations" }));

    expect(disclosureClick).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
