"use client";

import { ErrorScreen, errorDigest } from "@/components/error-screen";
import { Button, ButtonLink } from "@/components/ui/controls";

// Error inesperado dentro de una pantalla privada: el encabezado y la
// navegación siguen disponibles y se puede reintentar sin recargar.
export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <ErrorScreen
      code="Algo salió mal"
      title="No pudimos mostrar esta pantalla"
      message="Ocurrió un error inesperado. Tus datos no se perdieron; vuelve a intentarlo o regresa al dashboard."
      digest={errorDigest(error)}
    >
      <Button onClick={() => retry()}>Reintentar</Button>
      <ButtonLink href="/dashboard" variant="secondary">
        Ir al dashboard
      </ButtonLink>
    </ErrorScreen>
  );
}
