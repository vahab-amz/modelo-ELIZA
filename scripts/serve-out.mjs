#!/usr/bin/env node
/**
 * Servidor estático mínimo para la carpeta `out/` (sin dependencias: solo Node).
 * Plan B para clase: funciona sin Internet.
 *
 *   npm run serve              → http://localhost:3000
 *   npm run serve -- --lan     → también accesible desde otros dispositivos de la red
 *   PORT=8080 npm run serve    → otro puerto
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const root = resolve(fileURLToPath(new URL("../out", import.meta.url)));
const lan = process.argv.includes("--lan");
const host = lan ? "0.0.0.0" : "127.0.0.1";
const port = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

if (!existsSync(join(root, "index.html"))) {
  console.error("No existe out/index.html. Ejecuta antes:  npm run build");
  process.exit(1);
}

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0] ?? "/"));
  const base = join(root, clean);
  if (base !== root && !base.startsWith(root + sep)) return null; // evita salir de out/
  for (const candidate of [base, base + ".html", join(base, "index.html")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".txt", ".svg"]);
const cache = new Map();

/** Comprime (Brotli o gzip) una sola vez por fichero y lo guarda en memoria. */
function body(file, acceptEncoding) {
  const encoding = !COMPRESSIBLE.has(extname(file))
    ? null
    : /\bbr\b/.test(acceptEncoding)
      ? "br"
      : /\bgzip\b/.test(acceptEncoding)
        ? "gzip"
        : null;
  // La fecha de modificación entra en la clave: tras un `npm run build` no se sirve nada caducado.
  const key = `${encoding}:${file}:${statSync(file).mtimeMs}`;
  if (!cache.has(key)) {
    const raw = readFileSync(file);
    const data =
      encoding === "br"
        ? brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } })
        : encoding === "gzip"
          ? gzipSync(raw, { level: 9 })
          : raw;
    cache.set(key, data);
  }
  return { data: cache.get(key), encoding };
}

const server = createServer((req, res) => {
  let file = null;
  try {
    file = resolveFile(req.url ?? "/");
  } catch {
    file = null;
  }
  const status = file ? 200 : 404;
  file ??= join(root, "404.html");
  const immutable = file.includes(`${sep}_next${sep}static${sep}`);
  const { data, encoding } = body(file, String(req.headers["accept-encoding"] ?? ""));
  res.writeHead(status, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Content-Length": data.length,
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    Vary: "Accept-Encoding",
    ...(encoding && { "Content-Encoding": encoding }),
  });
  res.end(req.method === "HEAD" ? undefined : data);
});

server.listen(port, host, () => {
  console.log(`\n  ELIZA sirviéndose desde out/ (sin conexión)\n`);
  console.log(`  → http://localhost:${port}`);
  if (lan) {
    for (const nets of Object.values(networkInterfaces())) {
      for (const net of nets ?? []) {
        if (net.family === "IPv4" && !net.internal) console.log(`  → http://${net.address}:${port}`);
      }
    }
  }
  console.log("\n  Ctrl+C para parar.\n");
});
