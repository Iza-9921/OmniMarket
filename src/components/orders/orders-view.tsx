"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/products/products-view";
import { Input } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCatalog, useOrderList, type OrderList } from "@/hooks/use-orders";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { OrderBulkBar } from "./order-bulk-bar";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/format";
import { orderListQuerySchema, type OrderListQuery } from "@/lib/schemas/lists";

type Row = OrderList["data"][number];

export function OrdersView() {
  const { filters, setFilters } = useUrlFilters(orderListQuerySchema);
  // La URL se actualiza al teclear (evento síncrono); solo la consulta a la API
  // espera 300 ms. Un temporizador nunca toca la URL, así que no puede pisar
  // un clic de navegación hecho mientras se escribía.
  const [search, setSearch] = useState(filters.q ?? "");
  const debouncedQ = useDebouncedValue(filters.q);
  const { data, isPending, isFetching, isError, refetch } = useOrderList({
    ...filters,
    q: debouncedQ,
  });
  const catalog = useCatalog();
  const selection = useRowSelection(
    JSON.stringify(filters),
    data?.data.map((row) => row.id) ?? [],
  );

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        header: "Pedido",
        accessorKey: "code",
        cell: (c) => (
          <Link
            href={`/orders/${c.row.original.id}`}
            className="font-mono text-xs font-medium text-slate-900 hover:text-indigo-600"
          >
            {c.row.original.code}
          </Link>
        ),
      },
      { header: "Cliente", accessorKey: "customerName" },
      {
        header: "Artículos",
        accessorKey: "itemsCount",
        cell: (c) => (
          <span className="tabular-nums">{c.row.original.itemsCount}</span>
        ),
      },
      {
        header: "Total",
        accessorKey: "totalCents",
        cell: (c) => (
          <span className="tabular-nums">
            {formatCurrency(c.row.original.totalCents)}
          </span>
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: (c) => <OrderStatusBadge status={c.row.original.status} />,
      },
      {
        header: "Fecha",
        accessorKey: "placedAt",
        cell: (c) => formatDate(c.row.original.placedAt),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <label htmlFor="order-search" className="sr-only">
            Buscar por código o cliente
          </label>
          <Input
            id="order-search"
            type="search"
            placeholder="Buscar por código o cliente"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setFilters({
                q: e.target.value.trim() || undefined,
              } as Partial<OrderListQuery>);
            }}
          />
        </div>
        <FilterSelect
          id="filter-order-status"
          label="Estado"
          value={filters.status}
          onChange={(v) =>
            setFilters({ status: (v || undefined) as OrderStatus | undefined })
          }
          options={ORDER_STATUSES.map((s) => [s, ORDER_STATUS_LABELS[s]])}
        />
        <FilterSelect
          id="filter-customer"
          label="Cliente"
          value={filters.customerId}
          onChange={(v) =>
            setFilters({ customerId: v ? Number(v) : undefined })
          }
          options={(catalog.data?.customers ?? []).map((c) => [
            String(c.id),
            c.name,
          ])}
        />
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <label htmlFor="filter-from">Desde</label>
          <Input
            id="filter-from"
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => setFilters({ from: e.target.value || undefined })}
            className="w-40"
          />
          <label htmlFor="filter-to">hasta</label>
          <Input
            id="filter-to"
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => setFilters({ to: e.target.value || undefined })}
            className="w-40"
          />
        </div>
      </div>

      {selection.selectedIds.length > 0 && (
        <OrderBulkBar ids={selection.selectedIds} onDone={selection.clear} />
      )}

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los pedidos.{" "}
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
          label="Pedidos"
          columns={columns}
          selection={{
            selected: selection.selected,
            onChange: selection.setSelected,
            rowLabel: (row) => row.code,
          }}
          data={data?.data ?? []}
          loading={isPending}
          fetching={isFetching}
          emptyMessage="No hay pedidos que coincidan con los filtros."
        />
      )}

      {data && (
        <Pagination
          {...data.pagination}
          onPageChange={(page) => setFilters({ page })}
          onLimitChange={(limit) => setFilters({ limit })}
        />
      )}
    </div>
  );
}
