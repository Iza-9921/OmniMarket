"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch, jsonBody } from "@/lib/api-client";
import { filtersToParams } from "@/lib/filters";
import type { ProductInput } from "@/lib/schemas/catalog";
import type { ProductListQuery } from "@/lib/schemas/lists";
import type { getProduct, listProducts } from "@/server/services/products";

export type ProductList = Awaited<ReturnType<typeof listProducts>>;
export type Product = Awaited<ReturnType<typeof getProduct>>;

export const productKeys = {
  all: ["products"] as const,
  list: (query: Partial<ProductListQuery>) =>
    ["products", "list", query] as const,
  detail: (id: string) => ["products", "detail", id] as const,
};

/**
 * Listado paginado. En tablas conserva la página anterior mientras llega la
 * siguiente (`keepPrevious`); en un buscador eso mostraría resultados viejos.
 */
export function useProductList(
  query: Partial<ProductListQuery>,
  { keepPrevious = true, enabled = true } = {},
) {
  return useQuery({
    queryKey: productKeys.list(query),
    queryFn: () =>
      apiFetch<ProductList>(`/api/products?${filtersToParams(query)}`),
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    enabled,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => apiFetch<Product>(`/api/products/${id}`),
  });
}

// Las mutaciones cancelan primero las consultas de listado en curso: una
// respuesta que salió antes del cambio llegaría después con datos viejos
// (p. ej. mostraría un producto recién borrado). Al terminar se vuelve a consultar.
const listKey = ["products", "list"] as const;

export function useSaveProduct(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) =>
      apiFetch<Product>(id ? `/api/products/${id}` : "/api/products", {
        method: id ? "PATCH" : "POST",
        body: jsonBody(input),
      }),
    onMutate: () => queryClient.cancelQueries({ queryKey: listKey }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/products/${id}`, { method: "DELETE" }),
    onMutate: () => queryClient.cancelQueries({ queryKey: listKey }),
    onSuccess: (_data, id) => {
      // Se quita de los listados en caché al instante; el detalle borrado sale
      // de la caché (si se refrescara daría 404).
      queryClient.setQueriesData<ProductList>({ queryKey: listKey }, (list) =>
        list ? withoutRow(list, id) : list,
      );
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

/** Listado paginado sin la fila `id` (y con el total ajustado). */
export function withoutRow<
  L extends { data: { id: string }[]; pagination: { total: number } },
>(list: L, id: string): L {
  if (!list.data.some((row) => row.id === id)) return list;
  return {
    ...list,
    data: list.data.filter((row) => row.id !== id),
    pagination: { ...list.pagination, total: list.pagination.total - 1 },
  };
}
