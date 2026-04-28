let activeButton = null;

const UI_PANEL_MARGIN = 8;
const UI_SECTION_GAP = 11;
const UI_ROW_GAP = 9;
const UI_COL_GAP = 10;
const UI_CONTROL_SCALE = 0.9;
const UI_CONTROL_BOX_SIZE = 120 * UI_CONTROL_SCALE;
const UI_GRID_ROW_STEP = UI_CONTROL_BOX_SIZE + UI_ROW_GAP;
const UI_GRID_LEFT = UI_PANEL_MARGIN + UI_CONTROL_BOX_SIZE / 2;
const UI_GRID_RIGHT = UI_GRID_LEFT + UI_CONTROL_BOX_SIZE + UI_COL_GAP;
const UI_PANEL_WIDTH = UI_GRID_RIGHT + UI_CONTROL_BOX_SIZE / 2 + UI_PANEL_MARGIN;
const PREVIEW_BOX_SIZE = UI_PANEL_WIDTH - UI_PANEL_MARGIN * 2;
const PREVIEW_CLIP_SIZE = PREVIEW_BOX_SIZE - UI_PANEL_MARGIN * 2;
const PREVIEW_CENTER_Y = UI_PANEL_MARGIN + PREVIEW_BOX_SIZE / 2;
const CANVAS_HEIGHT = 1100 - 140;
const CANVAS_WIDTH = UI_PANEL_WIDTH + 960;
const REFERENCE_CELL_CLIP_SIZE = 100;
const MAIN_GRID_GAP = 8;
const CIRCLE_UI_TOP = PREVIEW_BOX_SIZE + UI_SECTION_GAP + UI_CONTROL_BOX_SIZE / 2;
const SPIKE_UI_TOP =
  CIRCLE_UI_TOP + UI_GRID_ROW_STEP + UI_CONTROL_BOX_SIZE + UI_SECTION_GAP;
const SLIDER_X = UI_PANEL_MARGIN;
const SLIDER_WIDTH = UI_PANEL_WIDTH - UI_PANEL_MARGIN * 2;
const SLIDER_GAP = 40;
const SLIDER_START_Y =
  SPIKE_UI_TOP + UI_GRID_ROW_STEP + UI_CONTROL_BOX_SIZE / 2 + UI_SECTION_GAP;
const CHECKBOX_SIZE = 16;
const TOGGLE_CENTER_Y = SLIDER_START_Y + SLIDER_GAP * 3 + 16;
const TOGGLE_Y = TOGGLE_CENTER_Y - CHECKBOX_SIZE / 2;
const EXPORT_BUTTON_Y = TOGGLE_CENTER_Y + 18;

let arrVal = 0;
let arrDirection = 1;

let myUI;
let myCircleUI;
let myCircleUI2;
let myCircleUI3;
let myCircleUI4;

let mySpikeUI;
let mySpikeUI2;
let mySpikeUI3;
let mySpikeUI4;

let myAnimator;
let mySelector;
let animatorToggle;
let exportButton;

let bigBlendyArray;
let myArraySelector;
let currentGridExport = null;

const params = new URLSearchParams(window.location.search);
const snapshotMode = params.get("snapshot") === "1";
const snapshotFrame = Number(params.get("frame") || 2);

// Starting direction of selector. make 'right' if you want it moving by default
let startDirection = null;
// Current direction of selector
let direction = startDirection;

let startArrayX = 0;
let startArrayY = 0;

let arrayDirectionX = startArrayX;
let arrayDirectionY = startArrayY;

