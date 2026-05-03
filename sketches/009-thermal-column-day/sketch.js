const DEPTH_COLUMNS = Array.from({ length: 14 }, (_, index) => ({
  column: `sea_water_temperature_${index + 1} (K)`,
  depthMeters: (index + 1) * 2
}));

const TARGET_MONTH = "2025-06";
const INTERVAL_OPTIONS = [10, 20, 30, 40, 50, 60];
const PALETTE_OPTIONS = [
  "#2450ff",
  "#4f86f7",
  "#23a6d5",
  "#27c2a0",
  "#f2c14e",
  "#f78154",
  "#e53935",
  "#7a1f5c"
];
const COOL_PALETTE_OPTIONS = PALETTE_OPTIONS.slice(0, 4);
const WARM_PALETTE_OPTIONS = PALETTE_OPTIONS.slice(4);
const ANIMATION_FPS = 12;
const MAX_SPEED = 12;
const PROJECTOR_CHANNEL = "thermal-column-day-display";
const CONTROLLER_UI_WIDTH = 800;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const PROJECTOR_WIDTH = 1920;
const PROJECTOR_HEIGHT = 1080;
const snapshotParams = new URLSearchParams(window.location.search);
const snapshotMode = snapshotParams.get("snapshot") === "1";
const snapshotFrame = Number.parseInt(snapshotParams.get("frame") || "1", 10);
const projectorMode = snapshotParams.get("mode") === "projector";

let syncChannel = null;
let projectorWindow = null;
let projectorStatusInterval = null;

try {
  syncChannel = new BroadcastChannel(PROJECTOR_CHANNEL);
} catch (error) {
  console.warn("BroadcastChannel unavailable; projector sync disabled.", error);
}

const appState = {
  intervalMinutes: 10,
  playbackSpeed: 1,
  animationPosition: 0,
  showOverlays: true,
  coldColor: "#2450ff",
  warmColor: "#e53935"
};

const datasetState = {
  monthRows: [],
  bucketedRows: [],
  tempMin: Infinity,
  tempMax: -Infinity
};

const controlRefs = {
  intervalSlider: null,
  intervalBadge: null,
  speedSlider: null,
  speedBadge: null,
  overlayToggle: null,
  coldPalette: null,
  warmPalette: null,
  gradientStripe: null,
  previewArea: null,
  controllerInstance: null
};

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (!event.data || event.data.type !== "thermal:update" || snapshotMode) {
      return;
    }

    const payload = event.data.payload || {};

    if (typeof payload.intervalMinutes === "number") {
      appState.intervalMinutes = payload.intervalMinutes;
      buildBucketedRows();
    }

    if (typeof payload.playbackSpeed === "number") {
      appState.playbackSpeed = payload.playbackSpeed;
    }

    if (typeof payload.animationPosition === "number") {
      appState.animationPosition = payload.animationPosition;
    }

    if (typeof payload.showOverlays === "boolean") {
      appState.showOverlays = payload.showOverlays;
    }

    if (typeof payload.coldColor === "string") {
      appState.coldColor = payload.coldColor;
    }

    if (typeof payload.warmColor === "string") {
      appState.warmColor = payload.warmColor;
    }

    if (!projectorMode) {
      updateControlLabels();
    }
  };
}

function preload() {
  datasetState.obsTable = loadTable("obs.csv", "csv", "header");
}

function setup() {
  parseMonthRows();
  buildBucketedRows();

  if (snapshotMode) {
    createCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    frameRate(ANIMATION_FPS);
    noLoop();
    return;
  }

  if (projectorMode) {
    buildProjectorExperience();
    noLoop();
    return;
  }

  buildControllerExperience();
  noLoop();
}

function draw() {
  if (snapshotMode) {
    renderThermalChart(window, {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT
    });

    if (frameCount >= snapshotFrame) {
      window.__SNAPSHOT_READY__ = true;
    }

    return;
  }
}

