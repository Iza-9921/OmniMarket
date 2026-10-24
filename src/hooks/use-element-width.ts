"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ancho real de un elemento. Las gráficas solo se dibujan con ancho > 0: Next
 * conserva ocultas las páginas visitadas y un contenedor oculto mide 0, lo que
 * haría que Recharts avisara en la consola.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
