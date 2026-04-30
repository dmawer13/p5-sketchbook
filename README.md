# p5.js Sketchbook

Personal archive for p5.js sketches with automated preview images and a visual gallery browser.

## Folder Layout

- `sketches/<slug>/`: one sketch per folder (`index.html`, `sketch.js`, optional `meta.json`)
- `previews/<slug>.png`: generated snapshot image for each sketch
- `gallery/`: local image-first browser app
- `tools/`: local dev/snapshot scripts

## Setup

1. Open `/Users/dave/Documents/GitHub/p5-sketchbook` in VS Code.
2. Install Node.js 18+.
3. Install dependencies:

```bash
npm install
npx playwright install chromium
```

## Daily Workflow

1. Edit any sketch in `sketches/<slug>/`.
2. Optional snapshot hook in sketch code (recommended for reliable captures):

```js
if (snapshotMode && frameCount >= snapshotFrame) {
  window.__SNAPSHOT_READY__ = true;
  noLoop();
}
```

3. Generate preview images for all sketches:

```bash
npm run snapshots
```

4. Start local server and browse gallery:

```bash
npm run dev
```

Open: [http://localhost:4173/gallery/](http://localhost:4173/gallery/)

## Commands

- `npm run dev`: run static dev server
- `npm run manifest`: rebuild `gallery/manifest.json` from sketches/previews
- `npm run rename:grid -- <folder>`: rename the first 100 images in a folder to `A0` through `J9`
- `npm run snapshots`: capture previews and rebuild manifest
- `npm run snapshots:one -- <slug>`: capture one sketch only

## GitHub Pages

This repo is set up to deploy as a static GitHub Pages site with the workflow in `.github/workflows/pages.yml`.

To publish:

1. Push the repo to GitHub.
2. In the repository settings, open `Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main` or run the `Deploy GitHub Pages` workflow manually.

After deployment:

- Site root: `/`
- Gallery: `/gallery/`
- Thermal controller sketch: `/sketches/009-thermal-column-day/index.html`

The root `index.html` provides entry links to both the gallery and the Lake Erie temperature sketch.

## Image Player

Open [image-player/index.html](/Users/dave/Documents/GitHub/p5-sketchbook/image-player/index.html) in the dev server to load a folder of files named like `A0.png`, `A1.png`, `B0.png`. Use arrow keys to change row/column and optional autoplay to iterate through the image grid.

To rename a folder of 100 images into that scheme, run:

```bash
npm run rename:grid -- /path/to/folder
```

For a preview without changing files:

```bash
npm run rename:grid -- /path/to/folder --dry-run
```

Example:

```bash
npm run snapshots:one -- 001-first-sketch
```

## Sketch Metadata

`sketches/<slug>/meta.json` is optional.

```json
{
  "title": "001 First Sketch",
  "year": 2026,
  "tags": ["starter", "motion"],
  "snapshotFrame": 120,
  "snapshotTimeoutMs": 12000,
  "p5Version": "1.11.1"
}
```

The gallery reads title/year/tags; snapshots use frame/timeout.