function parseMonthRows() {
  datasetState.monthRows = [];
  datasetState.tempMin = Infinity;
  datasetState.tempMax = -Infinity;

  for (const row of datasetState.obsTable.rows) {
    const timestamp = row.get("time (UTC)");
    if (!timestamp || !timestamp.startsWith(TARGET_MONTH)) {
      continue;
    }

    const temperatures = DEPTH_COLUMNS.map(({ column, depthMeters }) => {
      const kelvin = Number.parseFloat(row.get(column));
      if (Number.isNaN(kelvin)) {
        return null;
      }

      datasetState.tempMin = min(datasetState.tempMin, kelvin);
      datasetState.tempMax = max(datasetState.tempMax, kelvin);

      return {
        depthMeters,
        kelvin
      };
    }).filter(Boolean);

    datasetState.monthRows.push({
      timestamp,
      dayLabel: `${Number.parseInt(timestamp.slice(8, 10), 10)}`,
      timeLabel: timestamp.slice(11, 16),
      shortDate: `${Number.parseInt(timestamp.slice(5, 7), 10)}/${Number.parseInt(timestamp.slice(8, 10), 10)}`,
      temperatures
    });
  }
}

function buildBucketedRows() {
  const rowsPerBucket = appState.intervalMinutes / 10;
  datasetState.bucketedRows = [];

  for (let index = 0; index < datasetState.monthRows.length; index += rowsPerBucket) {
    const chunk = datasetState.monthRows.slice(index, index + rowsPerBucket);
    if (chunk.length === 0) {
      continue;
    }

    const temperatures = DEPTH_COLUMNS.map((_, depthIndex) => {
      let total = 0;
      let count = 0;

      for (const row of chunk) {
        const reading = row.temperatures[depthIndex];
        if (!reading) {
          continue;
        }
        total += reading.kelvin;
        count += 1;
      }

      if (count === 0) {
        return null;
      }

      return {
        depthMeters: DEPTH_COLUMNS[depthIndex].depthMeters,
        kelvin: total / count
      };
    }).filter(Boolean);

    const firstRow = chunk[0];
    const lastRow = chunk[chunk.length - 1];

    datasetState.bucketedRows.push({
      timestamp: firstRow.timestamp,
      dayLabel: firstRow.dayLabel,
      timeLabel: firstRow.timeLabel,
      shortDate: firstRow.shortDate,
      endTimeLabel: lastRow.timeLabel,
      temperatures
    });
  }
}

function createSketch(container, sizeMode) {
  return new p5((p) => {
    p.setup = () => {
      const canvas = sizeMode === "projector"
        ? p.createCanvas(PROJECTOR_WIDTH, PROJECTOR_HEIGHT)
        : p.createCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);

      canvas.parent(container);
      p.frameRate(ANIMATION_FPS);
    };

    p.draw = () => {
      renderThermalChart(p, {
        width: p.width,
        height: p.height
      });

      if (!projectorMode) {
        advanceAnimation();
        broadcastPlaybackState();
      }
    };

    p.windowResized = () => {
    };
  });
}

function renderThermalChart(p, dimensions) {
  p.background("#f3efe7");

  if (datasetState.monthRows.length === 0) {
    drawEmptyState(p, dimensions.width, dimensions.height);
    return;
  }

  const baseMargin = { top: 10, right: 10, bottom: 10, left: 10 };
  const overlayBottomMargin = dimensions.width < 900 ? 56 : 66;
  const margin = appState.showOverlays
    ? { ...baseMargin, bottom: overlayBottomMargin }
    : baseMargin;

  const visibleRows = getVisibleRows();
  if (visibleRows.length === 0) {
    drawEmptyState(p, dimensions.width, dimensions.height);
    return;
  }

  const plotWidth = dimensions.width - margin.left - margin.right;
  const plotHeight = dimensions.height - margin.top - margin.bottom;
  const cellWidth = plotWidth / visibleRows.length;
  const cellHeight = plotHeight / DEPTH_COLUMNS.length;
  const timelineY = margin.top + plotHeight + 12;

  drawCells(p, margin, cellWidth, cellHeight, visibleRows);
  if (appState.showOverlays) {
    drawGrid(p, margin, plotWidth, plotHeight, cellWidth, cellHeight, visibleRows.length);
    drawTitle(p, margin, visibleRows, plotWidth);
    drawLegend(p, dimensions.width - 214, 18, 188, 14);
    drawTimeLabels(p, margin, plotHeight, cellWidth, visibleRows);
    drawDepthFlags(p, margin, cellHeight, plotWidth);
    drawMonthTimeline(p, margin.left, timelineY, plotWidth, visibleRows.length);
  } else {
    drawDateBadge(p, visibleRows, margin, plotWidth);
  }
}

