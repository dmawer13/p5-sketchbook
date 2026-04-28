import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const sketchesDir = path.join(root, "sketches");
const previewsDir = path.join(root, "previews");

const requestedSketch = process.argv.includes("--sketch")
  ? process.argv[process.argv.indexOf("--sketch") + 1]
  : null;

const viewport = {
  width: 1600,
  height: 1000
};

function createServer(port) {
  const mimeByExt = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf"
  };

  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    const clean = url.replace(/^\/+/, "");
    const filePath = path.resolve(root, clean || "index.html");

    if (!filePath.startsWith(root)) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    try {
      const stat = await fs.stat(filePath);
      const target = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
      const ext = path.extname(target).toLowerCase();
      const type = mimeByExt[ext] || "application/octet-stream";
      const body = await fs.readFile(target);

      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function loadMeta(slug) {
  const metaPath = path.join(sketchesDir, slug, "meta.json");
  try {
    const raw = await fs.readFile(metaPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function getSketchSlugs() {
  const dirents = await fs.readdir(sketchesDir, { withFileTypes: true });
  const slugs = [];

  for (const d of dirents) {
    if (!d.isDirectory()) {
      continue;
    }
    const indexPath = path.join(sketchesDir, d.name, "index.html");
    try {
      await fs.access(indexPath);
      slugs.push(d.name);
    } catch {
      // Skip non-sketch dirs.
    }
  }

  slugs.sort((a, b) => a.localeCompare(b));
  return requestedSketch ? slugs.filter((s) => s === requestedSketch) : slugs;
}

async function run() {
  const port = Number(process.env.PORT || 4173);
  const server = await createServer(port);

  await fs.mkdir(previewsDir, { recursive: true });
  const slugs = await getSketchSlugs();

  if (!slugs.length) {
    console.log("No matching sketches found.");
    server.close();
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });

  for (const slug of slugs) {
    const page = await context.newPage();
    const meta = await loadMeta(slug);
    const frame = Number.isFinite(meta.snapshotFrame) ? meta.snapshotFrame : 120;
    const timeoutMs = Number.isFinite(meta.snapshotTimeoutMs) ? meta.snapshotTimeoutMs : 12000;

    const url = `http://localhost:${port}/sketches/${slug}/index.html?snapshot=1&frame=${frame}`;
    process.stdout.write(`Capturing ${slug} ... `);

    try {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.__SNAPSHOT_READY__ === true, { timeout: timeoutMs });
    } catch {
      // Fallback for sketches that do not signal readiness.
      await page.waitForTimeout(800);
    }

    const outPath = path.join(previewsDir, `${slug}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    await page.close();

    console.log("done");
  }

  await browser.close();
  server.close();

  const { spawn } = await import("node:child_process");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "tools", "build-gallery-manifest.mjs")], {
      cwd: root,
      stdio: "inherit"
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Manifest build failed with code ${code}`))));
  });
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
