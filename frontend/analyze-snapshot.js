// Summarize bundle-graph.jsonl:
//  1) per-route CLIENT first-load JS (bootstrap group outputs, raw + gzip,
//     measured from the files on disk)
//  2) top client-side source modules by compressed size (deduped across routes)
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const lines = fs
  .readFileSync("bundle-graph.jsonl", "utf8")
  .split("\n")
  .filter((l) => l.trim());

const groupsByRoute = new Map(); // route -> Set(output)
const clientParts = new Map(); // dedupe key -> {source, gz}
const gzipCache = new Map();

function gzipSize(file) {
  if (gzipCache.has(file)) return gzipCache.get(file);
  let gz = 0;
  try {
    gz = zlib.gzipSync(fs.readFileSync(file)).length;
  } catch {
    gz = 0;
  }
  gzipCache.set(file, gz);
  return gz;
}

function diskPath(output) {
  // "[client-fs]/_next/static/chunks/x.js" -> ".next/static/chunks/x.js"
  const rel = output.replace(/^\[client-fs\]\/_next\//, "");
  return path.join(".next", rel);
}

for (const line of lines) {
  let rec;
  try {
    rec = JSON.parse(line);
  } catch {
    continue;
  }

  if (rec.type === "group") {
    if (!groupsByRoute.has(rec.route)) groupsByRoute.set(rec.route, new Set());
    for (const out of rec.outputs || []) {
      if (out.includes("static/chunks")) groupsByRoute.get(rec.route).add(out);
    }
  } else if (rec.type === "part" && String(rec.filename).includes("static/chunks")) {
    const key = rec.filename + "|" + rec.source_path;
    if (!clientParts.has(key)) {
      clientParts.set(key, {
        source: rec.source_path,
        gz: rec.compressed_size || 0,
      });
    }
  }
}

// --- 1) per-route first-load ------------------------------------------------
const rows = [];
for (const [route, outputs] of groupsByRoute) {
  let raw = 0;
  let gz = 0;
  for (const out of outputs) {
    const file = diskPath(out);
    try {
      raw += fs.statSync(file).size;
    } catch {
      /* missing file: skip */
    }
    gz += gzipSize(file);
  }
  rows.push({ route, files: outputs.size, raw, gz });
}
rows.sort((a, b) => b.gz - a.gz);

console.log("=== Client first-load JS per route (gzip) ===");
for (const r of rows) {
  console.log(
    `${String(r.gz).padStart(7)} gz  ${String(r.raw).padStart(7)} raw  ` +
      `${String(r.files).padStart(2)} files  ${r.route}`,
  );
}

// --- 2) composition ---------------------------------------------------------
function pkgOf(source) {
  const m = source.match(
    /node_modules\/((?:@[^/]+\/)?[^/]+)|\[project\]\/([^/\s[(]+)/,
  );
  if (m) return m[1] || m[2];
  return source.replace(/^\[project\]\//, "").split("/")[0];
}

const byPkg = new Map();
for (const { source, gz } of clientParts.values()) {
  const pkg = pkgOf(source);
  byPkg.set(pkg, (byPkg.get(pkg) || 0) + gz);
}

const top = [...byPkg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log("\n=== Client JS by package (gzip, deduped) ===");
for (const [pkg, gz] of top) {
  console.log(`${String(gz).padStart(7)} gz  ${pkg}`);
}