function buildControllerExperience() {
  document.body.className = "control-mode";
  document.documentElement.style.setProperty("--controller-ui-width", `${CONTROLLER_UI_WIDTH}px`);
  document.body.innerHTML = `
    <main class="app-shell">
      <section class="panel">
        <div class="panel-header">
          <div class="title-block">
            <h1>Temperature Stratification</h1>
            <h2>Lake Erie, June 2025</h2>
          </div>
        </div>
        <div class="status" id="projector-status"></div>
        <div class="controls-stack">
          <div class="control-group">
            <div class="control-head">
              <label for="interval-slider">step</label>
              <div class="value-badge" id="interval-badge"></div>
            </div>
            <input id="interval-slider" type="range" min="0" max="${INTERVAL_OPTIONS.length - 1}" step="1" value="0" />
          </div>
          <div class="control-group">
            <div class="control-head">
              <label for="speed-slider">speed</label>
              <div class="value-badge" id="speed-badge"></div>
            </div>
            <input id="speed-slider" type="range" min="0" max="${MAX_SPEED}" step="1" value="1" />
          </div>
          <div class="control-group color-group">
            <label>palette</label>
            <div class="gradient-stripe" id="gradient-stripe"></div>
            <div class="color-pickers">
              <div class="palette-column">
                <div class="palette-row" id="cold-palette"></div>
              </div>
              <div class="palette-column palette-column-right">
                <div class="palette-row" id="warm-palette"></div>
              </div>
            </div>
          </div>
          <div class="control-group toggle-group">
            <label class="toggle-option">
              <input id="overlay-toggle" type="checkbox" checked />
              <span>annotate</span>
            </label>
          </div>
        </div>
      </section>
      <section class="preview-area" id="preview-area">
        <div class="preview-card">
          <div id="controller-canvas"></div>
        </div>
      </section>
    </main>
  `;

  controlRefs.intervalSlider = document.getElementById("interval-slider");
  controlRefs.intervalBadge = document.getElementById("interval-badge");
  controlRefs.speedSlider = document.getElementById("speed-slider");
  controlRefs.speedBadge = document.getElementById("speed-badge");
  controlRefs.overlayToggle = document.getElementById("overlay-toggle");
  controlRefs.coldPalette = document.getElementById("cold-palette");
  controlRefs.warmPalette = document.getElementById("warm-palette");
  controlRefs.gradientStripe = document.getElementById("gradient-stripe");
  controlRefs.previewArea = document.getElementById("preview-area");

  controlRefs.intervalSlider.addEventListener("input", handleIntervalChange);
  controlRefs.speedSlider.addEventListener("input", handleSpeedChange);
  controlRefs.overlayToggle.addEventListener("change", handleVisibilityToggle);
  window.addEventListener("keydown", handleControllerKeydown);

  renderPaletteOptions();
  updateControlLabels();
  updateProjectorStatus();

  if (projectorStatusInterval) {
    window.clearInterval(projectorStatusInterval);
  }
  projectorStatusInterval = window.setInterval(updateProjectorStatus, 1000);

  if (controlRefs.controllerInstance) {
    controlRefs.controllerInstance.remove();
  }
  controlRefs.controllerInstance = createSketch("controller-canvas", "fixed");
  broadcastPlaybackState(true);
}

function buildProjectorExperience() {
  document.body.className = "projector-mode";
  document.body.innerHTML = `
    <div id="projector-canvas"></div>
    
  `;

  window.addEventListener("keydown", async (event) => {
    if (event.key.toLowerCase() !== "f") {
      return;
    }

    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  });

  createSketch("projector-canvas", "projector");
}

function openProjectorWindow() {
  const url = new URL(window.location.href);
  url.searchParams.delete("snapshot");
  url.searchParams.delete("frame");
  url.searchParams.set("mode", "projector");

  projectorWindow = window.open(
    url.toString(),
    "thermal-column-projector",
    `popup=yes,width=${PROJECTOR_WIDTH},height=${PROJECTOR_HEIGHT}`
  );
  updateProjectorStatus();
  broadcastPlaybackState(true);
}

