"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  filtersFromParams,
  filtersToParams,
  updateFilters,
} from "@/lib/filters";
import type { z } from "@/lib/zod";

type Primitive = string | number | undefined;

/** Filtros de un listado guardados en la URL (?page=2&status=…). */
export function useUrlFilters<S extends z.ZodType<Record<string, Primitive>>>(
  schema: S,
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaults = useMemo(
    () => schema.parse({}) as Record<string, Primitive>,
    [schema],
  );
  const filters = useMemo(
    () =>
      filtersFromParams(schema, new URLSearchParams(searchParams.toString())),
    [schema, searchParams],
  );

  const setFilters = useCallback(
    (changes: Partial<z.output<S>>) => {
      // Si ya se navegó a otra página, esta vista (que Next conserva oculta) no
      // debe tocar la URL.
      if (window.location.pathname !== pathname) return;
      const next = updateFilters(filters as Record<string, Primitive>, changes);
      const query = filtersToParams(next, defaults);
      // history.replaceState (integrado con useSearchParams) cambia la URL sin
      // iniciar una navegación: no puede pisar un clic en curso y no pide nada
      // al servidor, porque los datos los carga TanStack Query desde la API.
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [filters, defaults, pathname],
  );

  return { filters, setFilters };
}
