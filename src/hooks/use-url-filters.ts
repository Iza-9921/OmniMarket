"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
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
      const next = updateFilters(filters as Record<string, Primitive>, changes);
      const query = filtersToParams(next, defaults);
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [filters, defaults, pathname, router],
  );

  return { filters, setFilters };
}
