"use client";

import { useEffect, useState } from "react";

/** Devuelve `value` cuando deja de cambiar durante `delay` ms (búsqueda al escribir). */
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
