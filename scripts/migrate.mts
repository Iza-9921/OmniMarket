// Aplica las migraciones de ./drizzle. En Vercel se ejecuta antes del build
// (vercel.json → buildCommand) con la conexión directa, sin pooler.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Falta DATABASE_URL_UNPOOLED o DATABASE_URL.");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 1 });

try {
  const started = performance.now();
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log(
    `Migraciones aplicadas en ${Math.round(performance.now() - started)} ms.`,
  );
} catch (error) {
  console.error("Error al aplicar las migraciones:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
