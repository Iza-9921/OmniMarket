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

export function useSaveProduct(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) =>
      apiFetch<Product>(id ? `/api/products/${id}` : "/api/products", {
        method: id ? "PATCH" : "POST",
        body: jsonBody(input),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/products/${id}`, { method: "DELETE" }),
    // El detalle borrado sale de la caché (si se refrescara daría 404) y solo se
    // refrescan los listados.
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });
}
