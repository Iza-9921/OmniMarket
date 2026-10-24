// Página provisional de F0: solo confirma que el despliegue funciona.
// Se reemplaza por /login y el dashboard en F2.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-24">
      <p className="text-sm font-medium tracking-wide text-indigo-600 uppercase">
        OmniMarket
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
        Operations Hub
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
        Dashboard de analítica y administración de e-commerce. El proyecto está
        en construcción: esta página confirma que la infraestructura base está
        desplegada.
      </p>
      <p className="mt-8 text-sm text-slate-500">
        Estado del servicio:{" "}
        <a
          href="/api/health"
          className="font-medium text-indigo-600 underline-offset-4 hover:underline"
        >
          /api/health
        </a>
      </p>
    </main>
  );
}
