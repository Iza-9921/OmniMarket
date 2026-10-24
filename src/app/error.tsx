"use client";

import { ErrorScreen, errorDigest } from "@/components/error-screen";
import { Button, ButtonLink } from "@/components/ui/controls";

// Error inesperado en las páginas públicas (login y páginas legales).
export default function PublicError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <ErrorScreen
        code="Algo salió mal"
        title="No pudimos cargar esta página"
        message="Ocurrió un error inesperado. Vuelve a intentarlo en unos segundos."
        digest={errorDigest(error)}
      >
        <Button onClick={() => retry()}>Reintentar</Button>
        <ButtonLink href="/login" variant="secondary">
          Ir al inicio de sesión
        </ButtonLink>
      </ErrorScreen>
    </main>
  );
}
