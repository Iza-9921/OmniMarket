// Pantalla común de las páginas de error (404, error de la app y error global).
// Sin hooks: la usan tanto componentes de servidor como de cliente.
export function ErrorScreen({
  code,
  title,
  message,
  digest,
  children,
}: {
  code: string;
  title: string;
  message: string;
  /** Identificador del error en los logs del servidor (Next lo da en producción). */
  digest?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold text-indigo-600">{code}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      {digest && (
        <p className="mt-6 font-mono text-xs text-slate-400">
          Referencia: {digest}
        </p>
      )}
    </div>
  );
}

/** En producción, Next sustituye el mensaje de los errores del servidor por este id. */
export function errorDigest(error: unknown) {
  return error instanceof Error && "digest" in error
    ? String(error.digest)
    : undefined;
}
