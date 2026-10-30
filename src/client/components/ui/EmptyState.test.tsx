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

  it("con vista previa, la maqueta queda oculta a lectores de pantalla y no es interactiva", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Sin elementos"
        action={<button>Crear</button>}
        preview={<button>Botón de ejemplo</button>}
      />,
    );

    // La maqueta no se expone: solo el botón real es accesible.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
    const preview = screen.getByTestId("empty-state-preview");
    expect(preview).toHaveAttribute("aria-hidden", "true");
    expect(preview).toHaveAttribute("inert");
  });
});
