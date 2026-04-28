import fs from "node:fs/promises";
import path from "node:path";

const folderArg = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const validExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const rowLabels = "ABCDEFGHIJ".split("");
const expectedCount = 100;

function usage() {
  console.log("Usage: npm run rename:grid -- /absolute/or/relative/folder [--dry-run]");
}

function buildTargetName(index, extension) {
  const row = Math.floor(index / 10);
  const col = index % 10;
  return `${rowLabels[row]}${col}${extension.toLowerCase()}`;
}

if (!folderArg) {
  usage();
  process.exit(1);
}

const folderPath = path.resolve(process.cwd(), folderArg);

async function main() {
  const dirents = await fs.readdir(folderPath, { withFileTypes: true });
  const files = dirents
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
    .filter((name) => validExtensions.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  if (files.length < expectedCount) {
    throw new Error(`Expected at least ${expectedCount} image files, found ${files.length}.`);
  }

  if (files.length > expectedCount) {
    console.log(`Found ${files.length} images. Only the first ${expectedCount} will be renamed.`);
  }

  const selected = files.slice(0, expectedCount);
  const tempMoves = [];
  const finalMoves = [];

  for (let index = 0; index < selected.length; index += 1) {
    const originalName = selected[index];
    const extension = path.extname(originalName);
    const tempName = `.__grid_rename_tmp_${index}${extension.toLowerCase()}`;
    const finalName = buildTargetName(index, extension);

    tempMoves.push([originalName, tempName]);
    finalMoves.push([tempName, finalName]);
  }

  console.log(`Preparing to rename ${selected.length} files in ${folderPath}`);

  for (let index = 0; index < selected.length; index += 1) {
    const originalName = selected[index];
    const finalName = buildTargetName(index, path.extname(originalName));
    console.log(`${originalName} -> ${finalName}`);
  }

  if (dryRun) {
    console.log("Dry run only. No files were changed.");
    return;
  }

  for (const [from, to] of tempMoves) {
    await fs.rename(path.join(folderPath, from), path.join(folderPath, to));
  }

  for (const [from, to] of finalMoves) {
    await fs.rename(path.join(folderPath, from), path.join(folderPath, to));
  }

  console.log("Rename complete.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
