"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Skeleton } from "./skeleton";

/**
 * Tabla con paginación del servidor (TanStack Table en modo manual).
 * Mientras llega la primera página muestra filas skeleton (§4).
 */
export function DataTable<T>({
  columns,
  data,
  loading,
  fetching = false,
  emptyMessage,
  label,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading: boolean;
  fetching?: boolean;
  emptyMessage: string;
  label: string;
}) {
  // TanStack Table v8 devuelve funciones que el React Compiler no puede memorizar:
  // este componente se renderiza sin esa optimización, con el mismo resultado.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
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
                colSpan={columns.length}
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