function handleControllerKeydown(event) {
  const target = event.target;
  const tagName = target && target.tagName ? target.tagName.toLowerCase() : "";
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return;
  }

  if (event.key.toLowerCase() === "p") {
    openProjectorWindow();
  }
}

function updateProjectorStatus() {
  const statusNode = document.getElementById("projector-status");
  if (!statusNode) {
    return;
  }

  const active = projectorWindow && !projectorWindow.closed;
  statusNode.textContent = "";
  statusNode.classList.toggle("is-active", active);

  if (controlRefs.previewArea) {
    controlRefs.previewArea.classList.toggle("is-hidden", active);
  }
}

function handleIntervalChange() {
  const previousIntervalMinutes = appState.intervalMinutes;
  const previousWindowSize = getWindowSize(previousIntervalMinutes);
  const previousStartIndex = getCurrentStartIndex(previousWindowSize);
  const previousRowsPerBucket = previousIntervalMinutes / 10;
  const previousCenterRow = previousStartIndex * previousRowsPerBucket + (previousWindowSize * previousRowsPerBucket) / 2;

  const optionIndex = Number.parseInt(controlRefs.intervalSlider.value, 10);
  appState.intervalMinutes = INTERVAL_OPTIONS[optionIndex];
  buildBucketedRows();
  const nextWindowSize = getWindowSize();
  const nextRowsPerBucket = appState.intervalMinutes / 10;
  const nextStartIndex = previousCenterRow / nextRowsPerBucket - nextWindowSize / 2;
  const nextMaxStart = max(0, datasetState.bucketedRows.length - nextWindowSize);
  appState.animationPosition = constrain(nextStartIndex, 0, nextMaxStart);
  updateControlLabels();
  broadcastPlaybackState(true);
}

function handleSpeedChange() {
  appState.playbackSpeed = Number.parseInt(controlRefs.speedSlider.value, 10);
  updateControlLabels();
  broadcastPlaybackState(true);
}

function handleVisibilityToggle(event) {
  appState.showOverlays = event.target.checked;
  broadcastPlaybackState(true);
}

function handleColorChange(role, color) {
  if (role === "cold") {
    if (!COOL_PALETTE_OPTIONS.includes(color)) {
      return;
    }
    appState.coldColor = color;
  } else {
    if (!WARM_PALETTE_OPTIONS.includes(color)) {
      return;
    }
    appState.warmColor = color;
  }

  updateControlLabels();
  broadcastPlaybackState(true);
}

function renderPaletteOptions() {
  if (!controlRefs.coldPalette || !controlRefs.warmPalette) {
    return;
  }

  controlRefs.coldPalette.innerHTML = "";
  controlRefs.warmPalette.innerHTML = "";

  for (const color of COOL_PALETTE_OPTIONS) {
    const coldButton = document.createElement("button");
    coldButton.type = "button";
    coldButton.className = "swatch-button";
    coldButton.dataset.color = color;
    coldButton.dataset.role = "cold";
    coldButton.style.setProperty("--swatch-color", color);
    coldButton.setAttribute("aria-label", `Set cool color to ${color}`);
    coldButton.addEventListener("click", () => handleColorChange("cold", color));
    controlRefs.coldPalette.append(coldButton);

    controlRefs.coldPalette.append(coldButton);
  }

  for (const color of WARM_PALETTE_OPTIONS) {
    const warmButton = document.createElement("button");
    warmButton.type = "button";
    warmButton.className = "swatch-button";
    warmButton.dataset.color = color;
    warmButton.dataset.role = "warm";
    warmButton.style.setProperty("--swatch-color", color);
    warmButton.setAttribute("aria-label", `Set warm color to ${color}`);
    warmButton.addEventListener("click", () => handleColorChange("warm", color));
    controlRefs.warmPalette.append(warmButton);
  }
}