function setup() {
  // frameRate(4);
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  strokeJoin(ROUND);

  // num steps
  numStepsSlider = createSlider(1, 40, 21);
  numStepsSlider.position(SLIDER_X, SLIDER_START_Y);
  numStepsSlider.size(SLIDER_WIDTH);

  // num sides
  slider3a = createSlider(1, 20, 16);
  slider3a.position(SLIDER_X, SLIDER_START_Y + SLIDER_GAP);
  slider3a.size(SLIDER_WIDTH);

  // speed slider
  spdSlider = createSlider(0, 100, 90);
  spdSlider.position(SLIDER_X, SLIDER_START_Y + SLIDER_GAP * 2);
  spdSlider.size(SLIDER_WIDTH);

  animatorToggle = createCheckbox("", false);
  animatorToggle.position(SLIDER_X + 4, TOGGLE_Y);
  animatorToggle.style("margin", "0");
  animatorToggle.style("padding", "0");
  animatorToggle.style("line-height", "0");
  const animatorToggleInput = animatorToggle.elt.querySelector("input");
  animatorToggleInput.style.margin = "0";
  animatorToggleInput.style.width = `${CHECKBOX_SIZE}px`;
  animatorToggleInput.style.height = `${CHECKBOX_SIZE}px`;
  animatorToggleInput.style.display = "block";

  exportButton = createButton("exportSVG");
  exportButton.position(SLIDER_X, EXPORT_BUTTON_Y);
  exportButton.size(SLIDER_WIDTH, 28);
  exportButton.style("background", "#8d8d8d");
  exportButton.style("color", "#f5f5f5");
  exportButton.style("border", "1px solid #9b9b9b");
  exportButton.style("border-radius", "2px");
  exportButton.mousePressed(exportGridSVG);

  myCircleUI = new CircleUI(UI_GRID_LEFT, CIRCLE_UI_TOP, "top left");
  myCircleUI2 = new CircleUI(
    UI_GRID_LEFT,
    CIRCLE_UI_TOP + UI_GRID_ROW_STEP,
    "bottom left"
  );
  myCircleUI3 = new CircleUI(UI_GRID_RIGHT, CIRCLE_UI_TOP, "top right");
  myCircleUI4 = new CircleUI(
    UI_GRID_RIGHT,
    CIRCLE_UI_TOP + UI_GRID_ROW_STEP,
    "bottom right"
  );

  mySpikeUI = new SpikeUI(UI_GRID_LEFT, SPIKE_UI_TOP, "top left");
  mySpikeUI2 = new SpikeUI(
    UI_GRID_LEFT,
    SPIKE_UI_TOP + UI_GRID_ROW_STEP,
    "bottom left"
  );
  mySpikeUI3 = new SpikeUI(UI_GRID_RIGHT, SPIKE_UI_TOP, "top right");
  mySpikeUI4 = new SpikeUI(
    UI_GRID_RIGHT,
    SPIKE_UI_TOP + UI_GRID_ROW_STEP,
    "bottom right"
  );

  myAnimator = new Animator();

  myArraySelector = new ArraySelector(bigBlendyArray, startArrayX, startArrayY);
}

let u;
let numCells = 10;

let stepsSliderVal;
let sl3aVal;

