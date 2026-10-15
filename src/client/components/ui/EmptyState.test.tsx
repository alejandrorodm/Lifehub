import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("muestra el título y la descripción", () => {
    render(<EmptyState icon={Inbox} title="Sin elementos" description="Todavía no hay nada aquí." />);

    expect(screen.getByText("Sin elementos")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay nada aquí.")).toBeInTheDocument();
  });

  it("renderiza la acción cuando se proporciona", () => {
    render(<EmptyState icon={Inbox} title="Sin elementos" action={<button>Crear</button>} />);

    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
  });
});
