"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button, Input, Select } from "@/components/ui/controls";
import { PRODUCT_STATUS_LABELS } from "@/components/ui/status-badge";
import { useCatalog } from "@/hooks/use-orders";
import { useBulkUpdateProducts } from "@/hooks/use-products";
import { productBulkSchema, type ProductBulkInput } from "@/lib/bulk";
import { PRODUCT_STATUSES } from "@/lib/domain";

type Action = "status" | "categoryId" | "priceAdjustPct" | "stock";

const ACTION_LABELS: Record<Action, string> = {
  status: "Cambiar estado",
  categoryId: "Cambiar categoría",
  priceAdjustPct: "Ajustar precio (%)",
  stock: "Fijar stock",
};

/** Barra de edición en lote (RF-50/51): aparece al seleccionar filas. */
export function ProductBulkBar({
  ids,
  onDone,
}: {
  ids: string[];
  onDone: () => void;
}) {
  const uid = useId();
  const catalog = useCatalog();
  const bulk = useBulkUpdateProducts();
  const [action, setAction] = useState<Action>("status");
  const [value, setValue] = useState("");

  const input: ProductBulkInput = { ids, changes: { [action]: value } };
  const parsed = value === "" ? null : productBulkSchema.safeParse(input);
  const error =
    parsed && !parsed.success ? parsed.error.issues[0]?.message : undefined;

  function apply() {
    if (!parsed?.success) return;
    const categoryName =
      action === "categoryId"
        ? catalog.data?.categories.find((c) => String(c.id) === value)?.name
        : undefined;
    const count = ids.length;
    bulk.mutate(
      { input, categoryName },
      {
        onSuccess: ({ updated }) => {
          toast.success(
            `${updated} ${updated === 1 ? "producto actualizado" : "productos actualizados"}`,
          );
          setValue("");
          onDone();
        },
        onError: (err) =>
          toast.error(
            `${err.message} Los cambios en ${count} productos se revirtieron.`,
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
      <label htmlFor={`${uid}-action`} className="sr-only">
        Acción en lote
      </label>
      <Select
        id={`${uid}-action`}
        value={action}
        onChange={(e) => {
          setAction(e.target.value as Action);
          setValue("");
        }}
        className="w-48"
      >
        {(Object.keys(ACTION_LABELS) as Action[]).map((key) => (
          <option key={key} value={key}>
            {ACTION_LABELS[key]}
          </option>
        ))}
      </Select>

      <label htmlFor={`${uid}-value`} className="sr-only">
        Nuevo valor
      </label>
      {action === "status" && (
        <Select
          id={`${uid}-value`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-40"
        >
          <option value="">Elige estado</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PRODUCT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      )}
      {action === "categoryId" && (
        <Select
          id={`${uid}-value`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-44"
        >
          <option value="">Elige categoría</option>
          {catalog.data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      )}
      {(action === "priceAdjustPct" || action === "stock") && (
        <Input
          id={`${uid}-value`}
          inputMode={action === "stock" ? "numeric" : "decimal"}
          placeholder={action === "stock" ? "Unidades" : "p. ej. 10 o -5"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          className="w-36"
        />
      )}

      <Button onClick={apply} disabled={!parsed?.success || bulk.isPending}>
        {bulk.isPending ? "Aplicando…" : `Aplicar a ${ids.length}`}
      </Button>
      <Button variant="ghost" onClick={onDone} disabled={bulk.isPending}>
        Quitar selección
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