function draw() {
  bigBlendyArray = [];
  stepsSliderVal = numStepsSlider.value();
  sl3aVal = slider3a.value();
  const gridCount = stepsSliderVal + 1;

  spdSliderVal = spdSlider.value();

  background(10);

  myUI = new UI(0, 0, UI_PANEL_WIDTH, height);
  myUI.show();

  push();
  rectMode(CENTER);
  fill(10);
  rect(myUI.w / 2, PREVIEW_CENTER_Y, PREVIEW_BOX_SIZE);
  pop();

  myCircleUI.show();
  myCircleUI2.show();
  myCircleUI3.show();
  myCircleUI4.show();

  mySpikeUI.show();
  mySpikeUI2.show();
  mySpikeUI3.show();
  mySpikeUI4.show();

  push();
  translate(myUI.w, 0); // push the canvas the width of the UI.
  u = width / numCells;

  const drawableSize = min(width, height);
  const gridGap = min(MAIN_GRID_GAP, drawableSize / max(gridCount - 1, 1) / 3);
  const outerGridPadding = gridGap;
  const mainCellClipSize =
    (drawableSize - outerGridPadding * 2 - gridGap * (gridCount - 1)) / gridCount;
  const gridStarScale = mainCellClipSize / REFERENCE_CELL_CLIP_SIZE;
  const topLeftX = outerGridPadding + mainCellClipSize / 2;
  const topLeftY = outerGridPadding + mainCellClipSize / 2;
  const bottomRightX = drawableSize - outerGridPadding - mainCellClipSize / 2;
  const bottomRightY = drawableSize - outerGridPadding - mainCellClipSize / 2;

  let topLeftStar = new Star(
    topLeftX,
    topLeftY,
    sl3aVal,
    myCircleUI.horizRad * gridStarScale,
    myCircleUI.vertRad * gridStarScale,
    mySpikeUI.vertCircleButton.y * gridStarScale,
    mainCellClipSize
  );
  let bottomLeftStar = new Star(
    topLeftX,
    bottomRightY,
    sl3aVal,
    myCircleUI2.horizRad * gridStarScale,
    myCircleUI2.vertRad * gridStarScale,
    mySpikeUI2.vertCircleButton.y * gridStarScale,
    mainCellClipSize
  );

  let topRightStar = new Star(
    bottomRightX,
    topLeftY,
    sl3aVal,
    myCircleUI3.horizRad * gridStarScale,
    myCircleUI3.vertRad * gridStarScale,
    mySpikeUI3.vertCircleButton.y * gridStarScale,
    mainCellClipSize
  );

  let bottomRightStar = new Star(
    bottomRightX,
    bottomRightY,
    sl3aVal,
    myCircleUI4.horizRad * gridStarScale,
    myCircleUI4.vertRad * gridStarScale,
    mySpikeUI4.vertCircleButton.y * gridStarScale,
    mainCellClipSize
  );

  let topRowLerpStar = blendy(stepsSliderVal, topLeftStar, topRightStar);

  let bottomRowLerpStar = blendy(
    stepsSliderVal,
    bottomLeftStar,
    bottomRightStar
  );

  for (let j = 0; j <= stepsSliderVal; j++) {
    let intermediateBlendies = blendy(
      stepsSliderVal,
      topRowLerpStar[j],
      bottomRowLerpStar[j]
    );
    bigBlendyArray.push(intermediateBlendies);
  }

  currentGridExport = {
    drawableSize,
    grid: bigBlendyArray
  };

  myArraySelector.array = bigBlendyArray;
  myArraySelector.arrayX = constrain(myArraySelector.arrayX, 0, stepsSliderVal);
  myArraySelector.arrayY = constrain(myArraySelector.arrayY, 0, stepsSliderVal);

  let modulo = Math.round(map(spdSliderVal, 0, 100, 20, 2));
  if (frameCount % modulo === 0) {
    myArraySelector.move();
  }

  const selectedStar =
    bigBlendyArray[myArraySelector.arrayX][myArraySelector.arrayY];

  if (animatorToggle.checked()) {
    myAnimator.show(selectedStar, drawableSize, outerGridPadding);
  } else {
    push();
    rectMode(CENTER);
    strokeWeight(2);
    stroke(255);
    noFill();
    rect(
      selectedStar.centerX,
      selectedStar.centerY,
      selectedStar.clipSize
    );
    pop();
  }

  const previewScale = PREVIEW_CLIP_SIZE / selectedStar.clipSize;
  let testStar = new Star(
    myUI.w / 2 - myUI.w,
    PREVIEW_CENTER_Y,
    selectedStar.numVertices,
    selectedStar.horizRad * previewScale,
    selectedStar.vertRad * previewScale,
    selectedStar.spikeOffset * previewScale,
    PREVIEW_CLIP_SIZE
  );
  testStar.show();

  push();
  rectMode(CENTER);
  stroke(255);
  noFill();
  rect(
    testStar.centerX,
    testStar.centerY,
    PREVIEW_CLIP_SIZE
  );
  pop();

  pop();

  if (snapshotMode && frameCount >= snapshotFrame) {
    window.__SNAPSHOT_READY__ = true;
    noLoop();
  }
}

