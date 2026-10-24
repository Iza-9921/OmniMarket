"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef } from "react";
import { Skeleton } from "./skeleton";

export type { RowSelectionState };

/** Selección de filas (edición en lote). Las filas se identifican por su `id`. */
export type TableSelection<T> = {
  selected: RowSelectionState;
  onChange: (selected: RowSelectionState) => void;
  rowLabel: (row: T) => string;
};

function Checkbox({
  indeterminate = false,
  ...props
}: React.ComponentProps<"input"> & { indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-4 rounded border-slate-300 text-indigo-600 accent-indigo-600"
      {...props}
    />
  );
}

/**
 * Tabla con paginación del servidor (TanStack Table en modo manual).
 * Mientras llega la primera página muestra filas skeleton (§4).
 */
export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  fetching = false,
  emptyMessage,
  label,
  selection,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading: boolean;
  fetching?: boolean;
  emptyMessage: string;
  label: string;
  selection?: TableSelection<T>;
}) {
  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selection) return columns;
    const { rowLabel } = selection;
    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Seleccionar todas las filas de esta página"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Seleccionar ${rowLabel(row.original)}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      ...columns,
    ];
  }, [columns, selection]);

  // TanStack Table v8 devuelve funciones que el React Compiler no puede memorizar:
  // este componente se renderiza sin esa optimización, con el mismo resultado.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    getRowId: (row) => row.id,
    enableRowSelection: Boolean(selection),
    state: { rowSelection: selection?.selected ?? {} },
    onRowSelectionChange: (updater) => {
      if (!selection) return;
      selection.onChange(
        typeof updater === "function" ? updater(selection.selected) : updater,
      );
    },
  });

  // `relative`: contiene los textos sr-only (position: absolute) dentro del
  // scroll; si no, escapan del recorte y desbordan la página en celular.
  return (
    <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table
        aria-label={label}
        aria-busy={loading || fetching}
        className={`min-w-full divide-y divide-slate-200 text-sm transition-opacity ${
          fetching && !loading ? "opacity-60" : ""
        }`}
      >
        <thead className="bg-slate-50">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading
            ? Array.from({ length: 8 }, (_, i) => (
                <tr key={i} data-testid="row-skeleton">
                  {allColumns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  aria-selected={selection ? row.getIsSelected() : undefined}
                  className={
                    row.getIsSelected()
                      ? "bg-indigo-50/70"
                      : "hover:bg-slate-50"
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 whitespace-nowrap text-slate-700"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          {!loading && data.length === 0 && (
            <tr>
              <td
                colSpan={allColumns.length}
                className="px-4 py-12 text-center text-sm text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
