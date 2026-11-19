// Verify first-load measurement integrity:
//  - every chunk ref in every HTML resolves to a file on disk
//  - which chunk now contains socket.io, and is it referenced by any HTML?
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const appDir = path.join(".next", "server", "app");
const htmlRefs = new Map(); // route -> Set(refs)

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) {
      const rel = path.relative(appDir, full).replace(/\\/g, "/");
      const route =
        rel === "index.html" ? "/" : "/" + rel.replace(/\.html$/, "").replace(/\/index$/, "");
      const html = fs.readFileSync(full, "utf8");
      htmlRefs.set(
        route,
        new Set(
          [...html.matchAll(/\/_next\/static\/chunks\/[^"'\s\\]+\.js/g)].map((m) => m[0]),
        ),
      );
    }
  }
}
walk(appDir);

let dangling = 0;
for (const [route, refs] of htmlRefs) {
  for (const ref of refs) {
    const file = path.join(".next", ref.replace(/^\/_next\//, ""));
    if (!fs.existsSync(file)) {
      console.log("DANGLING:", route, ref);
      dangling++;
    }
  }
}
console.log("dangling refs:", dangling);

// Which chunk holds socket.io / engine.io now?
const chunkDir = path.join(".next", "static", "chunks");
const socketChunks = [];
for (const f of fs.readdirSync(chunkDir)) {
  if (!f.endsWith(".js")) continue;
  const buf = fs.readFileSync(path.join(chunkDir, f));
  if (buf.includes("engine.io") || buf.includes("socket.io-client")) {
    socketChunks.push({ f, raw: buf.length, gz: zlib.gzipSync(buf).length });
  }
}
console.log("\nchunks containing socket.io/engine.io:");
for (const c of socketChunks) {
  const refsIn = [];
  for (const [route, refs] of htmlRefs) {
    for (const ref of refs) {
      if (ref.endsWith("/" + c.f)) refsIn.push(route);
    }
  }
  console.log(
    `  ${c.f}  ${c.raw} raw / ${c.gz} gz  referenced by HTML:`,
    refsIn.length ? refsIn : "NONE (async only)",
  );
}

// Home vs explore ref diff
const home = htmlRefs.get("/") || new Set();
const explore = htmlRefs.get("/explore") || new Set();
const onlyExplore = [...explore].filter((r) => !home.has(r));
const onlyHome = [...home].filter((r) => !explore.has(r));
console.log("\nin /explore but not /:", onlyExplore);
console.log("in / but not /explore:", onlyHome);