class Animator {
  constructor(selector) {
    this.selector = selector;
  }
  animate() {}
  show(selectedStar, drawableSize, outerGridPadding) {
    const previewAreaSize = drawableSize - outerGridPadding * 2;
    const previewCenter = outerGridPadding + previewAreaSize / 2;
    const animatorScale = previewAreaSize / selectedStar.clipSize;
    const animatorStar = new Star(
      previewCenter,
      previewCenter,
      selectedStar.numVertices,
      selectedStar.horizRad * animatorScale,
      selectedStar.vertRad * animatorScale,
      selectedStar.spikeOffset * animatorScale,
      previewAreaSize
    );

    push();
    rectMode(CORNER);
    noStroke();
    fill(10);
    rect(0, 0, drawableSize, drawableSize);
    pop();

    animatorStar.show();

    push();
    rectMode(CENTER);
    stroke(255);
    noFill();
    rect(animatorStar.centerX, animatorStar.centerY, animatorStar.clipSize);
    pop();
  }
}

class ArraySelector {
  constructor(array, arrayX, arrayY) {
    this.array = array;
    this.arrayX = arrayX;
    this.arrayY = arrayY;
    this.dirX = 1;
    this.dirY = 1;
  }

  move() {
    switch (direction) {
      case "right":
        this.arrayX += this.dirX;
        if (this.arrayX >= stepsSliderVal || this.arrayX <= 0) {
          this.arrayX = constrain(this.arrayX, 0, stepsSliderVal);
          this.dirX *= -1;
        }
        break;
      case "up":
        this.arrayY += this.dirY;
        if (this.arrayY >= stepsSliderVal || this.arrayY <= 0) {
          this.arrayY = constrain(this.arrayY, 0, stepsSliderVal);
          this.dirY *= -1;
        }
        break;
      case "left":
        this.arrayX += this.dirX;
        if (this.arrayX >= stepsSliderVal || this.arrayX <= 0) {
          this.arrayX = constrain(this.arrayX, 0, stepsSliderVal);
          this.dirX *= -1;
        }
        break;
      case "down":
        this.arrayY += this.dirY;
        if (this.arrayY >= stepsSliderVal || this.arrayY <= 0) {
          this.arrayY = constrain(this.arrayY, 0, stepsSliderVal);
          this.dirY *= -1;
        }
        break;
    }
  }
}

class Star {
  constructor(
    centerX,
    centerY,
    numVertices,
    horizRad,
    vertRad,
    spikeOffset,
    clipSize = 100
  ) {
    this.centerX = centerX;
    this.centerY = centerY;

    this.numVertices = numVertices;

    this.horizRad = horizRad; // width of ellipse
    this.vertRad = vertRad; // height of ellipse

    this.h = this.vertRad * 2 + this.spikeOffset;
    this.w = this.horizRad * 2 + this.spikeOffset;

    this.array = [];
    this.spikeOffset = spikeOffset;
    this.clipSize = clipSize;
  }

  show() {
    push();
    rectMode(CENTER);
    stroke(255);
    noFill();

    this.theta1 = 0;
    this.theta2 = 360 / this.numVertices / 2;

    push();
    stroke(100);
    rect(this.centerX, this.centerY, this.clipSize);
    pop();

    beginClip();
    rect(this.centerX, this.centerY, this.clipSize);
    endClip();

    beginShape();

    for (let i = 0; i < this.numVertices; i++) {
      this.x1 =
        this.centerX +
        (this.horizRad - this.spikeOffset) * cos(radians(this.theta1 - 90));
      this.y1 =
        this.centerY +
        (this.vertRad - this.spikeOffset) * sin(radians(this.theta1 - 90));

      this.x2 =
        this.centerX +
        (this.horizRad + this.spikeOffset) * cos(radians(this.theta2 - 90));
      this.y2 =
        this.centerY +
        (this.vertRad + this.spikeOffset) * sin(radians(this.theta2 - 90));

      vertex(this.x1, this.y1);
      vertex(this.x2, this.y2);

      this.theta1 += 360 / this.numVertices;
      this.theta2 += 360 / this.numVertices;
    }
    endShape(CLOSE);
    pop();
  }

