"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, ButtonLink, Input, Select } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import {
  PRODUCT_STATUS_LABELS,
  ProductStatusBadge,
} from "@/components/ui/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCatalog } from "@/hooks/use-orders";
import {
  useDeleteProduct,
  useProductList,
  type ProductList,
} from "@/hooks/use-products";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  LOW_STOCK_MAX,
  productListQuerySchema,
  type ProductListQuery,
} from "@/lib/schemas/lists";

type Row = ProductList["data"][number];

function StockCell({ stock }: { stock: number }) {
  if (stock === 0)
    return <span className="font-medium text-red-600">Agotado</span>;
  if (stock <= LOW_STOCK_MAX)
    return <span className="font-medium text-amber-700">{stock} (bajo)</span>;
  return <span className="tabular-nums">{stock}</span>;
}

export function ProductsView() {
  const { filters, setFilters } = useUrlFilters(productListQuerySchema);
  const { data, isPending, isFetching, isError, refetch } =
    useProductList(filters);
  const catalog = useCatalog();
  const deleteProduct = useDeleteProduct();
  const [toDelete, setToDelete] = useState<Row | null>(null);

  // Búsqueda al escribir, con espera de 300 ms para no consultar en cada tecla.
  const [search, setSearch] = useState(filters.q ?? "");
  const debouncedSearch = useDebouncedValue(search);
  useEffect(() => {
    if ((debouncedSearch || undefined) !== filters.q) {
      setFilters({
        q: debouncedSearch || undefined,
      } as Partial<ProductListQuery>);
    }
  }, [debouncedSearch, filters.q, setFilters]);

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        header: "SKU",
        accessorKey: "sku",
        cell: (c) => (
          <span className="font-mono text-xs">{c.row.original.sku}</span>
        ),
      },
      {
        header: "Nombre",
        accessorKey: "name",
        cell: (c) => (
          <Link
            href={`/products/${c.row.original.id}`}
            className="font-medium text-slate-900 hover:text-indigo-600"
          >
            {c.row.original.name}
          </Link>
        ),
      },
      { header: "Categoría", accessorKey: "categoryName" },
      {
        header: "Precio",
        accessorKey: "priceCents",
        cell: (c) => (
          <span className="tabular-nums">
            {formatCurrency(c.row.original.priceCents)}
          </span>
        ),
      },
      {
        header: "Stock",
        accessorKey: "stock",
        cell: (c) => <StockCell stock={c.row.original.stock} />,
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: (c) => <ProductStatusBadge status={c.row.original.status} />,
      },
      {
        header: "Actualizado",
        accessorKey: "updatedAt",
        cell: (c) => formatDate(c.row.original.updatedAt),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => (
          <div className="flex justify-end gap-1">
            <ButtonLink
              variant="ghost"
              href={`/products/${c.row.original.id}`}
              className="px-2 py-1"
            >
              Editar
            </ButtonLink>
            {c.row.original.inUse ? (
              <span
                className="inline-flex cursor-not-allowed items-center rounded-lg px-2 py-1 text-sm font-medium text-slate-400"
                title="Aparece en pedidos: cámbialo a «Archivado» en lugar de eliminarlo"
              >
                Eliminar
                <span className="sr-only">
                  {" "}
                  (no disponible: {c.row.original.name} aparece en pedidos)
                </span>
              </span>
            ) : (
              <Button
                variant="ghost"
                className="px-2 py-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setToDelete(c.row.original)}
                aria-label={`Eliminar ${c.row.original.name}`}
              >
                Eliminar
              </Button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  function confirmDelete() {
    if (!toDelete) return;
    deleteProduct.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(`Producto «${toDelete.name}» eliminado`);
        setToDelete(null);
      },
      onError: (error) => {
        toast.error(error.message);
        setToDelete(null);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <label htmlFor="product-search" className="sr-only">
            Buscar por nombre o SKU
          </label>
          <Input
            id="product-search"
            type="search"
            placeholder="Buscar por nombre o SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          id="filter-category"
          label="Categoría"
          value={filters.categoryId}
          onChange={(v) =>
            setFilters({ categoryId: v ? Number(v) : undefined })
          }
          options={(catalog.data?.categories ?? []).map((c) => [
            String(c.id),
            c.name,
          ])}
        />
        <FilterSelect
          id="filter-status"
          label="Estado"
          value={filters.status}
          onChange={(v) =>
            setFilters({
              status: (v || undefined) as ProductStatus | undefined,
            })
          }
          options={PRODUCT_STATUSES.map((s) => [s, PRODUCT_STATUS_LABELS[s]])}
        />
        <FilterSelect
          id="filter-stock"
          label="Stock"
          value={filters.stock}
          onChange={(v) =>
            setFilters({ stock: (v || undefined) as ProductListQuery["stock"] })
          }
          options={[
            ["out", "Agotado"],
            ["low", `Bajo (1–${LOW_STOCK_MAX})`],
            ["in", "Disponible"],
          ]}
        />
        <div>
          <label htmlFor="sort" className="sr-only">
            Ordenar por
          </label>
          <Select
            id="sort"
            value={`${filters.sort}:${filters.dir}`}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split(":") as [
                ProductListQuery["sort"],
                ProductListQuery["dir"],
              ];
              setFilters({ sort, dir });
            }}
          >
            <option value="updated:desc">Más recientes</option>
            <option value="name:asc">Nombre (A–Z)</option>
            <option value="price:asc">Precio: menor a mayor</option>
            <option value="price:desc">Precio: mayor a menor</option>
            <option value="stock:asc">Stock: menor a mayor</option>
          </Select>
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los productos.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <DataTable
          label="Productos"
          columns={columns}
          data={data?.data ?? []}
          loading={isPending}
          fetching={isFetching}
          emptyMessage="No hay productos que coincidan con los filtros."
        />
      )}

      {data && (
        <Pagination
          {...data.pagination}
          onPageChange={(page) => setFilters({ page })}
          onLimitChange={(limit) => setFilters({ limit })}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar producto"
        description={`¿Seguro que quieres eliminar «${toDelete?.name ?? ""}»? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        pending={deleteProduct.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="w-full sm:w-44">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{label}: todos</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </Select>
    </div>
  );
}
