"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError, jsonBody } from "@/lib/api-client";
import type { OrderStatus } from "@/lib/domain";
import {
  confirmCard,
  moveCard,
  type KanbanBoard,
  type KanbanCard,
} from "@/lib/kanban";

export const boardKey = ["orders", "board"] as const;

export function useKanbanBoard() {
  return useQuery({
    queryKey: boardKey,
    queryFn: () => apiFetch<KanbanBoard>("/api/orders/board"),
  });
}

type Move = { card: KanbanCard; toStatus: OrderStatus };

/**
 * Persistencia optimista (RF-42/43): la tarjeta cambia de columna al instante;
 * si el servidor rechaza el cambio, el tablero vuelve exactamente al estado
 * anterior. El componente decide qué toast mostrar en cada caso.
 */
export function useMoveOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ card, toStatus }: Move) =>
      apiFetch<KanbanCard>(`/api/orders/${card.id}/status`, {
        method: "PATCH",
        body: jsonBody({ status: toStatus, version: card.version }),
      }),

    onMutate: async ({ card, toStatus }) => {
      // Evita que una recarga en curso sobrescriba el movimiento optimista.
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<KanbanBoard>(boardKey);
      if (previous) {
        queryClient.setQueryData(
          boardKey,
          moveCard(previous, card.id, toStatus),
        );
      }
      return { previous };
    },

    onError: (error, _move, context) => {
      if (context?.previous)
        queryClient.setQueryData(boardKey, context.previous);
      // Con un conflicto de versión el tablero local está desactualizado: se recarga.
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
        queryClient.invalidateQueries({ queryKey: boardKey });
      }
    },

    onSuccess: (saved) => {
      // La tarjeta recibe la nueva `version` para el siguiente movimiento.
      queryClient.setQueryData<KanbanBoard>(boardKey, (board) =>
        board ? confirmCard(board, saved) : board,
      );
      queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["orders", "detail", saved.id],
      });
    },
  });
}
