"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch, jsonBody } from "@/lib/api-client";
import { filtersToParams } from "@/lib/filters";
import { withoutRow } from "./use-products";
import type { OrderInput } from "@/lib/schemas/catalog";
import type { OrderListQuery } from "@/lib/schemas/lists";
import type {
  getOrder,
  listCustomers,
  listOrders,
} from "@/server/services/orders";
import type { listCategories } from "@/server/services/products";

export type OrderList = Awaited<ReturnType<typeof listOrders>>;
export type Order = Awaited<ReturnType<typeof getOrder>>;
export type Catalog = {
  categories: Awaited<ReturnType<typeof listCategories>>;
  customers: Awaited<ReturnType<typeof listCustomers>>;
};

export const orderKeys = {
  all: ["orders"] as const,
  list: (query: Partial<OrderListQuery>) => ["orders", "list", query] as const,
  detail: (id: string) => ["orders", "detail", id] as const,
};

export function useOrderList(query: Partial<OrderListQuery>) {
  return useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => apiFetch<OrderList>(`/api/orders?${filtersToParams(query)}`),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiFetch<Order>(`/api/orders/${id}`),
  });
}

/** Categorías y clientes: cambian poco, se cachean 5 minutos. */
export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: () => apiFetch<Catalog>("/api/catalog"),
    staleTime: 5 * 60_000,
  });
}

// Igual que en productos: se cancelan las consultas de listado en curso antes
// de cada cambio para que una respuesta vieja no lo sobrescriba.
const listKey = ["orders", "list"] as const;

export function useSaveOrder(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderInput) =>
      apiFetch<Order>(id ? `/api/orders/${id}` : "/api/orders", {
        method: id ? "PATCH" : "POST",
        body: jsonBody(input),
      }),
    onMutate: () => queryClient.cancelQueries({ queryKey: listKey }),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      return queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/orders/${id}`, { method: "DELETE" }),
    onMutate: () => queryClient.cancelQueries({ queryKey: listKey }),
    onSuccess: (_data, id) => {
      queryClient.setQueriesData<OrderList>({ queryKey: listKey }, (list) =>
        list ? withoutRow(list, id) : list,
      );
      // El detalle borrado sale de la caché (si se refrescara daría 404).
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["orders", "board"] });
      return queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}