function updateControlLabels() {
  if (controlRefs.intervalSlider) {
    controlRefs.intervalSlider.value = String(INTERVAL_OPTIONS.indexOf(appState.intervalMinutes));
  }
  if (controlRefs.intervalBadge) {
    controlRefs.intervalBadge.textContent = `${appState.intervalMinutes} min steps`;
  }
  if (controlRefs.speedSlider) {
    controlRefs.speedSlider.value = String(appState.playbackSpeed);
  }
  if (controlRefs.speedBadge) {
    controlRefs.speedBadge.textContent = appState.playbackSpeed === 0
      ? "paused"
      : `${appState.playbackSpeed}x`;
  }
  if (controlRefs.overlayToggle) {
    controlRefs.overlayToggle.checked = appState.showOverlays;
  }
  if (controlRefs.gradientStripe) {
    controlRefs.gradientStripe.style.setProperty("--cold-color", appState.coldColor);
    controlRefs.gradientStripe.style.setProperty("--warm-color", appState.warmColor);
  }
  if (controlRefs.coldPalette) {
    syncSwatchSelection(controlRefs.coldPalette, appState.coldColor);
  }
  if (controlRefs.warmPalette) {
    syncSwatchSelection(controlRefs.warmPalette, appState.warmColor);
  }
}

function syncSwatchSelection(container, selectedColor) {
  const buttons = container.querySelectorAll(".swatch-button");
  buttons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.color === selectedColor);
  });
}

function broadcastPlaybackState(force = false) {
  if (!syncChannel || projectorMode || snapshotMode) {
    return;
  }

  syncChannel.postMessage({
    type: "thermal:update",
    payload: {
      intervalMinutes: appState.intervalMinutes,
      playbackSpeed: appState.playbackSpeed,
      animationPosition: appState.animationPosition,
      showOverlays: appState.showOverlays,
      coldColor: appState.coldColor,
      warmColor: appState.warmColor,
      force
    }
  });
}

function getVisibleRows() {
  const windowSize = getWindowSize();

  if (datasetState.bucketedRows.length <= windowSize) {
    return datasetState.bucketedRows;
  }

  const startIndex = getCurrentStartIndex(windowSize);

  return datasetState.bucketedRows.slice(startIndex, startIndex + windowSize);
}

function advanceAnimation() {
  if (snapshotMode || projectorMode || appState.playbackSpeed <= 0) {
    return;
  }

  const windowSize = getWindowSize();
  const maxStart = max(0, datasetState.bucketedRows.length - windowSize);

  if (maxStart === 0) {
    appState.animationPosition = 0;
    return;
  }

  appState.animationPosition = (appState.animationPosition + appState.playbackSpeed) % (maxStart + 1);
}

function getWindowSize(intervalMinutes = appState.intervalMinutes) {
  return Math.floor((24 * 60) / intervalMinutes);
}

function getCurrentStartIndex(windowSize = getWindowSize()) {
  const maxStart = max(0, datasetState.bucketedRows.length - windowSize);
  return snapshotMode
    ? constrain(snapshotFrame - 1, 0, maxStart)
    : floor(appState.animationPosition) % (maxStart + 1);
}

function drawTitle(p, margin, visibleRows, plotWidth) {
  const firstRow = visibleRows[0];
  const lastRow = visibleRows[visibleRows.length - 1];

//  p.noStroke();
//  p.fill(12, 16, 20, 210);
//  p.rect(margin.left + 10, 12, 208, 54, 8);

//  p.fill("#f2efe8");
//  p.textAlign(LEFT, TOP);
//  p.textSize(28);
//  p.text("June 2025", margin.left + 22, 22);

//  p.textSize(13);
//  p.fill(242, 239, 232, 230);
//  p.text(
//    `Sliding 24-hour window at ${appState.intervalMinutes}-minute intervals. ${firstRow.shortDate} ${firstRow.timeLabel} to ${lastRow.shortDate} ${lastRow.endTimeLabel} UTC.`,
//    margin.left + 232,
//    28,
//    plotWidth - 246,
//    40
//  );
}

function drawLegend(p, x, y, w, h) {
  p.noStroke();
  p.fill(12, 16, 20, 210);
  p.rect(x - 12, y - 16, w + 24, 54);

  const gradientY = y + 14;
  const textY = y + 8;

  for (let i = 0; i < w; i += 1) {
    const amt = i / max(1, w - 1);
    p.stroke(sampleTemperatureColor(p, lerp(datasetState.tempMin, datasetState.tempMax, amt)));
    p.line(x + i, gradientY, x + i, gradientY + h);
  }

  p.noStroke();
  p.fill("#f2efe8");
  p.textSize(12);
  p.textAlign(LEFT, BOTTOM);
  p.text(`${formatFarenheit(datasetState.tempMin)}`, x, textY);
  p.textAlign(RIGHT, BOTTOM);
  p.text(`${formatFarenheit(datasetState.tempMax)}`, x + w, textY);
}

