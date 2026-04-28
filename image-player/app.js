const folderInput = document.getElementById("folderInput");
const autoPlayToggle = document.getElementById("autoPlayToggle");
const speedInput = document.getElementById("speedInput");
const statusEl = document.getElementById("status");
const currentFrameEl = document.getElementById("currentFrame");
const canvas = document.getElementById("viewer");
const ctx = canvas.getContext("2d");
const selectorMap = document.getElementById("selectorMap");
const selectorCtx = selectorMap.getContext("2d");
const SELECTOR_OVERLAY_SIZE = 132;
const SELECTOR_OVERLAY_PADDING = 16;
const SELECTOR_DOT_RADIUS = 2.4;
const SELECTOR_CORNER_RADIUS = 4.5;

const state = {
  frames: new Map(),
  rowIndices: [],
  colIndices: [],
  currentRow: 0,
  currentCol: 0,
  axis: "col",
  step: 1,
  autoplayEnabled: false
};

let folderStatus = "idle";
let autoplayLastTime = 0;
let autoplayWasRunning = false;

async function loadBitmap(file) {
  if ("createImageBitmap" in window) {
    return await createImageBitmap(file);
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load ${file.name}`));
    };

    image.src = url;
  });
}

function rowLabelToIndex(label) {
  let index = 0;
  const upper = label.toUpperCase();

  for (let i = 0; i < upper.length; i += 1) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }

  return index - 1;
}

function indexToRowLabel(index) {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    const mod = (value - 1) % 26;
    label = String.fromCharCode(65 + mod) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function keyFor(row, col) {
  return `${row}:${col}`;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function updateSpeedLabel() {
  // The slider speaks for itself in the current UI.
}

function getCurrentFrame() {
  if (!state.frames.size) {
    return null;
  }
  return state.frames.get(keyFor(state.currentRow, state.currentCol)) || null;
}

function renderEmpty(message) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = "#9d9d9d";
  ctx.font = "18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, canvas.clientWidth / 2, canvas.clientHeight / 2);
  currentFrameEl.textContent = "--";
}

function render() {
  if (!canvas.clientWidth || !canvas.clientHeight) {
    return;
  }

  const frame = getCurrentFrame();
  if (!frame) {
    renderEmpty("No frame at the current grid position");
    return;
  }

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / frame.bitmap.width, height / frame.bitmap.height);
  const drawWidth = frame.bitmap.width * scale;
  const drawHeight = frame.bitmap.height * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;

  ctx.drawImage(frame.bitmap, drawX, drawY, drawWidth, drawHeight);

  ctx.strokeStyle = "#5d5d5d";
  ctx.lineWidth = 1;
  ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
  currentFrameEl.textContent = frame.name;
  drawSelectorOverlay();
}

function drawSelectorOverlay() {
  const itemCount = state.frames.size;
  const sideCount = Math.max(1, Math.round(Math.sqrt(itemCount)));
  const innerSize = SELECTOR_OVERLAY_SIZE - SELECTOR_OVERLAY_PADDING * 2;
  const step = sideCount > 1 ? innerSize / (sideCount - 1) : 0;

  selectorCtx.clearRect(0, 0, SELECTOR_OVERLAY_SIZE, SELECTOR_OVERLAY_SIZE);
  selectorCtx.fillStyle = "#7f7f7f";
  selectorCtx.fillRect(0, 0, SELECTOR_OVERLAY_SIZE, SELECTOR_OVERLAY_SIZE);
  selectorCtx.fillStyle = "#222";

  for (let row = 0; row < sideCount; row += 1) {
    for (let col = 0; col < sideCount; col += 1) {
      const x = SELECTOR_OVERLAY_PADDING + col * step;
      const y = SELECTOR_OVERLAY_PADDING + row * step;
      const isCorner =
        (row === 0 || row === sideCount - 1) &&
        (col === 0 || col === sideCount - 1);
      const radius = isCorner ? SELECTOR_CORNER_RADIUS : SELECTOR_DOT_RADIUS;

      selectorCtx.beginPath();
      selectorCtx.arc(x, y, radius, 0, Math.PI * 2);
      selectorCtx.fill();
    }
  }

  const activeRow = state.rowIndices.indexOf(state.currentRow);
  const activeCol = state.colIndices.indexOf(state.currentCol);

  if (activeRow >= 0 && activeCol >= 0) {
    const selectorX = SELECTOR_OVERLAY_PADDING + activeCol * step;
    const selectorY = SELECTOR_OVERLAY_PADDING + activeRow * step;
    const selectorBoxSize = Math.max(10, step * 0.72);

    selectorCtx.strokeStyle = "#f2f2f2";
    selectorCtx.lineWidth = 1.5;
    selectorCtx.strokeRect(
      selectorX - selectorBoxSize / 2,
      selectorY - selectorBoxSize / 2,
      selectorBoxSize,
      selectorBoxSize
    );
  }
}

function updateAutoplayStatus(note = "") {
  if (!state.frames.size) {
    statusEl.textContent = folderStatus;
    return;
  }

  statusEl.textContent = state.autoplayEnabled ? "auto: on" : folderStatus;
}

function tickAutoplay() {
  if (!state.frames.size) {
    return;
  }

  if (state.axis === "row") {
    moveSelection(state.step, 0, true);
  } else {
    moveSelection(0, state.step, true);
  }
}

function restartAutoplay() {
  if (!state.autoplayEnabled || !state.frames.size) {
    updateAutoplayStatus();
    autoplayLastTime = 0;
    return;
  }

  updateAutoplayStatus("running");
}

function moveSelection(deltaRow, deltaCol, shouldBounce = false) {
  if (!state.frames.size) {
    return;
  }

  const minRow = state.rowIndices[0];
  const maxRow = state.rowIndices[state.rowIndices.length - 1];
  const minCol = state.colIndices[0];
  const maxCol = state.colIndices[state.colIndices.length - 1];

  let nextRow = state.currentRow + deltaRow;
  let nextCol = state.currentCol + deltaCol;

  if (shouldBounce) {
    if (nextRow > maxRow || nextRow < minRow) {
      state.step *= -1;
      nextRow = state.currentRow + (state.axis === "row" ? state.step : deltaRow);
    }
    if (nextCol > maxCol || nextCol < minCol) {
      state.step *= -1;
      nextCol = state.currentCol + (state.axis === "col" ? state.step : deltaCol);
    }
  }

  state.currentRow = Math.max(minRow, Math.min(maxRow, nextRow));
  state.currentCol = Math.max(minCol, Math.min(maxCol, nextCol));
  render();
}

function animationLoop(timestamp) {
  const shouldAutoplay = state.autoplayEnabled && state.frames.size;

  if (shouldAutoplay) {
    const fps = Number(speedInput.value || 12);
    const interval = 1000 / fps;

    if (!autoplayWasRunning) {
      updateAutoplayStatus("running");
      autoplayLastTime = timestamp;
      tickAutoplay();
    } else if (timestamp - autoplayLastTime >= interval) {
      autoplayLastTime = timestamp;
      tickAutoplay();
    }
  } else {
    autoplayLastTime = 0;
  }

  autoplayWasRunning = Boolean(shouldAutoplay);
  window.requestAnimationFrame(animationLoop);
}

async function loadFrames(files) {
  const matchedFiles = files.filter((file) =>
    /^([A-Z]+)(\d+)\.(png|jpg|jpeg|webp|gif)$/i.test(file.name)
  );

  if (!matchedFiles.length) {
    state.frames.clear();
    state.rowIndices = [];
    state.colIndices = [];
    folderStatus = "no matches";
    currentFrameEl.textContent = "--";
    drawSelectorOverlay();
    render();
    updateAutoplayStatus();
    restartAutoplay();
    return;
  }

  let loadedCount = 0;
  statusEl.textContent = `loading 0/${matchedFiles.length}`;

  const entryPromises = matchedFiles.map(async (file) => {
    const match = file.name.match(/^([A-Z]+)(\d+)\.(png|jpg|jpeg|webp|gif)$/i);
    const row = rowLabelToIndex(match[1]);
    const col = Number(match[2]);
    const bitmap = await loadBitmap(file);
    loadedCount += 1;
    statusEl.textContent = `loading ${loadedCount}/${matchedFiles.length}`;

    return {
      row,
      col,
      bitmap,
      name: file.name
    };
  });

  const settledEntries = await Promise.allSettled(entryPromises);
  const entries = settledEntries
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const failedCount = settledEntries.length - entries.length;

  state.frames.clear();

  for (const entry of entries) {
    state.frames.set(keyFor(entry.row, entry.col), entry);
  }

  state.rowIndices = [...new Set(entries.map((entry) => entry.row))].sort((a, b) => a - b);
  state.colIndices = [...new Set(entries.map((entry) => entry.col))].sort((a, b) => a - b);

  if (entries.length) {
    state.currentRow = state.rowIndices[0];
    state.currentCol = state.colIndices[0];
    folderStatus = failedCount > 0 ? `loaded | fail ${failedCount}` : "loaded";
  } else {
    folderStatus = "decode failed";
    currentFrameEl.textContent = "--";
  }

  render();
  updateAutoplayStatus();
  restartAutoplay();
}

folderInput.addEventListener("change", async (event) => {
  const files = [...event.target.files];
  statusEl.textContent = "loading";
  try {
    await loadFrames(files);
  } catch (error) {
    folderStatus = `load failed`;
    updateAutoplayStatus();
  }
});

speedInput.addEventListener("input", () => {
  updateSpeedLabel();
  restartAutoplay();
});

autoPlayToggle.addEventListener("change", restartAutoplay);
autoPlayToggle.addEventListener("click", () => {
  state.autoplayEnabled = !state.autoplayEnabled;
  autoPlayToggle.setAttribute("aria-pressed", String(state.autoplayEnabled));
  autoPlayToggle.textContent = state.autoplayEnabled ? "auto: on" : "auto: off";
  restartAutoplay();
});

window.addEventListener("keydown", (event) => {
  if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
  }

  if (!state.frames.size) {
    return;
  }

  if (event.key === "ArrowRight") {
    state.axis = "col";
    state.step = 1;
    moveSelection(0, 1);
    restartAutoplay();
  }

  if (event.key === "ArrowLeft") {
    state.axis = "col";
    state.step = -1;
    moveSelection(0, -1);
    restartAutoplay();
  }

  if (event.key === "ArrowDown") {
    state.axis = "row";
    state.step = 1;
    moveSelection(1, 0);
    restartAutoplay();
  }

  if (event.key === "ArrowUp") {
    state.axis = "row";
    state.step = -1;
    moveSelection(-1, 0);
    restartAutoplay();
  }
});

window.addEventListener("resize", resizeCanvas);

updateSpeedLabel();
resizeCanvas();
renderEmpty("Choose a folder to begin");
drawSelectorOverlay();
updateAutoplayStatus();
window.requestAnimationFrame(animationLoop);
