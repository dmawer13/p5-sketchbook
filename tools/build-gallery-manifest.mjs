import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const sketchesDir = path.join(root, "sketches");
const previewsDir = path.join(root, "previews");
const galleryDir = path.join(root, "gallery");
const outPath = path.join(galleryDir, "manifest.json");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadMeta(slug) {
  const metaPath = path.join(sketchesDir, slug, "meta.json");
  if (!(await exists(metaPath))) {
    return {};
  }

  const raw = await fs.readFile(metaPath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const dirents = await fs.readdir(sketchesDir, { withFileTypes: true });
const sketches = [];

for (const dirent of dirents) {
  if (!dirent.isDirectory()) {
    continue;
  }

  const slug = dirent.name;
  const indexPath = path.join(sketchesDir, slug, "index.html");
  const hasIndex = await exists(indexPath);
  if (!hasIndex) {
    continue;
  }

  const meta = await loadMeta(slug);
  const previewFile = `${slug}.png`;
  const previewPath = path.join(previewsDir, previewFile);
  const hasPreview = await exists(previewPath);

  sketches.push({
    slug,
    title: meta.title || slug,
    year: meta.year || null,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    sketchUrl: `/sketches/${slug}/index.html`,
    previewUrl: hasPreview ? `/previews/${previewFile}` : null,
    p5Version: meta.p5Version || null,
    snapshotFrame: Number.isFinite(meta.snapshotFrame) ? meta.snapshotFrame : null
  });
}

sketches.sort((a, b) => a.slug.localeCompare(b.slug));

await fs.mkdir(galleryDir, { recursive: true });
await fs.writeFile(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: sketches.length,
      sketches
    },
    null,
    2
  ) + "\n"
);

console.log(`Wrote ${sketches.length} items to ${path.relative(root, outPath)}`);
