"use client";

import "./globals.css";
import { ErrorScreen, errorDigest } from "@/components/error-screen";

// Último recurso: falla el layout raíz. Reemplaza todo el documento, por eso
// define <html> y <body> e importa los estilos globales.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="es-MX" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900">
        <title>Error · OmniMarket</title>
        <main className="flex flex-1 flex-col">
          <ErrorScreen
            code="Algo salió mal"
            title="OmniMarket no está disponible en este momento"
            message="Ocurrió un error inesperado al cargar la aplicación. Vuelve a intentarlo en unos segundos."
            digest={errorDigest(error)}
          >
            <button
              type="button"
              onClick={() => retry()}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Reintentar
            </button>
          </ErrorScreen>
        </main>
      </body>
    </html>
  );
}
