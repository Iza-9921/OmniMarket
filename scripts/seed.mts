// Carga el conjunto de prueba en la base de datos de DATABASE_URL.
// Uso: npm run db:seed (en local lee .env.local).
import { closeDb, getDb } from "@/server/db/client";
import { resetDatabase } from "@/server/services/reset";

try {
  const result = await resetDatabase(getDb());
  console.log(
    `Seed ${result.seed} cargado en ${result.durationMs} ms:`,
    result.counts,
  );
} catch (error) {
  console.error("Error al cargar el seed:", error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
