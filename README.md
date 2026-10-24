# OmniMarket · Operations Hub

Dashboard de analítica y administración de e-commerce construido con Next.js (App Router), TypeScript, Tailwind CSS y PostgreSQL.

**Producción:** <https://omnimarket-psi.vercel.app> · estado: <https://omnimarket-psi.vercel.app/api/health>

> **Estado:** Fase 1 (datos y endpoints de auditoría). La interfaz de negocio llega en las siguientes fases. El plan completo está en [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md).

## Endpoints de auditoría

| Endpoint                                       | Acceso                  | Qué hace                                                                                                   |
| ---------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET /api/test/analytics?page=1&limit=50`      | Público, solo lectura   | Métricas de ventas: resumen del periodo y detalle diario paginado. Opcional: `from` y `to` (`YYYY-MM-DD`). |
| `GET /api/test/kanban-status?orderId=ORD-0001` | Público, solo lectura   | Estado actual y último movimiento de un pedido. Sin `orderId`: número de pedidos por columna.              |
| `POST /api/test/reset-data`                    | Cabecera `x-test-token` | Restablece la base de datos al conjunto de prueba `omnimarket-v1`.                                         |

```bash
curl "https://omnimarket-psi.vercel.app/api/test/analytics?page=1&limit=50"
curl "https://omnimarket-psi.vercel.app/api/test/kanban-status?orderId=ORD-0001"
curl -X POST -H "x-test-token: <token>" https://omnimarket-psi.vercel.app/api/test/reset-data
```

- El token de `reset-data` no se publica en este repositorio: se entrega al evaluador en el documento de entrega del proyecto.
- Las respuestas incluyen la cabecera `Server-Timing` y `meta.durationMs` con el tiempo de las consultas en el servidor.
- `limit` admite de 1 a 100. Los parámetros inválidos responden `400` con el detalle del error.
- Importes en MXN. **Ingresos** = subtotales sin IVA de pedidos no cancelados; **ticket promedio** = ingresos / pedidos; **margen bruto** = ingresos − costo.

### Conjunto de prueba `omnimarket-v1`

Determinista: 8 categorías, 120 productos, 60 clientes y 1 500 pedidos repartidos en los 180 días anteriores al reset. Los importes, códigos y estados son siempre los mismos; solo las fechas se recalculan respecto al día del reset. Los pedidos ancla `ORD-0001`…`ORD-0010` tienen estado fijo: 3 pendientes, 2 en proceso, 2 enviados, 2 entregados y 1 cancelado.

## Requisitos

- Node.js 24.x y npm 11+
- PostgreSQL 17 (en macOS: `brew install postgresql@17 && brew services start postgresql@17`)

## Desarrollo local

```bash
npm install
createdb omnimarket_dev && createdb omnimarket_test
cp .env.example .env.local   # y rellena DATABASE_URL y TEST_ENDPOINTS_TOKEN
npm run db:migrate
npm run db:seed
npm run dev
```

La aplicación queda en <http://localhost:3000>.

## Scripts

| Comando                    | Qué hace                                                            |
| -------------------------- | ------------------------------------------------------------------- |
| `npm run dev`              | Servidor de desarrollo                                              |
| `npm run build`            | Build de producción                                                 |
| `npm run start`            | Sirve el build de producción                                        |
| `npm run lint`             | ESLint                                                              |
| `npm run typecheck`        | Genera los tipos de rutas y ejecuta `tsc --noEmit`                  |
| `npm run format:check`     | Comprueba el formato con Prettier (`npm run format` lo corrige)     |
| `npm run test`             | Pruebas unitarias (Vitest)                                          |
| `npm run test:integration` | Pruebas de integración contra PostgreSQL (`omnimarket_test`)        |
| `npm run test:e2e`         | Pruebas E2E (Playwright). Requiere `npm run build` antes            |
| `npm run db:generate`      | Genera una migración SQL a partir de `src/server/db/schema.ts`      |
| `npm run db:migrate`       | Aplica las migraciones pendientes                                   |
| `npm run db:seed`          | Carga el conjunto de prueba (borra los datos de negocio existentes) |

Para correr las E2E contra un despliegue ya publicado:

```bash
PLAYWRIGHT_BASE_URL=https://omnimarket-psi.vercel.app TEST_ENDPOINTS_TOKEN=<token> npm run test:e2e
```

La primera vez hay que instalar el navegador de Playwright con `npx playwright install chromium`.

## Arquitectura

```
src/app/api/**      Route Handlers (HTTP: validación con Zod y respuestas)
src/server/services Lógica de negocio y consultas
src/server/db       Esquema Drizzle, cliente PostgreSQL y generador del seed
src/lib             Funciones puras compartidas: métricas, formatos, esquemas Zod
drizzle/            Migraciones SQL versionadas
```

## CI/CD

El pipeline está en [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **quality**: lint, typecheck, formato y pruebas unitarias.
2. **integration**: pruebas de integración contra un PostgreSQL efímero.
3. **e2e**: migraciones, seed, build de producción y pruebas E2E con Playwright.
4. **deploy**: solo en `push` a `main` y solo si los tres jobs anteriores pasan. Vercel compila el proyecto, aplica las migraciones antes del build (`vercel.json`) y el job comprueba `/api/health` y `/api/test/analytics`.

El despliegue automático de Vercel desde Git está desactivado en [`vercel.json`](vercel.json), así que **un test fallido impide desplegar a producción**.

### Secretos y variables

GitHub (_Settings → Secrets and variables → Actions_): `VERCEL_TOKEN`, `VERCEL_ORG_ID` (Team ID) y `VERCEL_PROJECT_ID`.

Vercel (_Project → Settings → Environment Variables_): `DATABASE_URL` y `DATABASE_URL_UNPOOLED` (integración de Neon) y `TEST_ENDPOINTS_TOKEN`.
