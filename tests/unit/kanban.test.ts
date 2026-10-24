import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/lib/domain";
import {
  confirmCard,
  findCard,
  moveCard,
  type KanbanBoard,
  type KanbanCard,
} from "@/lib/kanban";

const card = (code: string, status: OrderStatus, version = 1): KanbanCard => ({
  id: `id-${code}`,
  code,
  status,
  version,
  customerName: "Ana",
  totalCents: 10_000,
  itemsCount: 1,
  updatedAt: "2026-10-01T10:00:00.000Z",
});

function board(): KanbanBoard {
  return {
    PENDING: {
      total: 3,
      items: [card("ORD-0001", "PENDING"), card("ORD-0002", "PENDING")],
    },
    PROCESSING: { total: 1, items: [card("ORD-0003", "PROCESSING")] },
    SHIPPED: { total: 0, items: [] },
    DELIVERED: { total: 50, items: [card("ORD-0004", "DELIVERED")] },
    CANCELLED: { total: 0, items: [] },
  };
}

describe("moveCard (actualización optimista)", () => {
  it("mueve la tarjeta arriba de la columna destino y ajusta los totales", () => {
    const next = moveCard(
      board(),
      "id-ORD-0002",
      "SHIPPED",
      "2026-10-24T12:00:00.000Z",
    );
    expect(next.PENDING.items.map((c) => c.code)).toEqual(["ORD-0001"]);
    expect(next.PENDING.total).toBe(2);
    expect(next.SHIPPED.total).toBe(1);
    expect(next.SHIPPED.items[0]).toMatchObject({
      code: "ORD-0002",
      status: "SHIPPED",
      updatedAt: "2026-10-24T12:00:00.000Z",
    });
  });

  it("no modifica el tablero original: sirve para revertir exactamente", () => {
    const original = board();
    const snapshot = structuredClone(original);
    moveCard(original, "id-ORD-0001", "CANCELLED");
    expect(original).toEqual(snapshot);
  });

  it("no hace nada si la tarjeta ya está en esa columna o no existe", () => {
    const original = board();
    expect(moveCard(original, "id-ORD-0001", "PENDING")).toBe(original);
    expect(moveCard(original, "id-inexistente", "SHIPPED")).toBe(original);
  });

  it("los totales del tablero se conservan tras varios movimientos", () => {
    const sum = (b: KanbanBoard) =>
      Object.values(b).reduce((s, c) => s + c.total, 0);
    let b = board();
    const before = sum(b);
    b = moveCard(b, "id-ORD-0001", "PROCESSING");
    b = moveCard(b, "id-ORD-0004", "CANCELLED");
    b = moveCard(b, "id-ORD-0001", "DELIVERED");
    expect(sum(b)).toBe(before);
    expect(findCard(b, "id-ORD-0001")?.status).toBe("DELIVERED");
  });
});

describe("confirmCard", () => {
  it("sustituye la tarjeta por la versión confirmada por el servidor", () => {
    const moved = moveCard(board(), "id-ORD-0003", "SHIPPED");
    const confirmed = confirmCard(moved, card("ORD-0003", "SHIPPED", 2));
    expect(findCard(confirmed, "id-ORD-0003")?.version).toBe(2);
    expect(confirmed.SHIPPED.items).toHaveLength(1);
  });
});
