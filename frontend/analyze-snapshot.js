// Bundle audit for the Next.js 16 Turbopack build:
//  1) per-route CLIENT first-load JS — script/modulepreload chunk refs from
//     the prerendered HTML, sized from the files on disk (raw + gzip)
//  2) shared baseline vs route-specific delta
//  3) client-side composition by package, from `next analyze export` parts
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const gzipCache = new Map();
function sizes(file) {
  if (gzipCache.has(file)) return gzipCache.get(file);
  let raw = 0;
  let gz = 0;
  try {
    const buf = fs.readFileSync(file);
    raw = buf.length;
    gz = zlib.gzipSync(buf).length;
  } catch {
    /* missing */
  }
  const out = { raw, gz };
  gzipCache.set(file, out);
  return out;
}

// --- 1) per-route first-load from HTML --------------------------------------
const appDir = path.join(".next", "server", "app");
const routeChunks = new Map(); // route -> Map(file -> true)

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) {
      const rel = path.relative(appDir, full).replace(/\\/g, "/");
      const route =
        rel === "index.html"
          ? "/"
          : "/" + rel.replace(/\.html$/, "").replace(/\/index$/, "");
      const html = fs.readFileSync(full, "utf8");
      const refs = new Set(
        [...html.matchAll(/\/_next\/static\/chunks\/[^"'\s\\]+\.js/g)].map(
          (m) => m[0],
        ),
      );
      routeChunks.set(route, refs);
    }
  }
}
walk(appDir);

const rows = [];
for (const [route, refs] of routeChunks) {
  let raw = 0;
  let gz = 0;
  for (const ref of refs) {
    const file = path.join(".next", ref.replace(/^\/_next\//, ""));
    const s = sizes(file);
    raw += s.raw;
    gz += s.gz;
  }
  rows.push({ route, files: refs.size, raw, gz, refs });
}
rows.sort((a, b) => b.gz - a.gz);

// shared baseline = chunks referenced by EVERY real app route (skip error pages)
const real = rows.filter(
  (r) => !r.route.includes("_not-found") && !r.route.includes("_global-error"),
);
let shared = null;
for (const r of real) {
  shared = shared === null ? new Set(r.refs) : new Set([...shared].filter((f) => r.refs.has(f)));
}
let sharedRaw = 0;
let sharedGz = 0;
for (const f of shared || []) {
  const s = sizes(path.join(".next", f.replace(/^\/_next\//, "")));
  sharedRaw += s.raw;
  sharedGz += s.gz;
}

console.log("=== Client first-load JS per route ===");
console.log(`shared baseline (every route): ${sharedGz} gz / ${sharedRaw} raw  (${shared.size} chunks)`);
for (const r of rows) {
  const delta = r.gz - sharedGz;
  console.log(
    `${String(r.gz).padStart(7)} gz  ${String(r.raw).padStart(7)} raw  ` +
      `${String(r.files).padStart(2)} files  +${String(delta).padStart(6)} over shared  ${r.route}`,
  );
}

// --- 3) composition from analyze parts --------------------------------------
const lines = fs
  .readFileSync("bundle-graph.jsonl", "utf8")
  .split("\n")
  .filter((l) => l.trim());
const clientParts = new Map(); // dedupe key -> {source, gz}
for (const line of lines) {
  let rec;
  try {
    rec = JSON.parse(line);
  } catch {
    continue;
  }
  if (rec.type === "part" && String(rec.filename).includes("static/chunks")) {
    const key = rec.filename + "|" + rec.source_path;
    if (!clientParts.has(key)) {
      clientParts.set(key, { source: rec.source_path, gz: rec.compressed_size || 0 });
    }
  }
}

function pkgOf(source) {
  const m = source.match(/node_modules\/((?:@[^/\s]+\/)?[^/\s[(]+)/);
  if (m) return m[1];
  if (source.startsWith("[project]/")) {
    return source.replace(/^\[project\]\//, "").split("/")[0];
  }
  return source.split("/")[0];
}

const byPkg = new Map();
for (const { source, gz } of clientParts.values()) {
  const pkg = pkgOf(source);
  byPkg.set(pkg, (byPkg.get(pkg) || 0) + gz);
}
const top = [...byPkg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
console.log("\n=== Client JS by package (gzip, deduped across routes) ===");
for (const [pkg, gz] of top) {
  console.log(`${String(gz).padStart(7)} gz  ${pkg}`);
}

// --- top individual client source modules (app code) ------------------------
const bySource = new Map();
for (const { source, gz } of clientParts.values()) {
  if (!source.includes("node_modules")) {
    bySource.set(source, (bySource.get(source) || 0) + gz);
  }
}
const topSrc = [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
console.log("\n=== Largest first-party client modules (gzip) ===");
for (const [src, gz] of topSrc) {
  console.log(`${String(gz).padStart(7)} gz  ${src.replace("[project]/", "")}`);
}
