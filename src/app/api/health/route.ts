import { connection } from "next/server";

// Comprobación de disponibilidad para el despliegue y el CI.
// `connection()` evita que Cache Components lo prerenderice en el build.
export async function GET() {
  await connection();

  return Response.json(
    {
      status: "ok",
      service: "omnimarket-operations-hub",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
