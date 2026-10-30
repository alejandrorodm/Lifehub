import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CategoryBadge } from "./CategoryIcon";
import type { CategoryIcon } from "@shared/schemas/finance";

describe("CategoryBadge", () => {
  it("falls back to a colour dot for an unknown icon key (e.g. from a hand-edited backup)", () => {
    const { container } = render(<CategoryBadge icon={"no-existe" as CategoryIcon} colorSlot={2} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.firstChild).toBeInstanceOf(HTMLSpanElement);
  });

  it("renders the lucide icon for a known key", () => {
    const { container } = render(<CategoryBadge icon="coffee" colorSlot={2} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
