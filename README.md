# OmniMarket · Operations Hub

Dashboard de analítica y administración de e-commerce construido con Next.js (App Router), TypeScript y Tailwind CSS.

**Producción:** <https://omnimarket-psi.vercel.app> · estado: <https://omnimarket-psi.vercel.app/api/health>

> **Estado:** Fase 0 (infraestructura base). Las funciones de negocio todavía no están implementadas. El plan completo está en [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md).

## Requisitos

- Node.js 24.x
- npm 11+

## Desarrollo local

```bash
npm install
npm run dev
```

La aplicación queda en <http://localhost:3000> y el endpoint de salud en <http://localhost:3000/api/health>.

## Scripts

| Comando                | Qué hace                                                        |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                                          |
| `npm run build`        | Build de producción                                             |
| `npm run start`        | Sirve el build de producción                                    |
| `npm run lint`         | ESLint                                                          |
| `npm run typecheck`    | Genera los tipos de rutas y ejecuta `tsc --noEmit`              |
| `npm run format:check` | Comprueba el formato con Prettier (`npm run format` lo corrige) |
| `npm run test`         | Pruebas unitarias e integración (Vitest)                        |
| `npm run test:e2e`     | Pruebas E2E (Playwright). Requiere `npm run build` antes        |

Para correr las E2E contra un despliegue ya publicado:

```bash
PLAYWRIGHT_BASE_URL=https://tu-dominio.vercel.app npm run test:e2e
```

La primera vez hay que instalar el navegador de Playwright con `npx playwright install chromium`.

## CI/CD

El pipeline está en [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **quality**: lint, typecheck, formato y pruebas unitarias.
2. **e2e**: build de producción y pruebas E2E con Playwright.
3. **deploy**: solo en `push` a `main` y solo si los dos jobs anteriores pasan. Despliega en Vercel con la CLI y comprueba `/api/health`.

El despliegue automático de Vercel desde Git está desactivado en [`vercel.json`](vercel.json), así que **un test fallido impide desplegar a producción**.

### Secretos necesarios en GitHub

En _Settings → Secrets and variables → Actions_ del repositorio:

| Secreto             | De dónde sale                                                         |
| ------------------- | --------------------------------------------------------------------- |
| `VERCEL_TOKEN`      | Vercel → Account Settings → Tokens                                    |
| `VERCEL_ORG_ID`     | `.vercel/project.json` tras ejecutar `vercel link`, campo `orgId`     |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` tras ejecutar `vercel link`, campo `projectId` |