  printArr() {
    print(this.array);
  }
}

function blendy(numSteps, star1, star2) {
  let starArray = [];

  for (let i = 0; i < numSteps + 1; i++) {
    let lerpy = i / numSteps;

    let positionLerp = new p5.Vector(
      lerp(star1.centerX, star2.centerX, lerpy),
      lerp(star1.centerY, star2.centerY, lerpy)
    );

    let horizRadLerp = lerp(star1.horizRad, star2.horizRad, lerpy);
    let vertRadLerp = lerp(star1.vertRad, star2.vertRad, lerpy);

    let spikeLerp = lerp(star1.spikeOffset, star2.spikeOffset, lerpy);

    let newStar = new Star(
      positionLerp.x,
      positionLerp.y,
      star1.numVertices,
      horizRadLerp,
      vertRadLerp,
      spikeLerp,
      star1.clipSize
    );
    newStar.show();
    starArray.push(newStar);
  }
  return starArray;
}

function findSelectorCenter() {
  let topLeft = new PVector(topLeftStar.centerX, topLeftStar.centerY);
  let topRight = new PVector(topRightStar.centerX, topRightStar.centerY);
}

function buildStarPathData(star) {
  let theta1 = 0;
  let theta2 = 360 / star.numVertices / 2;
  let commands = [];

  for (let i = 0; i < star.numVertices; i++) {
    const x1 =
      star.centerX + (star.horizRad - star.spikeOffset) * cos(radians(theta1 - 90));
    const y1 =
      star.centerY + (star.vertRad - star.spikeOffset) * sin(radians(theta1 - 90));
    const x2 =
      star.centerX + (star.horizRad + star.spikeOffset) * cos(radians(theta2 - 90));
    const y2 =
      star.centerY + (star.vertRad + star.spikeOffset) * sin(radians(theta2 - 90));

    commands.push(
      `${i === 0 ? "M" : "L"} ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `L ${x2.toFixed(2)} ${y2.toFixed(2)}`
    );

    theta1 += 360 / star.numVertices;
    theta2 += 360 / star.numVertices;
  }

  commands.push("Z");
  return commands.join(" ");
}

function exportGridSVG() {
  if (!currentGridExport || !currentGridExport.grid.length) {
    return;
  }

  const { drawableSize, grid } = currentGridExport;
  let clipDefs = [];
  let starMarkup = [];

  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      const star = grid[x][y];
      const clipId = `clip-${x}-${y}`;
      const clipX = star.centerX - star.clipSize / 2;
      const clipY = star.centerY - star.clipSize / 2;

      clipDefs.push(
        `<clipPath id="${clipId}"><rect x="${clipX.toFixed(2)}" y="${clipY.toFixed(2)}" width="${star.clipSize.toFixed(2)}" height="${star.clipSize.toFixed(2)}" /></clipPath>`
      );

      starMarkup.push(
        `<rect x="${clipX.toFixed(2)}" y="${clipY.toFixed(2)}" width="${star.clipSize.toFixed(2)}" height="${star.clipSize.toFixed(2)}" fill="none" stroke="#666" stroke-width="1" />`,
        `<path d="${buildStarPathData(star)}" fill="none" stroke="#fff" stroke-width="1.5" clip-path="url(#${clipId})" />`
      );
    }
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${drawableSize}" height="${drawableSize}" viewBox="0 0 ${drawableSize} ${drawableSize}">`,
    `<rect width="${drawableSize}" height="${drawableSize}" fill="#0a0a0a" />`,
    "<defs>",
    clipDefs.join(""),
    "</defs>",
    starMarkup.join(""),
    "</svg>"
  ].join("");

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "007-star-blender-grid.svg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

class SpikeUI {
  constructor(translateX, translateY, cornerIcon) {
    this.translateX = translateX;
    this.translateY = translateY;
    this.cornerIcon = cornerIcon;

    this.buttonX = 0;
    this.buttonY = 0;

    this.w = 120 * UI_CONTROL_SCALE;
    this.h = 120 * UI_CONTROL_SCALE;
    this.sidePointX = 45 * UI_CONTROL_SCALE;
    this.pointRadius = 15 * UI_CONTROL_SCALE;
    this.vertPadding = 10 * UI_CONTROL_SCALE;

    this.vertCircleButton = new CircleButton(
      0,
      this.buttonY,
      this.pointRadius,
      this.translateX,
      this.translateY,
      "y"
    );
  }

  drawCornerIcon() {
    push();
    translate(this.w / -2 + 8, this.h / -2 + 8);

    let circleSize = 7;

    let positions = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 }
    ];

    fill(70);
    noStroke();
    for (let i = 0; i < positions.length; i++) {
      circle(positions[i].x, positions[i].y, 7);
    }

    fill(220);
    switch (this.cornerIcon) {
      case "top left":
        circle(positions[0].x, positions[0].y, circleSize);
        break;
      case "top right":
        circle(positions[1].x, positions[1].y, circleSize);
        break;
      case "bottom left":
        circle(positions[2].x, positions[2].y, circleSize);
        break;
      case "bottom right":
        circle(positions[3].x, positions[3].y, circleSize);
        break;
    }
    pop();
  }

  show() {
    push();
    translate(this.translateX, this.translateY);
    this.drawCornerIcon();
    noFill();
    stroke(255);
    strokeWeight(2);

    for (let i = 0; i <= 15; i++) {
      let vertLerp = lerp(
        this.h / 2 - this.vertPadding,
        -this.h / 2 + this.vertPadding,
        i / 15
      );
      point(0, vertLerp);
    }

    beginShape();
    vertex(-this.sidePointX, -this.vertCircleButton.y);
    vertex(this.vertCircleButton.x, this.vertCircleButton.y);
    vertex(this.sidePointX, -this.vertCircleButton.y);
    endShape();

    push();
    fill(100);
    circle(-this.sidePointX, -this.vertCircleButton.y, this.pointRadius);
    circle(this.sidePointX, -this.vertCircleButton.y, this.pointRadius);
    pop();

    this.vertCircleButton.show();

    noFill();
    rectMode(CENTER);
    rect(0, 0, this.w, this.h);
    pop();
  }

  update() {
    this.yRad = -this.vertCircleButton.y;
  }
}

