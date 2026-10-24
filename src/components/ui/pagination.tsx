import { useId } from "react";
import { Button, Select } from "./controls";

const PAGE_SIZES = [10, 20, 50, 100];

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const sizeId = useId();
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <p aria-live="polite">
        Mostrando{" "}
        <span className="font-medium text-slate-900">
          {from}–{to}
        </span>{" "}
        de <span className="font-medium text-slate-900">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={sizeId} className="text-slate-500">
          Por página
        </label>
        <Select
          id={sizeId}
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="w-20"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </Button>
        <span className="px-1 tabular-nums">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
