// Mide la latencia de GET /api/test/analytics (objetivo < 300 ms, §3).
// Uso: node scripts/latency.mjs [baseUrl] [peticiones]
//   node scripts/latency.mjs https://omnimarket-psi.vercel.app 50
//
// Reporta dos tiempos por petición:
// - servidor: cabecera Server-Timing (tiempo de las consultas en el backend)
// - total: ida y vuelta medida desde esta máquina (incluye la red)

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const runs = Number(process.argv[3] ?? 50);
const url = `${baseUrl}/api/test/analytics?page=1&limit=50`;

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  ];
};
const round = (n) => Math.round(n * 10) / 10;

const server = [];
const total = [];
for (let i = 0; i < runs; i++) {
  const started = performance.now();
  const response = await fetch(url, { cache: "no-store" });
  await response.arrayBuffer();
  total.push(performance.now() - started);
  if (!response.ok)
    throw new Error(`HTTP ${response.status} en la petición ${i + 1}`);
  const match = /dur=([\d.]+)/.exec(
    response.headers.get("server-timing") ?? "",
  );
  if (match) server.push(Number(match[1]));
}

const report = (label, values) =>
  console.log(
    `${label.padEnd(9)} p50=${round(percentile(values, 50))} ms  p95=${round(percentile(values, 95))} ms  máx=${round(Math.max(...values))} ms`,
  );

console.log(`${runs} peticiones a ${url}`);
console.log(
  `primera   servidor=${round(server[0])} ms  total=${round(total[0])} ms`,
);
report("servidor", server);
report("total", total);