class CircleButton {
  constructor(x, y, radius, translateX, translateY, axis) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.translateX = translateX;
    this.translateY = translateY;
    this.axis = axis;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  show() {
    fill(this.isMouseOver() ? 255 : 200);
    if (this.isDragging) {
      fill(255);
    }
    ellipse(this.x, this.y, this.radius);
  }

  isMouseOver() {
    let adjustedMouseX = mouseX - this.translateX;
    let adjustedMouseY = mouseY - this.translateY;
    return dist(adjustedMouseX, adjustedMouseY, this.x, this.y) < this.radius;
  }

  handleMousePressed() {
    if (this.isMouseOver() && !activeButton) {
      this.isDragging = true;
      activeButton = this;

      this.dragOffsetX = mouseX - this.translateX - this.x;
      this.dragOffsetY = mouseY - this.translateY - this.y;
    }
  }

  handleMouseDragged() {
    if (this.isMouseOver && activeButton === this) {
      if (this.axis === "x" || this.axis === "both") {
        this.x = mouseX - this.translateX - this.dragOffsetX;
      }
      if (this.axis === "y" || this.axis === "both") {
        this.y = mouseY - this.translateY - this.dragOffsetY;
      }
    }
  }

  handleMouseReleased() {
    this.isDragging = false;
    activeButton = null;
  }
}