function drawDateBadge(p, visibleRows, margin, plotWidth) {
  const firstRow = visibleRows[0];
  if (!firstRow) {
    return;
  }

  const label = `June ${firstRow.dayLabel}`;
  p.textFont("Helvetica Neue");
  p.textStyle(p.BOLD);
  p.textSize(24);
  p.textAlign(RIGHT, TOP);

    //padding for badge around text
  const padX = 16;
  const padY = 10;
    //margin from viz edges
const marginX = 10;
    const marginY = 10;
  const badgeHeight = 44;
  const badgeWidth = p.textWidth(label) + padX * 2;
  const badgeX = margin.left + plotWidth - badgeWidth - marginX;
  const badgeY = margin.top + marginY;

  p.noStroke();
  p.fill(12, 16, 20, 200);
  p.rect(badgeX, badgeY, badgeWidth, badgeHeight, 999);

  p.fill("#f7f3eb");
  p.text(label, badgeX + badgeWidth - padX, badgeY + padY);
  p.textStyle(p.NORMAL);
}

function drawGrid(p, margin, plotWidth, plotHeight, cellWidth, cellHeight, visibleCount) {
  p.noFill();
  p.strokeWeight(1);
  p.stroke(255, 255, 255, 120);
  p.rect(margin.left, margin.top, plotWidth, plotHeight);

  p.stroke(10, 12, 14, 150);
  for (let rowIndex = 1; rowIndex < DEPTH_COLUMNS.length; rowIndex += 1) {
    const y = margin.top + rowIndex * cellHeight;
    p.line(margin.left, y, margin.left + plotWidth, y);
  }

  for (let columnIndex = 0; columnIndex <= visibleCount; columnIndex += 24) {
    const x = margin.left + columnIndex * cellWidth;
    p.line(x, margin.top, x, margin.top + plotHeight);
  }
}

function drawCells(p, margin, cellWidth, cellHeight, visibleRows) {
  p.noStroke();

  for (let xIndex = 0; xIndex < visibleRows.length; xIndex += 1) {
    const row = visibleRows[xIndex];

    for (const reading of row.temperatures) {
      const depthIndex = reading.depthMeters / 2 - 1;
      const x = margin.left + xIndex * cellWidth;
      const y = margin.top + depthIndex * cellHeight;

      p.fill(sampleTemperatureColor(p, reading.kelvin));
      p.rect(x, y, cellWidth + 0.5, cellHeight + 0.5);
    }
  }
}

function drawTimeLabels(p, margin, plotHeight, cellWidth, visibleRows) {
  p.fill("#f2efe8");
  p.textSize(11);
  p.textAlign(CENTER, TOP);

  for (let index = 0; index < visibleRows.length; index += 24) {
    const row = visibleRows[index];
    const x = margin.left + index * cellWidth + cellWidth / 2;
    p.text(`${row.dayLabel} ${row.timeLabel}`, x, margin.top + plotHeight + 14);
  }

  const lastIndex = visibleRows.length - 1;
  const lastX = margin.left + lastIndex * cellWidth + cellWidth / 2;
  const lastRow = visibleRows[lastIndex];
  p.text(`${lastRow.dayLabel} ${lastRow.timeLabel}`, lastX, margin.top + plotHeight + 14);
}

