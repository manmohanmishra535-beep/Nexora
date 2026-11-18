const fs = require("fs");
const lines = fs
  .readFileSync("bundle-graph.jsonl", "utf8")
  .split("\n")
  .filter((l) => l.trim());

let shown = 0;
for (const line of lines) {
  let rec;
  try {
    rec = JSON.parse(line);
  } catch {
    continue;
  }
  if (rec.type === "group" && rec.route === "/messages") {
    console.log("kind:", rec.kind, "outputs:", (rec.outputs || []).length);
    for (const out of (rec.outputs || []).slice(0, 6)) {
      const rel = out.replace(/^\[client-fs\]\/_next\//, "");
      const p = require("path").join(".next", rel);
      console.log(" ", JSON.stringify(out), "->", p, "exists:", fs.existsSync(p));
    }
    shown++;
    if (shown >= 2) break;
  }
}