class CircleUI {
  constructor(translateX, translateY, cornerIcon) {
    this.translateX = translateX;
    this.translateY = translateY;
    this.horizRad = 50 * UI_CONTROL_SCALE;
    this.vertRad = 50 * UI_CONTROL_SCALE;
    this.cornerIcon = cornerIcon;

    this.w = 120 * UI_CONTROL_SCALE;
    this.h = 120 * UI_CONTROL_SCALE;
    this.buttonRadius = 15 * UI_CONTROL_SCALE;

    this.horizCircleButton = new CircleButton(
      this.horizRad,
      0,
      this.buttonRadius,
      this.translateX,
      this.translateY,
      "x"
    );

    this.vertCircleButton = new CircleButton(
      0,
      -this.vertRad,
      this.buttonRadius,
      this.translateX,
      this.translateY,
      "y"
    );
  }

  drawCornerIcon() {
    push();
    translate(this.w / -2 + 8, this.h / -2 + 8);

    let circleSize = 7;

    let positions = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 }
    ];

    fill(70);
    noStroke();
    for (let i = 0; i < positions.length; i++) {
      circle(positions[i].x, positions[i].y, 7);
    }

    fill(220);
    switch (this.cornerIcon) {
      case "top left":
        circle(positions[0].x, positions[0].y, circleSize);
        break;
      case "top right":
        circle(positions[1].x, positions[1].y, circleSize);
        break;
      case "bottom left":
        circle(positions[2].x, positions[2].y, circleSize);
        break;
      case "bottom right":
        circle(positions[3].x, positions[3].y, circleSize);
        break;
    }
    pop();
  }

  show() {
    push();
    translate(this.translateX, this.translateY);
    this.drawCornerIcon();

    noFill();
    stroke(255);
    strokeWeight(2);

    beginShape();
    for (let i = 0; i < 360; i++) {
      let x = this.horizRad * cos(radians(i));
      let y = this.vertRad * sin(radians(i));
      vertex(x, y);
    }
    endShape();

    strokeWeight(2);
    for (let i = 0; i <= 15; i++) {
      let horizLerp = lerp(-this.horizRad, this.horizRad, i / 15);
      point(horizLerp, 0);
      let vertLerp = lerp(-this.vertRad, this.vertRad, i / 15);
      point(0, vertLerp);
    }

    this.horizCircleButton.show();
    this.vertCircleButton.show();

    noFill();
    rectMode(CENTER);
    rect(0, 0, this.w, this.h);
    pop();
  }

  update() {
    this.horizRad = this.horizCircleButton.x;
    this.vertRad = -this.vertCircleButton.y;
  }
}

class UI {
  constructor(xCorner, yCorner, w, h) {
    this.xCorner = xCorner;
    this.yCorner = yCorner;
    this.w = w;
    this.h = h;
  }
  show() {
    fill(100);
    rect(this.xCorner, this.yCorner, this.w, this.h);
    fill(255);

    push();
    fill(255);
    textAlign(LEFT, CENTER);
    text("numSteps", SLIDER_X + 4, SLIDER_START_Y + 30);
    text("numSides", SLIDER_X + 4, SLIDER_START_Y + SLIDER_GAP + 30);
    text("speed", SLIDER_X + 4, SLIDER_START_Y + SLIDER_GAP * 2 + 30);
    text("fullScreen", SLIDER_X + 28, TOGGLE_CENTER_Y);
    pop();
  }
}

function keyPressed() {
  switch (keyCode) {
    case LEFT_ARROW:
      direction = "left";
      myArraySelector.dirX = -1;
      break;
    case RIGHT_ARROW:
      direction = "right";
      myArraySelector.dirX = 1;
      break;
    case UP_ARROW:
      direction = "up";
      myArraySelector.dirY = -1;
      break;
    case DOWN_ARROW:
      direction = "down";
      myArraySelector.dirY = 1;
      break;
  }
}

