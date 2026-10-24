// Auditoría de consola y skeletons (RF-73, RF-12/RF-70).
// Uso: AUTH_SECRET=… node --import tsx scripts/audit.mts [baseUrl]
//
// Recorre cada pantalla con y sin sesión y registra TODOS los mensajes de
// consola (no solo errores, que ya vigila el E2E). Después repite las pantallas
// con datos en una red 3G lenta simulada y comprueba que se ve un skeleton
// (`aria-busy="true"`) antes que el contenido.
import { chromium, type Page } from "@playwright/test";
import { sessionCookie } from "../e2e/session";

const baseUrl = process.argv[2] ?? "http://localhost:3000";

const PUBLIC = ["/login", "/privacidad", "/terminos"];
const PRIVATE = [
  "/dashboard",
  "/products",
  "/products/new",
  "/orders",
  "/orders/new",
  "/kanban",
];
// Texto que aparece cuando ya cargaron los datos de cada pantalla.
const READY: Record<string, string> = {
  "/dashboard": "Ticket promedio",
  "/products": "Mostrando",
  "/orders": "Mostrando",
  "/kanban": "ORD-0001",
};

const browser = await chromium.launch();
const messages: string[] = [];
let failures = 0;

function watch(page: Page, path: () => string) {
  page.on("console", (m) =>
    messages.push(`${path()} [${m.type()}] ${m.text()}`),
  );
  page.on("pageerror", (e) =>
    messages.push(`${path()} [pageerror] ${e.message}`),
  );
}

async function visit(page: Page, path: string) {
  const response = await page.goto(baseUrl + path, {
    waitUntil: "networkidle",
  });
  const ok = response?.ok() ?? false;
  if (!ok) failures++;
  console.log(`${ok ? "ok " : "ERR"} ${response?.status()} ${path}`);
}

// 1. Consola en todas las pantallas.
for (const signedIn of [false, true]) {
  const context = await browser.newContext();
  if (signedIn) await context.addCookies([await sessionCookie(baseUrl)]);
  const page = await context.newPage();
  let current = "";
  watch(page, () => current);
  for (const path of signedIn ? PRIVATE : PUBLIC) {
    current = path;
    await visit(page, path);
  }
  if (signedIn) {
    // Pantallas de detalle con un id real.
    for (const [list, prefix] of [
      ["/api/products?limit=1", "/products/"],
      ["/api/orders?limit=1", "/orders/"],
    ]) {
      const { data } = await (await page.request.get(baseUrl + list)).json();
      current = prefix + data[0].id;
      await visit(page, current);
    }
  }
  await context.close();
}

console.log(`\nMensajes de consola: ${messages.length}`);
for (const m of messages) console.log(`  ${m}`);

// 2. Skeletons con red 3G lenta (≈ 400 kbit/s, 400 ms de latencia). Cada
// pantalla en un contexto nuevo: caché vacía, como la primera visita.
console.log("\nSkeletons con red 3G lenta (caché vacía):");
for (const [path, ready] of Object.entries(READY)) {
  const context = await browser.newContext();
  await context.addCookies([await sessionCookie(baseUrl)]);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });
  const started = Date.now();
  await page.goto(baseUrl + path, { waitUntil: "commit" });
  const skeleton = await page
    .locator('[aria-busy="true"]')
    .first()
    .waitFor({ timeout: 30_000 })
    .then(() => Date.now() - started)
    .catch(() => null);
  await page.getByText(ready).first().waitFor({ timeout: 90_000 });
  const content = Date.now() - started;
  if (skeleton === null) failures++;
  console.log(
    `  ${skeleton === null ? "SIN SKELETON" : "ok"}  ${path}: skeleton a los ${skeleton ?? "–"} ms, datos a los ${content} ms`,
  );
  await context.close();
}
await browser.close();

if (messages.length || failures) process.exitCode = 1;
