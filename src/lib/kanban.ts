import { ORDER_STATUSES, type OrderStatus } from "./domain";

// Estado del tablero Kanban y movimientos puros (sin red ni React), para que la
// actualización optimista y su reversión se puedan probar de forma aislada.

export type KanbanCard = {
  id: string;
  code: string;
  status: OrderStatus;
  version: number;
  customerName: string;
  totalCents: number;
  itemsCount: number;
  updatedAt: string;
};

export type KanbanColumn = { total: number; items: KanbanCard[] };
export type KanbanBoard = Record<OrderStatus, KanbanColumn>;

export const KANBAN_COLUMN_LIMIT = 30;

export function findCard(board: KanbanBoard, cardId: string) {
  for (const status of ORDER_STATUSES) {
    const card = board[status].items.find((item) => item.id === cardId);
    if (card) return card;
  }
  return undefined;
}

/**
 * Mueve una tarjeta a otra columna (arriba del todo, como el cambio más reciente)
 * y ajusta los totales. Devuelve un tablero nuevo; el original no se modifica,
 * así que sirve como copia para revertir. Sin cambios si ya está en esa columna.
 */
export function moveCard(
  board: KanbanBoard,
  cardId: string,
  toStatus: OrderStatus,
  updatedAt = new Date().toISOString(),
): KanbanBoard {
  const card = findCard(board, cardId);
  if (!card || card.status === toStatus) return board;

  const from = board[card.status];
  const to = board[toStatus];
  return {
    ...board,
    [card.status]: {
      total: from.total - 1,
      items: from.items.filter((item) => item.id !== cardId),
    },
    [toStatus]: {
      total: to.total + 1,
      items: [{ ...card, status: toStatus, updatedAt }, ...to.items],
    },
  };
}

/** Sustituye una tarjeta por la versión confirmada por el servidor (nueva `version`). */
export function confirmCard(
  board: KanbanBoard,
  saved: KanbanCard,
): KanbanBoard {
  const column = board[saved.status];
  return {
    ...board,
    [saved.status]: {
      ...column,
      items: column.items.map((item) => (item.id === saved.id ? saved : item)),
    },
  };
}
