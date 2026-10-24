import { describe, expect, it } from "vitest";
import {
  analyticsQuerySchema,
  kanbanStatusQuerySchema,
  searchParamsToObject,
} from "@/lib/schemas/test-endpoints";

const parseQuery = (query: string) =>
  analyticsQuerySchema.safeParse(
    searchParamsToObject(new URLSearchParams(query)),
  );

describe("analyticsQuerySchema", () => {
  it("aplica page=1 y limit=50 por defecto", () => {
    const result = parseQuery("");
    expect(result.success && result.data).toEqual({ page: 1, limit: 50 });
  });

  it("convierte los parámetros de texto a números y acepta un rango de fechas", () => {
    const result = parseQuery("page=3&limit=20&from=2026-09-01&to=2026-09-30");
    expect(result.success && result.data).toEqual({
      page: 3,
      limit: 20,
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it.each([
    ["limit=101", "limit"],
    ["limit=0", "limit"],
    ["page=0", "page"],
    ["page=abc", "page"],
    ["limit=2.5", "limit"],
    ["from=2026-13-40", "from"],
    ["from=01-09-2026", "from"],
    ["from=2026-10-10&to=2026-10-01", "from"],
  ])("rechaza %s", (query, field) => {
    const result = parseQuery(query);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });

  it("ignora parámetros vacíos", () => {
    const result = parseQuery("page=&limit=");
    expect(result.success && result.data).toEqual({ page: 1, limit: 50 });
  });
});

describe("kanbanStatusQuerySchema", () => {
  it("acepta un código de pedido o la ausencia del parámetro", () => {
    expect(
      kanbanStatusQuerySchema.safeParse({ orderId: "ORD-0001" }).success,
    ).toBe(true);
    expect(kanbanStatusQuerySchema.safeParse({}).success).toBe(true);
  });

  it("rechaza identificadores con otro formato", () => {
    for (const orderId of [
      "1",
      "ord-0001",
      "ORD-1",
      "ORD-0001; drop table orders",
    ]) {
      expect(kanbanStatusQuerySchema.safeParse({ orderId }).success).toBe(
        false,
      );
    }
  });
});