function mousePressed() {
  myCircleUI.horizCircleButton.handleMousePressed();
  myCircleUI.vertCircleButton.handleMousePressed();

  myCircleUI2.horizCircleButton.handleMousePressed();
  myCircleUI2.vertCircleButton.handleMousePressed();

  myCircleUI3.horizCircleButton.handleMousePressed();
  myCircleUI3.vertCircleButton.handleMousePressed();

  myCircleUI4.horizCircleButton.handleMousePressed();
  myCircleUI4.vertCircleButton.handleMousePressed();

  mySpikeUI.vertCircleButton.handleMousePressed();
  mySpikeUI.update();

  mySpikeUI2.vertCircleButton.handleMousePressed();
  mySpikeUI2.update();

  mySpikeUI3.vertCircleButton.handleMousePressed();
  mySpikeUI3.update();

  mySpikeUI4.vertCircleButton.handleMousePressed();
  mySpikeUI4.update();
}

function mouseDragged() {
  myCircleUI.horizCircleButton.handleMouseDragged();
  myCircleUI.vertCircleButton.handleMouseDragged();
  myCircleUI.update();

  myCircleUI2.horizCircleButton.handleMouseDragged();
  myCircleUI2.vertCircleButton.handleMouseDragged();
  myCircleUI2.update();

  myCircleUI3.horizCircleButton.handleMouseDragged();
  myCircleUI3.vertCircleButton.handleMouseDragged();
  myCircleUI3.update();

  myCircleUI4.horizCircleButton.handleMouseDragged();
  myCircleUI4.vertCircleButton.handleMouseDragged();
  myCircleUI4.update();

  mySpikeUI.vertCircleButton.handleMouseDragged();
  mySpikeUI.update();

  mySpikeUI2.vertCircleButton.handleMouseDragged();
  mySpikeUI2.update();

  mySpikeUI3.vertCircleButton.handleMouseDragged();
  mySpikeUI3.update();

  mySpikeUI4.vertCircleButton.handleMouseDragged();
  mySpikeUI4.update();
}

function mouseReleased() {
  myCircleUI.horizCircleButton.handleMouseReleased();
  myCircleUI.vertCircleButton.handleMouseReleased();

  myCircleUI2.horizCircleButton.handleMouseReleased();
  myCircleUI2.vertCircleButton.handleMouseReleased();

  myCircleUI3.horizCircleButton.handleMouseReleased();
  myCircleUI3.vertCircleButton.handleMouseReleased();

  myCircleUI4.horizCircleButton.handleMouseReleased();
  myCircleUI4.vertCircleButton.handleMouseReleased();

  mySpikeUI.vertCircleButton.handleMouseReleased();
  mySpikeUI2.vertCircleButton.handleMouseReleased();
  mySpikeUI3.vertCircleButton.handleMouseReleased();
  mySpikeUI4.vertCircleButton.handleMouseReleased();
}

function drawGrid() {
  stroke(100);
  strokeWeight(2);
  noFill();

  let cols = 10;
  let rows = 10;
  let spacingX = width / cols;
  let spacingY = height / rows;

  for (let col = 0; col <= cols; col++) {
    line(col * spacingX, 0, col * spacingX, height);
  }

  for (let row = 0; row <= 20; row++) {
    line(0, row * spacingX, width, row * spacingX);
  }
}

function star() {
  stroke(255);
  noFill();
  let rad = 100;
  let theta = 0;

  let rad2 = 20;
  let theta2 = 10;
  let x2 = 0;
  let y2 = 0;

  let numVertices = 20;

  beginShape();
  for (let i = 0; i < numVertices; i++) {
    let x = rad * cos(radians(theta));
    let y = rad * sin(radians(theta));

    vertex(rad * cos(radians(theta)), rad * sin(radians(theta)));
    vertex(rad2 * cos(radians(theta2)), rad2 * sin(radians(theta2)));

    theta += 360 / numVertices;
    theta2 += 360 / numVertices;
  }
  endShape(CLOSE);
}
