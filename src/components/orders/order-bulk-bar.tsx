"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button, Select } from "@/components/ui/controls";
import { useBulkUpdateOrders } from "@/hooks/use-orders";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/domain";

/** Barra de cambio de estado en lote para pedidos. */
export function OrderBulkBar({
  ids,
  onDone,
}: {
  ids: string[];
  onDone: () => void;
}) {
  const uid = useId();
  const bulk = useBulkUpdateOrders();
  const [status, setStatus] = useState<OrderStatus | "">("");

  function apply() {
    if (!status) return;
    const count = ids.length;
    bulk.mutate(
      { ids, status },
      {
        onSuccess: ({ updated, unchanged }) => {
          toast.success(
            `${updated} ${updated === 1 ? "pedido movido" : "pedidos movidos"} a «${ORDER_STATUS_LABELS[status]}»` +
              (unchanged ? ` (${unchanged} ya lo estaban)` : ""),
          );
          setStatus("");
          onDone();
        },
        onError: (err) =>
          toast.error(
            `${err.message} Los cambios en ${count} pedidos se revirtieron.`,
          ),
      },
    );
  }

  return (
    <div
      role="region"
      aria-label="Acciones en lote"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm"
    >
      <span className="font-medium text-indigo-900" aria-live="polite">
        {ids.length} {ids.length === 1 ? "seleccionado" : "seleccionados"}
      </span>
      <label htmlFor={`${uid}-status`} className="sr-only">
        Nuevo estado
      </label>
      <Select
        id={`${uid}-status`}
        value={status}
        onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
        className="w-48"
      >
        <option value="">Cambiar estado a…</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <Button onClick={apply} disabled={!status || bulk.isPending}>
        {bulk.isPending ? "Aplicando…" : `Aplicar a ${ids.length}`}
      </Button>
      <Button variant="ghost" onClick={onDone} disabled={bulk.isPending}>
        Quitar selección
      </Button>
    </div>
  );
}