function drawMonthTimeline(p, x, y, w, visibleCount) {
  const totalBucketCount = datasetState.bucketedRows.length;
  const totalRawCount = datasetState.monthRows.length;
  if (totalBucketCount === 0 || totalRawCount === 0) {
    return;
  }

  const windowSize = min(visibleCount, totalBucketCount);
  const startIndex = getCurrentStartIndex(windowSize);
  const playheadWidth = max(12, (windowSize / totalRawCount) * w);
  const maxX = x + w - playheadWidth;
  const playheadX = totalBucketCount <= windowSize
    ? x
    : p.map(startIndex, 0, totalBucketCount - windowSize, x, maxX);

  p.noStroke();
  p.fill(12, 16, 20, 40);
  p.rect(x, y, w, 16, 0);

  for (let day = 1; day <= 30; day += 1) {
    const dayX = p.map(day - 1, 0, 29, x, x + w);
    p.fill(12, 16, 20, 42);
      //ticks:
    p.rect(dayX - 0.5, y, 1, 16);
  }

  const weekStops = [7, 14, 21, 28];
  for (const day of weekStops) {
    const weekX = p.map(day - 1, 0, 29, x, x + w);
    p.fill(12, 16, 20, 120);
      // ticks:
    p.rect(weekX - 1, y, 2, 16);
  }

  p.fill(12, 16, 20, 60);
  p.rect(playheadX, y, playheadWidth, 16);
    p.noFill();
    p.stroke(0);
    p.strokeWeight(2);
    p.rect(playheadX - 2, y - 2, playheadWidth + 4, 16 + 4);

    p.noStroke();
  p.fill(12, 16, 20, 170);
  p.textSize(14);
  p.textAlign(CENTER, TOP);

  for (const day of weekStops) {
    const dayX = p.map(day - 1, 0, 29, x, x + w);
    p.text(`June ${day}`, dayX, y + 20);
  }

  p.textAlign(LEFT, TOP);
  p.fill(12, 16, 20, 180);
//  p.text("June", x, y - 16);
}

function drawDepthFlags(p, margin, cellHeight, plotWidth) {
  p.textAlign(CENTER, CENTER);
  p.textSize(12);

  for (let index = 0; index < DEPTH_COLUMNS.length; index += 1) {
    const label = DEPTH_COLUMNS[index];
    const y = margin.top + index * cellHeight + cellHeight / 2;
    const lineY = y - cellHeight / 2;
    const x = margin.left;
    const flagTop = lineY;
    const flagHeight = min(24, cellHeight - 4);
    const flagWidth = 46;

    p.stroke(12, 16, 20, 190);
    p.strokeWeight(1);
    p.line(x + 10, lineY, x + 10, flagTop);

    p.noStroke();
    p.fill(12, 16, 20, 228);
      
    p.rect(x,flagTop,flagWidth,flagHeight,0,0,8,0);  
//    p.beginShape();
//    p.vertex(x, flagTop);
//    p.vertex(x + flagWidth, flagTop);
//    p.vertex(x + flagWidth, flagTop + flagHeight - 6);
//    p.vertex(x + flagWidth - 8, flagTop + flagHeight);
//    p.vertex(x, flagTop + flagHeight);
//    p.endShape(CLOSE);

    p.fill("#f2efe8");
    p.text(`${label.depthMeters} m`, x + flagWidth * 0.52, flagTop + flagHeight * 0.52);
  }

//  p.noStroke();
//  p.fill(12, 16, 20, 188);
//  p.rect(margin.left + plotWidth - 176, margin.top + 8, 166, 24, 8);
//  p.fill("#f2efe8");
//  p.textAlign(CENTER, CENTER);
//  p.textSize(12);
//  p.text("Depth Below Surface", margin.left + plotWidth - 93, margin.top + 20);
}

function drawEmptyState(p, canvasWidth, canvasHeight) {
  p.noStroke();
  p.fill("#111111");
  p.textAlign(CENTER, CENTER);
  p.textSize(20);
  p.text("No June rows found in obs.csv", canvasWidth / 2, canvasHeight / 2);

  if (snapshotMode) {
    window.__SNAPSHOT_READY__ = true;
  }
}

function sampleTemperatureColor(p, kelvin) {
  const amt = datasetState.tempMax === datasetState.tempMin
    ? 0.5
    : constrain((kelvin - datasetState.tempMin) / (datasetState.tempMax - datasetState.tempMin), 0, 1);
  const cold = p.color(appState.coldColor);
  const warm = p.color(appState.warmColor);
  return p.lerpColor(cold, warm, amt);
}

function formatCelsius(kelvin) {
  return `${nf(kelvin - 273.15, 1, 2)} C`;
}

function formatFarenheit(kelvin) {
  return `${nf((kelvin - 273.15) * (9 / 5) + 32, 1, 2)} F`;
}
