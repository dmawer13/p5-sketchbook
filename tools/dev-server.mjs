import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);

const mimeByExt = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8"
};

function safeResolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const clean = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(root, clean || "index.html");
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

async function readFileWithFallback(absPath) {
  try {
    const stat = await fs.stat(absPath);
    if (stat.isDirectory()) {
      return await readFileWithFallback(path.join(absPath, "index.html"));
    }
    const ext = path.extname(absPath).toLowerCase();
    const contentType = mimeByExt[ext] || "application/octet-stream";
    const content = await fs.readFile(absPath);
    return { content, contentType };
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const resolved = safeResolve(req.url || "/");
  if (!resolved) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  const file = await readFileWithFallback(resolved);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": file.contentType,
    "cache-control": "no-store"
  });
  res.end(file.content);
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
  console.log("Open gallery at http://localhost:" + port + "/gallery/");
});
