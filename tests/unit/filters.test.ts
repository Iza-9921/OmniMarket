import { describe, expect, it } from "vitest";
import {
  filtersFromParams,
  filtersToParams,
  updateFilters,
} from "@/lib/filters";
import { canMutate } from "@/lib/permissions";
import { centsToInput, parseMoneyToCents } from "@/lib/money";
import {
  orderListQuerySchema,
  productListQuerySchema,
} from "@/lib/schemas/lists";

const params = (query: string) => new URLSearchParams(query);

describe("filtersFromParams (lógica de filtrado)", () => {
  it("lee los filtros válidos de la URL y aplica los valores por defecto", () => {
    expect(
      filtersFromParams(
        productListQuerySchema,
        params("q=audi&status=ACTIVE&stock=low&page=2"),
      ),
    ).toEqual({
      page: 2,
      limit: 20,
      q: "audi",
      status: "ACTIVE",
      stock: "low",
      sort: "updated",
      dir: "desc",
    });
  });

  it("descarta solo los parámetros inválidos, sin romper el listado", () => {
    const filters = filtersFromParams(
      productListQuerySchema,
      params("page=abc&status=VENDIDO&stock=out&limit=500"),
    );
    expect(filters).toMatchObject({ page: 1, limit: 20, stock: "out" });
    expect(filters.status).toBeUndefined();
  });

  it("ignora la búsqueda vacía o de solo espacios", () => {
    expect(
      filtersFromParams(productListQuerySchema, params("q=%20%20")).q,
    ).toBeUndefined();
  });

  it("descarta un rango de fechas invertido en pedidos", () => {
    const filters = filtersFromParams(
      orderListQuerySchema,
      params("status=SHIPPED&from=2026-10-10&to=2026-10-01"),
    );
    expect(filters.status).toBe("SHIPPED");
    expect(filters.from).toBeUndefined();
  });
});

describe("filtersToParams", () => {
  it("omite valores vacíos y los que coinciden con el valor por defecto", () => {
    const defaults = productListQuerySchema.parse({});
    expect(
      filtersToParams(
        { ...defaults, q: "", status: "DRAFT", categoryId: 3, page: 1 },
        defaults,
      ),
    ).toBe("status=DRAFT&categoryId=3");
  });

  it("ida y vuelta: lo que se escribe en la URL se vuelve a leer igual", () => {
    const defaults = orderListQuerySchema.parse({});
    const filters = {
      ...defaults,
      page: 3,
      status: "PENDING" as const,
      customerId: 7,
      from: "2026-09-01",
    };
    const back = filtersFromParams(
      orderListQuerySchema,
      params(filtersToParams(filters, defaults)),
    );
    expect(back).toEqual(filters);
  });
});

describe("updateFilters", () => {
  it("cambiar un filtro vuelve a la página 1", () => {
    expect(
      updateFilters(
        { page: 4, status: undefined as string | undefined },
        { status: "ACTIVE" },
      ),
    ).toEqual({
      page: 1,
      status: "ACTIVE",
    });
  });

  it("cambiar de página conserva los filtros", () => {
    expect(updateFilters({ page: 1, status: "ACTIVE" }, { page: 2 })).toEqual({
      page: 2,
      status: "ACTIVE",
    });
  });
});

describe("importes", () => {
  it("convierte texto a centavos y de vuelta sin errores de redondeo", () => {
    expect(parseMoneyToCents("199.99")).toBe(19999);
    expect(parseMoneyToCents("199.9")).toBe(19990);
    expect(parseMoneyToCents("0.1")).toBe(10);
    expect(parseMoneyToCents("1200")).toBe(120000);
    expect(centsToInput(19990)).toBe("199.90");
  });
});

describe("canMutate", () => {
  it("solo ADMIN y OPERATOR pueden modificar datos", () => {
    expect(canMutate("ADMIN")).toBe(true);
    expect(canMutate("OPERATOR")).toBe(true);
    expect(canMutate("VIEWER")).toBe(false);
    expect(canMutate(undefined)).toBe(false);
  });
});
