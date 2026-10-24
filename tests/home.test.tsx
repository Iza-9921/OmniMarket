import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

// Prueba de humo de F0: confirma que Vitest, jsdom, React y los alias `@/` funcionan.
describe("Home (F0)", () => {
  it("muestra el nombre del producto", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Operations Hub" }),
    ).toBeInTheDocument();
  });

  it("enlaza al endpoint de salud", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "/api/health" })).toHaveAttribute(
      "href",
      "/api/health",
    );
  });
});
