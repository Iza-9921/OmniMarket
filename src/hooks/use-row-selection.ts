"use client";

import { useState } from "react";
import type { RowSelectionState } from "@/components/ui/data-table";

/**
 * Selección de filas ligada a los filtros actuales: al cambiar de filtro o de
 * página se vacía sola, para no aplicar un cambio en lote a filas que ya no se
 * ven. Solo cuentan las filas visibles en la página.
 */
export function useRowSelection(filtersKey: string, visibleIds: string[]) {
  const [state, setState] = useState<{ key: string; rows: RowSelectionState }>({
    key: filtersKey,
    rows: {},
  });
  const selected = state.key === filtersKey ? state.rows : {};
  const visible = new Set(visibleIds);
  const selectedIds = Object.keys(selected).filter(
    (id) => selected[id] && visible.has(id),
  );

  return {
    selected,
    selectedIds,
    setSelected: (rows: RowSelectionState) =>
      setState({ key: filtersKey, rows }),
    clear: () => setState({ key: filtersKey, rows: {} }),
  };
}
