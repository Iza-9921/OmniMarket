import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Aplica las migraciones a la base de datos de pruebas antes de la suite.
export default async function setup() {
  const connectionString =
    process.env.TEST_DATABASE_URL ??
    "postgres://localhost:5432/omnimarket_test";
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
