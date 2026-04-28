let importStateBtn;
let importStateInput;

let exportStateBtn;
const EXPORT_VERSION = 1;
let SETUP_RANDOM_SEED = 395; // replace hardcoded setup seed usage

let exportInsetSlider;
let exportBounds = { x: 0, y: 0, w: 0, h: 0 };

let myP;
let particleArray = [];
let lineArray; // instantiated in draw() = update every frame.

let attractorArray = [];
let attractorLineArray; //instantiated in draw() = update every frame.

let orbitAttractor;
let orbitAttractorIndex = -999; // special index to identify it

// UI HERE:
let menuDiv;
let blocks = [];
let boundsBlock;

let bounds;

const UI_WIDTH = 240;

const w = 600 + UI_WIDTH;
const h = 600;
const attractorRadii = w / 8; //should be width/3
// const aBlastRadiusttractor = 20;
let attractorBlastRadius;
// const particleSize = 8; //should be width/40.
let numParticlesSliderDefault = 600;
let particleSizeSliderDefault = 8;
let particleSize = particleSizeSliderDefault;

// const numAttractors = 4;
let numAttractors = 6; // NEEDS to match slider default;
let mainColor = 220;
let numFrames = 45;
let targetFrameRate = 10;
let attractorRadWigglePhase = 3; // 1,2,3,4. The number of times in numFrames that the wiggle happens.

let drawAttractorRad = false;
const drawAttractorLines = true;

let drawSquare = false;

// let drawParticlesCheckbox;
// let drawAttractorsCheckbox;
let pNumbersCheckbox;
let aNumbersCheckbox;
let orbitingAttractorCheckbox;

let aToPLinesCheckbox; // attractor -> particle lines
let aToALinesCheckbox; // lines between attractors
// let attractorRadCheckbox; // attractor radius

// let modeRadio; // wiggle/blast/none
let particleDrawRadio; // "all" vs "attracted"

// let aLinesCheckbox;

//slowly migrating these to UI blocks:
// let blastSlider;
// let numAttractorsSlider;
// let particleRoamAmpSlider;
// let attractorRadiusSlider;

let boundsSlider;
let boundsRevealFrames = 0; // countdown for red bounds display
let exportBoundsRevealFrames = 0;
let attrRadRevealFrames = 0;

let maxInset;
const snapshotParams = new URLSearchParams(window.location.search);
const snapshotMode = snapshotParams.get("snapshot") === "1";
const snapshotFrame = Number.parseInt(snapshotParams.get("frame") || "45", 10);

function setup() {
  menuDiv = createDiv("");
  menuDiv.addClass("menu");

  createCanvas(w, h);

  drawOffsetX = UI_WIDTH;
  drawAreaW = width - UI_WIDTH;

  // drawParticlesCheckbox = createCheckbox("draw Particles", true);
  // drawAttractorsCheckbox = createCheckbox("draw Attractors", false);

  pNumbersCheckbox = createCheckbox("particle numbers", false);
  aNumbersCheckbox = createCheckbox("attractor numbers", false);

  aToPLinesCheckbox = createCheckbox("attractor to particle lines", true);
  aToALinesCheckbox = createCheckbox("lines between attractors", false);

  // attractorRadCheckbox = createCheckbox("attractor radius", false);

  orbitingAttractorCheckbox = createCheckbox("orbiting attractor", false);

  // modeRadio = createRadio();
  // modeRadio.option("wiggle", "wiggle");
  // modeRadio.option("blast", "blast");
  // modeRadio.option("none", "none");
  // modeRadio.selected("none"); // default
  // // modeRadio.position(10, 10);
  let pSzOpts = ["numbers", "particles"];
  particleSizeBlock = new sliderBlock(
    "[particleSize]",
    1,
    100,
    particleSizeSliderDefault,
    1
  );
  particleSizeBlock.addRadio(pSzOpts);
  particleSizeBlock.container.parent(menuDiv);
  blocks.push(particleSizeBlock);

  numParticlesBlock = new sliderBlock(
    "[numParticles]",
    0,
    1200,
    numParticlesSliderDefault,
    1,
    true,
    true,
    "draw"
  );
  let pOpts = ["draw attracted", "draw all"];
  numParticlesBlock.addRadio(pOpts);
  numParticlesBlock.container.parent(menuDiv);
  numParticlesBlock.slider.input(rebuildParticles);
  blocks.push(numParticlesBlock);

  numAttrBlock = new sliderBlock(
    "[numAttractors]",
    0,
    60,
    6,
    1,
    true,
    true,
    "draw"
  );
  numAttrBlock.container.parent(menuDiv);
  numAttrBlock.slider.input(rebuildAttractors);
  blocks.push(numAttrBlock);

  wiggleBlastBlock = new sliderBlock("[wiggle/blast range]", 0, 200, 10);
  let wbOpts = ["blast", "wiggle", "none"];
  wiggleBlastBlock.addRadio(wbOpts);
  wiggleBlastBlock.container.parent(menuDiv);
  blocks.push(wiggleBlastBlock);

  const minSide = 20;
  const maxSide = min(width, height);
  const defaultSide = maxSide / 2;

  boundsBlock = new sliderBlock("[bounds]", minSide, maxSide, defaultSide, 1);
  boundsBlock.container.parent(menuDiv);
  // createSlider(minSide, maxSide, defaultSide, 1);
  boundsBlock.slider.input(() => {
    boundsRevealFrames = 5;
    updateBoundsFromSlider();
    remapHomesToBounds(); // now correct because it uses u0/v0
  });
  blocks.push(boundsBlock);

  maxInset = floor(min(drawAreaW, height) / 2) - 1;
  exportInsetBlock = new sliderBlock("[exportBounds]", 0, maxInset, 0, 1);
  exportInsetBlock.container.parent(menuDiv);
  exportInsetBlock.slider.input(() => {
    exportBoundsRevealFrames = 5;
    updateExportBounds();
  });
  blocks.push(exportInsetBlock);

  // particleDrawRadio = createRadio();
  // particleDrawRadio.option("all", "draw all"); // second arg is label.
  // particleDrawRadio.option("attracted", "draw attracted");
  // particleDrawRadio.selected("all"); // default

  // createP("wiggle/blast range");
  // blastSlider = createSlider(0, 200, 10);

  // createP("# attractors");
  // numAttractorsSlider = createSlider(0, 20, 6);
  // numAttractorsSlider.input(rebuildAttractors); // runs when slider moves

  // let pRA = createP("particle roam amp");
  // pRA.position(0,0);
  // particleRoamAmpSlider = createSlider(0, 50, 9, 0.1);

  // let aRS = createP("atttractor radius");
  // attractorRadiusSlider = createSlider(1, min(w, h) / 2, attractorRadii, 1);

  attractorRadiusBlock = new sliderBlock(
    "[attractorRadius]",
    1,
    min(w, h) / 2,
    attractorRadii,
    1,
    true,
    false,
    "show"
  );
  attractorRadiusBlock.container.parent(menuDiv);
  attractorRadiusBlock.slider.input(() => {
    attrRadRevealFrames = 3;
  });
  blocks.push(attractorRadiusBlock);

  particleRoamAmpBlock = new sliderBlock("[particleSpeed]", 0, 50, 9, 0.1);
  particleRoamAmpBlock.container.parent(menuDiv);
  blocks.push(particleRoamAmpBlock);

  frameRate(targetFrameRate);

  randomSeed(SETUP_RANDOM_SEED);
  // print(`random seed ${rando}`);

  importStateBtn = createButton("import settings from JSON");
  importStateBtn.parent(menuDiv);

  importStateInput = createFileInput(handleImportFile);
  importStateInput.parent(menuDiv);
  importStateInput.hide();

  importStateBtn.mousePressed(() => importStateInput.elt.click());

  exportStateBtn = createButton("export settings to JSON");
  exportStateBtn.parent(menuDiv);
  exportStateBtn.mousePressed(exportStateJSON);

  updateBoundsFromSlider(); // initialize bounds based on slider
  updateExportBounds();

  orbitAttractor = new Attractor(
    width / 2,
    height / 2,
    particleSize,
    attractorRadii,
    orbitAttractorIndex
  );

  rebuildAttractors();
  rebuildParticles();
  initHomeUVFromCurrentBounds();
}

let theta = 0;

function draw() {
  translate(drawOffsetX, 0);
  const f = frameCount % numFrames;
  const t = f / numFrames;
  const phi = TWO_PI * t;

  updateBoundsFromSlider();

  const orbitCx = bounds.x + bounds.w * 0.5;
  const orbitCy = bounds.y + bounds.h * 0.5;

  particleSize = particleSizeBlock.getValue();

  const aRad = attractorRadiusBlock.getValue();
  orbitAttractor.rad = aRad; // attraction reach only (can extend beyond bounds)

  const percentage = 0.8; // 0.8 = 80%, 0.9 = 90%
  const gap = 2; // pixels from bounds edge

  const boundsSide = min(bounds.w, bounds.h);

  // Only keep the *dot* inside bounds (not the attraction radius)
  const dotPad = orbitAttractor.size * 0.5 + gap;

  // target orbit radius based on bounds size
  const targetR = boundsSide * 0.5 * percentage;

  // maximum orbit radius that keeps the dot inside bounds
  const maxRThatFits = max(0, boundsSide * 0.5 - dotPad);

  // final orbit radius
  const orbitR = min(targetR, maxRThatFits);

  orbitAttractor.x = orbitCx + orbitR * cos(phi);
  orbitAttractor.y = orbitCy + orbitR * sin(phi);

  orbitAttractor.x0 = orbitAttractor.x;
  orbitAttractor.y0 = orbitAttractor.y;

  lineArray = [];
  attractorLineArray = [];
  attractorBlastRadius = wiggleBlastBlock.getValue();

  numParticles = numParticlesBlock.getValue();

  for (let i = 0; i < attractorArray.length; i++) {
    attractorArray[i].rad = aRad;
  }
  orbitAttractor.rad = aRad;

  let particleRoamAmpVal = particleRoamAmpBlock.getValue();

  let cnvBG = 22;

  background(cnvBG);
  fill(0);

  if (
    attractorRadiusBlock.checkbox &&
    attractorRadiusBlock.checkbox.checked()
  ) {
    for (let i = 0; i < attractorArray.length; i++) {
      attractorArray[i].drawRad();
    }
    if (orbitingAttractorCheckbox.checked()) orbitAttractor.drawRad();
  }

  // --- bounds reveal (red square) ---
  if (boundsRevealFrames > 0) {
    push();
    noFill();
    stroke(255, 0, 0);
    strokeWeight(2);
    rect(bounds.x, bounds.y, bounds.w, bounds.h);

    const txtSz = 16;
    let thresholdForTxt = w - UI_WIDTH - (txtSz * 2 + 10);
    noStroke();
    fill(255, 0, 0);
    if (bounds.w < thresholdForTxt) {
      let exportMeasurement = (bounds.w / 96).toFixed(2); // 72 ppi for svgs...
      textAlign(RIGHT, TOP);
      textSize(txtSz);
      text(
        `exportBounds: ${exportMeasurement}\"`,
        bounds.x + bounds.h,
        bounds.y + bounds.h + 4
      );
    }

    pop();

    boundsRevealFrames--;
  }

  if (exportBoundsRevealFrames > 0) {
    push();
    noFill();
    stroke(255, 0, 0);
    strokeWeight(10);

    drawExportCropOverlay(exportBounds);

    pop();
    exportBoundsRevealFrames--;
  }

  // --- attractor rad reveal (red circle) ---
  if (attrRadRevealFrames > 0) {
    push();
    noFill();
    stroke(255, 0, 0);
    strokeWeight(2);
    for (let i = 0; i < attractorArray.length; i++) {
      let a = attractorArray[i];
      circle(a.x, a.y, a.rad * 2);
    }
    attrRadRevealFrames--;
    pop();
  }

  // 1) UPDATE ATTRACTORS FIRST
  for (let i = 0; i < attractorArray.length; i++) {
    attractorArray[i].move(bounds, numFrames);
  }

  // 2) UPDATE PARTICLES (move -> detect -> blast)
  for (let i = 0; i < particleArray.length; i++) {
    const p1 = particleArray[i];
    p1.amp = particleRoamAmpVal;

    p1.move(bounds, numFrames);

    // reset once per particle
    p1.isAttracted = false;
    p1.whichAttractor = -1;

    // first: test normal attractors
    for (let j = 0; j < attractorArray.length; j++) {
      p1.isItAttracted(attractorArray[j], j);
      if (p1.isAttracted) break;
    }

    // if none matched, test the orbit attractor ONLY if enabled
    if (!p1.isAttracted && orbitingAttractorCheckbox.checked()) {
      p1.isItAttracted(orbitAttractor, orbitAttractorIndex);
    }

    // apply behavior once
    if (p1.isAttracted) {
      let a1 = null;
      if (p1.whichAttractor === orbitAttractorIndex) a1 = orbitAttractor;
      else if (p1.whichAttractor >= 0) a1 = attractorArray[p1.whichAttractor];

      if (a1) {
        const mode = wiggleBlastBlock.getRadio();
        if (mode === "wiggle") p1.attractorRadWiggle(a1);
        else if (mode === "blast") p1.attractorBlast(a1);
      }
    }
  }

  // 3) BUILD LINES USING FINAL POSITIONS
  const allowOrbitLines = orbitingAttractorCheckbox.checked();

  for (let i = 0; i < particleArray.length; i++) {
    const p1 = particleArray[i];
    if (!p1.isAttracted || p1.whichAttractor === -1) continue;

    // If orbit attractor is hidden, don't draw lines to it
    if (!allowOrbitLines && p1.whichAttractor === orbitAttractorIndex) continue;

    let a1 = null;
    if (p1.whichAttractor === orbitAttractorIndex) a1 = orbitAttractor;
    else if (p1.whichAttractor >= 0) a1 = attractorArray[p1.whichAttractor];

    if (a1) attractorLineArray.push(new ParticleLine(p1.x, p1.y, a1.x, a1.y));
  }

  // 4) RENDER LINES
  if (aToPLinesCheckbox.checked()) {
    for (let k = 0; k < attractorLineArray.length; k++) {
      attractorLineArray[k].drawLine(1, mainColor);
    }
  }

  // 5) RENDER PARTICLES / NUMBERS
  const drawMode = numParticlesBlock.getRadio(); // "all" | "attracted"

  for (let i = 0; i < particleArray.length; i++) {
    const p1 = particleArray[i];

    // respect the radio filter for BOTH circles and numbers
    if (drawMode === "draw attracted" && !p1.isAttracted) continue;

    if (
      // numParticlesBlock.checkbox &&
      numParticlesBlock.checkbox.checked()
    ) {
      p1.setParticleSize(particleSize);
      p1.bg(particleSize * 2.0, cnvBG);
      p1.show(mainColor, mainColor);
    }

    // draw numbers independently
    if (pNumbersCheckbox.checked()) {
      p1.setParticleSize(particleSize);
      p1.showNumber();
    }
  }

  // 6) RENDER ATTRACTORS (after movement)

  if (numAttrBlock.checkbox.checked()) {
    for (let i = 0; i < attractorArray.length; i++) {
      const a1 = attractorArray[i];
      a1.setParticleSize(particleSize);
      a1.bg(particleSize * 2.0, cnvBG);
      a1.show(mainColor, mainColor);
      if (aNumbersCheckbox.checked()) a1.showNumber();
      // if (attractorRadCheckbox.checked()) a1.drawRad();
    }
  }

  if (orbitingAttractorCheckbox.checked()) {
    // draw the orbiting attractor too
    orbitAttractor.setParticleSize(particleSize);
    if (numAttrBlock.checkbox.checked()) {
      orbitAttractor.bg(particleSize * 2.0, cnvBG);
      orbitAttractor.show(mainColor, mainColor);
    }
    if (aNumbersCheckbox.checked()) orbitAttractor.showNumber();
    // if (attractorRadCheckbox.checked()) orbitAttractor.drawRad();
  }

  if (aToALinesCheckbox.checked()) {
    for (let i = 0; i < attractorArray.length; i++) {
      for (let j = i + 1; j < attractorArray.length; j++) {
        const a = attractorArray[i];
        const b = attractorArray[j];
        line(a.x, a.y, b.x, b.y);
      }
    }
  }

  drawExportCropOverlay(exportBounds);

  if (snapshotMode && frameCount >= snapshotFrame) {
    window.__SNAPSHOT_READY__ = true;
    noLoop();
  }

  theta += 360 / numFrames;
  // endRecordSvg();
}

class ParticleLine {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.lockedToCircle = false;
  }

  drawLine(strWeight, strokeCol) {
    push();
    strokeWeight(strWeight);
    stroke(strokeCol);
    line(this.x1, this.y1, this.x2, this.y2);
    pop();
  }
}

class Particle {
  constructor(x, y, size, number, seed = 1234) {
    // home (start) position
    this.x0 = x;
    this.y0 = y;

    this.ox0 = x;
    this.oy0 = y;

    // current position
    this.x = x;
    this.y = y;

    this.size = size;

    this.number = number;

    this.isAttracted = false;
    this.whichAttractor = -1; // -1 means none; will change.

    this.baseR = 0;
    this.wiggleOffset = floor(random(numFrames));

    // unique-ish noise-space center per particle
    this.cx = seed * 1000 + random(1000);
    this.cy = seed * 2000 + random(1000);

    // how wide we loop through 2D noise space
    this.noiseRadius = 1.5;

    // how far the particle roams in pixels around (x0,y0)
    this.amp = 9;

    this.wcx = seed * 3000 + random(1000);
    this.wcy = seed * 4000 + random(1000);
    this.wPhase = random(TWO_PI);

    // baseline so wiggle is exactly 0 at frame 0
    const wu0 = this.wcx + 1.0 * cos(this.wPhase);
    const wv0 = this.wcy + 1.0 * sin(this.wPhase);
    this.wBase = noise(wu0, wv0);

    // de-sync particles but still start at center (via baseline subtraction)
    this.phase = random(TWO_PI);

    // --- baseline so at frameCount==0, offset is exactly 0 ---
    const u1 = this.cx + this.noiseRadius * cos(this.phase);
    const v1 = this.cy + this.noiseRadius * sin(this.phase);

    const u2 = this.cx + this.noiseRadius * cos(this.phase + 100.0);
    const v2 = this.cy + this.noiseRadius * sin(this.phase + 100.0);

    this.baseX = noise(u1, v1);
    this.baseY = noise(u2, v2);
  }

  setParticleSize(size) {
    this.size = size;
  }

  attractorRadWiggle(attractorParticle) {
    if (this.isAttracted) {
      let a1 = attractorParticle;

      let theta = this.findTheta(a1);

      //attractor x and y
      let cx = a1.x;
      let cy = a1.y;

      let period = max(1, numFrames / attractorRadWigglePhase);

      let f = (frameCount + this.wiggleOffset) % period;
      let t = f / period;

      let minV = 0;
      let maxV = attractorBlastRadius;

      let v01 = 0.5 - 0.5 * cos(TWO_PI * t); // 0..1
      let v = map(v01, 0, 1, minV, maxV);
      let r = this.baseR + v;

      //   let p2 = attractorParticle;
      //   let distance = dist(p2.x, p2.y, this.x, this.y);
      //   return distance;
      // }

      this.x = cx + r * cos(theta);
      this.y = cy + r * sin(theta);
    }
  }

  attractorBlast(attractorParticle) {
    if (this.isAttracted) {
      let a1 = attractorParticle;

      let theta = this.findTheta(a1);

      let cx = a1.x;
      let cy = a1.y;

      let period = numFrames;
      let f = frameCount % period;
      let t = f / period;
      let hold = 0.4;
      let t2 = t < hold ? 0 : (t - hold) / (1 - hold); // 0..1 after hold

      let minV = 0;
      let maxV = attractorBlastRadius;

      let s = sin(TWO_PI * t2 - HALF_PI); // [-1, 1]
      let v = map(s, -1, 1, minV, maxV);

      let r = this.findDist(a1) + v;

      //   let p2 = attractorParticle;
      //   let distance = dist(p2.x, p2.y, this.x, this.y);
      //   return distance;
      // }

      this.x = cx + r * cos(theta);
      this.y = cy + r * sin(theta);
    }
  }

  show(strokeColor, fillColor = 0) {
    stroke(strokeColor);
    fill(fillColor);
    circle(this.x, this.y, this.size);
  }

  showNumber() {
    push();
    fill(0);
    noStroke();
    textSize(this.size * 0.6);
    textAlign(CENTER, CENTER);
    text(this.number.toString(), this.x, this.y);
    pop();
  }

  bg(margin, fillColor = 255) {
    push();
    noStroke();
    fill(fillColor);
    circle(this.x, this.y, margin);
    pop();
  }

  move(bounds, numFrames) {
    // looping phase: completes exactly one revolution in numFrames frames
    const phi = (TWO_PI * (frameCount % numFrames)) / numFrames + this.phase;

    // sample noise on a circle in 2D noise space
    const u1 = this.cx + this.noiseRadius * cos(phi);
    const v1 = this.cy + this.noiseRadius * sin(phi);

    const u2 = this.cx + this.noiseRadius * cos(phi + 100.0);
    const v2 = this.cy + this.noiseRadius * sin(phi + 100.0);

    // subtract baseline so at frameCount==0 the particle is exactly at (x0,y0)
    const nx = (noise(u1, v1) - this.baseX) * 2; // roughly in [-1,1], centered at 0
    const ny = (noise(u2, v2) - this.baseY) * 2;

    // direct position (no integration) => perfectly looping
    this.x = this.x0 + nx * this.amp;
    this.y = this.y0 + ny * this.amp;

    // keep inside bounds (account for particle radius so circles don't clip)
    const rad = this.size * 0.5;
    const minX = bounds.x + rad;
    const maxX = bounds.x + bounds.w - rad;
    const minY = bounds.y + rad;
    const maxY = bounds.y + bounds.h - rad;

    this.x = constrain(this.x, minX, maxX);
    this.y = constrain(this.y, minY, maxY);
  }

  isItAttracted(attractor, index) {
    const d = dist(attractor.x, attractor.y, this.x, this.y);

    if (d < attractor.rad) {
      if (!this.isAttracted) {
        // only on the moment it becomes attracted
        this.baseR = d; // capture baseline radius
      }
      this.isAttracted = true;
      this.whichAttractor = index;
    }
  }

  //do this in a for-loop to return each particle that's attracted.
  //in this for-loop, add, say, 100px to the r value when calculated. This will require another field in the particle class: "addedAttractorRad".
  // Add new function to particle that contains another noise seed, based on numFrames, that adds a noisy radius value.
  whichIndIsItAttractedTo(attractorArray) {
    for (let i = 0; i < attractorArray.length; i++) {
      if (this.isAttracted) {
        return this.number;
      }
    }
  }

  findDist(attractorParticle) {
    let p2 = attractorParticle;
    let distance = dist(p2.x, p2.y, this.x, this.y);
    return distance;
  }

  //helper function; placed in
  findTheta(attractorParticle) {
    let p2 = attractorParticle;
    //     const theta = atan2(p2.y - this.y, p2.x - this.x);
    const theta = atan2(this.y - p2.y, this.x - p2.x);
    return theta;
  }
}

class Attractor extends Particle {
  constructor(x, y, size, rad, number, seed = 1234) {
    super(x, y, size, number, seed);
    this.rad = rad;
  }

  //   setRad(rad) {
  //     this.rad = rad;
  //   }

  drawRad() {
    push();
    noFill();
    strokeWeight(1);
    stroke(mainColor);
    circle(this.x, this.y, this.rad * 2);
    pop();
  }
}

function updateExportBounds() {
  const inset = exportInsetBlock.getValue();
  const drawX = UI_WIDTH; // was drawOffsetX (which was half)
  const drawW = width - UI_WIDTH;

  const side = min(drawW, height) - inset * 2;
  exportBounds.w = side;
  exportBounds.h = side;
  exportBounds.x = drawX + (drawW - side) * 0.5;
  exportBounds.y = (height - side) * 0.5;
}

function drawExportCropOverlay(b) {
  push();
  resetMatrix(); // draw in screen coords, not translated world

  noStroke();
  fill(240, 170);

  rect(0, 0, width, b.y); // top
  rect(0, b.y, b.x, b.h); // left
  rect(b.x + b.w, b.y, width - (b.x + b.w), b.h); // right
  rect(0, b.y + b.h, width, height - (b.y + b.h)); // bottom

  noFill();
  stroke(255);
  strokeWeight(4);
  rect(b.x, b.y, b.w, b.h);

  noStroke();
  fill(0);

  const txtSz = 16;
  let thresholdForTxt = w - UI_WIDTH - (txtSz * 2 + 10);

  if (b.w < thresholdForTxt) {
    let exportMeasurement = (b.w / 96).toFixed(2); // 72 ppi for svgs...
    textAlign(RIGHT, TOP);
    textSize(txtSz);
    text(`exportBounds: ${exportMeasurement}\"`, b.x + b.h, b.y + b.h + 4);
  }
  pop();
}

let ATTRACTOR_SEED = 395;
function rebuildAttractors() {
  numAttractors = numAttrBlock.getValue();

  randomSeed(ATTRACTOR_SEED);
  attractorArray = [];

  const overlapFactor = 0.5;   // 1.0 = strict no-overlap, 0.5 = "lazy"
  const maxAttempts = 40;      // per particle

  for (let i = 0; i < numAttractors; i++) {
    let placed = false;
    let x = 0;
    let y = 0;

    for (let a = 0; a < maxAttempts; a++) {
      x = random(bounds.x, bounds.x + bounds.w);
      y = random(bounds.y, bounds.y + bounds.h);

      let ok = true;
      for (let j = 0; j < attractorArray.length; j++) {
        const p = attractorArray[j];
        const d = dist(x, y, p.x0, p.y0);

        // lazy threshold: allow overlap by shrinking minimum center distance
        const minD = ((particleSize * 0.5) + (p.size * 0.5)) * overlapFactor;

        if (d < minD) {
          ok = false;
          break;
        }
      }

      if (ok) {
        placed = true;
        break;
      }
    }

    // fallback: accept last sampled point if packing fails
    if (!placed) {
      x = random(bounds.x, bounds.x + bounds.w);
      y = random(bounds.y, bounds.y + bounds.h);
    }

  const aRad = attractorRadiusBlock.getValue();
const p = new Attractor(x, y, particleSize, aRad, i, ATTRACTOR_SEED);

    p.u0 = (p.x0 - bounds.x) / bounds.w;
    p.v0 = (p.y0 - bounds.y) / bounds.h;
    attractorArray.push(p);
  }
}


function updateBoundsFromSlider() {
  const side = boundsBlock.getValue();

  // world-space (before translate), centered in drawable area
  bounds = {
    x: (drawAreaW - side) * 0.5,
    y: (height - side) * 0.5,
    w: side,
    h: side,
  };
}

// keeps home positions inside the new bounds (prevents edge-sticking)
function clampHomesToBounds() {
  const radP = particleSize * 0.5;

  const minX = bounds.x + radP;
  const maxX = bounds.x + bounds.w - radP;
  const minY = bounds.y + radP;
  const maxY = bounds.y + bounds.h - radP;

  // particles
  for (let i = 0; i < particleArray.length; i++) {
    const p = particleArray[i];
    p.x0 = constrain(p.x0, minX, maxX);
    p.y0 = constrain(p.y0, minY, maxY);
    p.x = constrain(p.x, minX, maxX);
    p.y = constrain(p.y, minY, maxY);
  }

  // attractors
  for (let i = 0; i < attractorArray.length; i++) {
    const a = attractorArray[i];
    a.x0 = constrain(a.x0, minX, maxX);
    a.y0 = constrain(a.y0, minY, maxY);
    a.x = constrain(a.x, minX, maxX);
    a.y = constrain(a.y, minY, maxY);
  }
}

function initHomeUVFromCurrentBounds() {
  // store each particle/attractor home as normalized coords (0..1) within CURRENT bounds
  for (let i = 0; i < particleArray.length; i++) {
    const p = particleArray[i];
    p.u0 = (p.x0 - bounds.x) / bounds.w;
    p.v0 = (p.y0 - bounds.y) / bounds.h;
  }

  for (let i = 0; i < attractorArray.length; i++) {
    const a = attractorArray[i];
    a.u0 = (a.x0 - bounds.x) / bounds.w;
    a.v0 = (a.y0 - bounds.y) / bounds.h;
  }
}

function remapHomesToBounds() {
  // rebuild x0/y0 from stored u0/v0 and the NEW bounds
  for (let i = 0; i < particleArray.length; i++) {
    const p = particleArray[i];
    p.x0 = bounds.x + p.u0 * bounds.w;
    p.y0 = bounds.y + p.v0 * bounds.h;
  }

  for (let i = 0; i < attractorArray.length; i++) {
    const a = attractorArray[i];
    a.x0 = bounds.x + a.u0 * bounds.w;
    a.y0 = bounds.y + a.v0 * bounds.h;
  }
}

class UIBlock {
  constructor(
    labelText,
    hasCheckbox = false,
    checkboxDefault = true,
    checkboxText = "show"
  ) {
    // outer container
    this.container = createDiv();
    this.container.addClass("ui-block"); // styled in CSS

    this.container.style("position", "relative");

    // was createP before. Button for interaction:
    this.label = createButton(labelText);
    this.label.parent(this.container);
    // this.label.style("margin", "0 0 0 0");
    this.label.addClass("collapsible");
    this.label.addClass("menu-text");

    // OPTIONAL checkbox
    this.checkbox = null;
    if (hasCheckbox) {
      this.checkbox = createCheckbox(checkboxText, checkboxDefault);
      this.checkbox.parent(this.container);
      this.checkbox.addClass("ui-checkbox");
    }

    // if(this.visCheckbox === true) {
    //   this.visibilityCheckbox = createCheckbox();
    //   this.visibilityCheckbox.parent(this.container);
    // }

    this.collapsible = createDiv();
    this.collapsible.addClass("content");
    this.collapsible.parent(this.container);

    this.label.mousePressed(() => {
      this.contentVisible = !this.contentVisible;

      if (this.contentVisible === true) {
        this.collapsible.style("display", "block");
      } else {
        this.collapsible.style("display", "none");
      }
    });

    // this.slider = createSlider(min, max, startValue, 1);
    // this.slider.parent(this.collapsible);
    // this.slider.style("width", "100%"); // super important: ".style" adds CSS declarations...
    // this.slider.style("padding", "0 0 40px 0");
  }

  isChecked() {
    return this.checkbox ? this.checkbox.checked() : null;
  }

  addRadio(options = []) {
    let theseOptions = options;
    this.radio = createRadio();
    for (let i = 0; i < theseOptions.length; i++) {
      this.radio.option(theseOptions[i], theseOptions[i]);
    }
    this.radio.selected(theseOptions[theseOptions.length - 1]); // default
    this.radio.parent(this.collapsible);
    this.radio.addClass("ui-radio");
  }

  getRadio() {
    return this.radio.value();
  }
}

class sliderBlock extends UIBlock {
  constructor(
    labelText,
    min,
    max,
    startValue,
    step = 1,
    hasCheckbox = false,
    checkboxDefault = true,
    checkboxText = "show"
  ) {
    super(labelText, hasCheckbox, checkboxDefault, checkboxText);
    this.contentVisible = true;

    this.label.mousePressed(() => {
      this.contentVisible = !this.contentVisible;

      if (this.contentVisible === true) {
        this.collapsible.style("display", "block");
      } else {
        this.collapsible.style("display", "none");
      }
    });

    this.slider = createSlider(min, max, startValue, step);
    this.slider.parent(this.collapsible);
    this.slider.style("width", "100%"); // super important: ".style" adds CSS declarations...
    // this.slider.style("padding", "0 0 40px 0");
  }

  getValue() {
    return this.slider.value();
  }

  getMax() {
    return this.slider.elt.max;
  }
}

let PARTICLE_SEED = 6969;


function rebuildParticles() {
  numParticles = numParticlesBlock.getValue();

  randomSeed(PARTICLE_SEED);
  particleArray = [];

  const overlapFactor = 0.5;   // 1.0 = strict no-overlap, 0.5 = "lazy"
  const maxAttempts = 40;      // per particle

  for (let i = 0; i < numParticles; i++) {
    let placed = false;
    let x = 0;
    let y = 0;

    for (let a = 0; a < maxAttempts; a++) {
      x = random(bounds.x, bounds.x + bounds.w);
      y = random(bounds.y, bounds.y + bounds.h);

      let ok = true;
      for (let j = 0; j < particleArray.length; j++) {
        const p = particleArray[j];
        const d = dist(x, y, p.x0, p.y0);

        // lazy threshold: allow overlap by shrinking minimum center distance
        const minD = ((particleSize * 0.5) + (p.size * 0.5)) * overlapFactor;

        if (d < minD) {
          ok = false;
          break;
        }
      }

      if (ok) {
        placed = true;
        break;
      }
    }

    // fallback: accept last sampled point if packing fails
    if (!placed) {
      x = random(bounds.x, bounds.x + bounds.w);
      y = random(bounds.y, bounds.y + bounds.h);
    }

    const p = new Particle(x, y, particleSize, i, PARTICLE_SEED);
    p.u0 = (p.x0 - bounds.x) / bounds.w;
    p.v0 = (p.y0 - bounds.y) / bounds.h;
    particleArray.push(p);
  }
}

async function handleImportFile(file) {
  try {
    let raw = "";

    // Best path: real File object text
    if (file.file && typeof file.file.text === "function") {
      raw = await file.file.text();
    } else {
      raw = String(file.data || "");
    }

    const state = parseImportedJSON(raw);
    applyImportedState(state);
    console.log("Imported render state:", state);
  } catch (err) {
    console.error(err);
    alert("Invalid JSON parse");
  }
}

function parseImportedJSON(raw) {
  let txt = String(raw || "").trim();

  // Handle data URL payloads
  if (txt.startsWith("data:")) {
    const comma = txt.indexOf(",");
    if (comma < 0) throw new Error("Invalid data URL");
    const meta = txt.slice(0, comma);
    const payload = txt.slice(comma + 1);

    if (meta.includes(";base64")) {
      txt = new TextDecoder().decode(
        Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
      );
    } else {
      txt = decodeURIComponent(payload);
    }
  }

  // Strip UTF-8 BOM if present
  txt = txt.replace(/^\uFEFF/, "");

  return JSON.parse(txt);
}

function applyImportedState(s) {
  if (!s) return;

  if (s.seeds) {
    if (typeof s.seeds.setup === "number") SETUP_RANDOM_SEED = s.seeds.setup;
    if (typeof s.seeds.attractor === "number")
      ATTRACTOR_SEED = s.seeds.attractor;
    if (typeof s.seeds.particle === "number") PARTICLE_SEED = s.seeds.particle;
  }

  if (s.canvas && typeof s.canvas.translateX === "number") {
    if (s.canvas.translateX !== UI_WIDTH) {
      console.warn(
        `Imported translateX (${s.canvas.translateX}) != current UI_WIDTH (${UI_WIDTH}). ` +
          `Results may be shifted unless sketch/UI width matches export.`
      );
    }
  }

  // --- sim ---
  if (s.sim) {
    if (typeof s.sim.particleSize === "number") {
      particleSize = s.sim.particleSize;
      particleSizeBlock.slider.value(particleSize);
    }
  }

  // --- basic setup Things ---
  if (typeof s.sim.numFrames === "number")
    numFrames = max(1, floor(s.sim.numFrames));

  if (typeof s.sim.frameRate === "number") {
    targetFrameRate = s.sim.frameRate;
    frameRate(targetFrameRate);
  }

  if (typeof s.sim.mainColor === "number") mainColor = s.sim.mainColor;

  if (typeof s.sim.attractorRadWigglePhase === "number")
    attractorRadWigglePhase = max(1, floor(s.sim.attractorRadWigglePhase));

  if (typeof s.sim.orbitAttractorIndex === "number")
    orbitAttractorIndex = s.sim.orbitAttractorIndex;

  // --- controls -> UI ---
  if (s.controls) {
    if (typeof s.controls.numParticles === "number")
      numParticlesBlock.slider.value(s.controls.numParticles);
    if (typeof s.controls.numAttractors === "number")
      numAttrBlock.slider.value(s.controls.numAttractors);
    if (typeof s.controls.boundsSide === "number")
      boundsBlock.slider.value(s.controls.boundsSide);
    if (typeof s.controls.attractorRadius === "number")
      attractorRadiusBlock.slider.value(s.controls.attractorRadius);
    if (typeof s.controls.particleSpeed === "number")
      particleRoamAmpBlock.slider.value(s.controls.particleSpeed);
    if (typeof s.controls.wiggleBlastRange === "number")
      wiggleBlastBlock.slider.value(s.controls.wiggleBlastRange);

    if (s.controls.wiggleBlastMode)
      wiggleBlastBlock.radio.selected(s.controls.wiggleBlastMode);
    if (s.controls.drawMode)
      numParticlesBlock.radio.selected(s.controls.drawMode);

    if (typeof s.controls.drawParticles === "boolean")
      numParticlesBlock.checkbox.checked(s.controls.drawParticles);
    if (typeof s.controls.drawAttractors === "boolean")
      numAttrBlock.checkbox.checked(s.controls.drawAttractors);
    if (typeof s.controls.drawParticleNumbers === "boolean")
      pNumbersCheckbox.checked(s.controls.drawParticleNumbers);
    if (typeof s.controls.drawAttractorNumbers === "boolean")
      aNumbersCheckbox.checked(s.controls.drawAttractorNumbers);
    if (typeof s.controls.drawAttractorsToParticles === "boolean")
      aToPLinesCheckbox.checked(s.controls.drawAttractorsToParticles);
    if (typeof s.controls.drawAttractorsToAttractors === "boolean")
      aToALinesCheckbox.checked(s.controls.drawAttractorsToAttractors);
    if (typeof s.controls.orbitingAttractor === "boolean")
      orbitingAttractorCheckbox.checked(s.controls.orbitingAttractor);
  }

  // export inset
  if (s.exportBounds) {
    if (typeof s.exportBounds.inset === "number") {
      exportInsetBlock.slider.value(s.exportBounds.inset);
      updateExportBounds();
    } else if (
      typeof s.exportBounds.x === "number" &&
      typeof s.exportBounds.y === "number" &&
      typeof s.exportBounds.w === "number" &&
      typeof s.exportBounds.h === "number"
    ) {
      // derive inset from width fallback
      const drawW = width - UI_WIDTH;
      const inferredInset = max(
        0,
        round((min(drawW, height) - s.exportBounds.w) * 0.5)
      );
      exportInsetBlock.slider.value(inferredInset);
      updateExportBounds();
    }
  }

  // rebuild from controls first
  updateBoundsFromSlider();
  updateExportBounds();
  rebuildAttractors();
  rebuildParticles();
  initHomeUVFromCurrentBounds();

  // then overwrite with exported entity state for exact match
  if (Array.isArray(s.attractors) && Array.isArray(s.particles)) {
    attractorArray = s.attractors.map((a) => {
      const aa = new Attractor(0, 0, a.size, a.rad, a.number);
      aa.u0 = a.u0;
      aa.v0 = a.v0;
      aa.x0 = bounds.x + aa.u0 * bounds.w;
      aa.y0 = bounds.y + aa.v0 * bounds.h;
      aa.wiggleOffset = a.wiggleOffset;
      aa.cx = a.cx;
      aa.cy = a.cy;
      aa.noiseRadius = a.noiseRadius;
      aa.phase = a.phase;
      aa.baseX = a.baseX;
      aa.baseY = a.baseY;
      aa.x = aa.x0;
      aa.y = aa.y0;
      return aa;
    });

    particleArray = s.particles.map((p) => {
      const pp = new Particle(0, 0, p.size, p.number, PARTICLE_SEED);
      pp.u0 = p.u0;
      pp.v0 = p.v0;
      pp.x0 = bounds.x + pp.u0 * bounds.w;
      pp.y0 = bounds.y + pp.v0 * bounds.h;
      pp.baseR = p.baseR;
      pp.wiggleOffset = p.wiggleOffset;
      pp.cx = p.cx;
      pp.cy = p.cy;
      pp.noiseRadius = p.noiseRadius;
      pp.amp = p.amp;
      pp.phase = p.phase;
      pp.baseX = p.baseX;
      pp.baseY = p.baseY;
      pp.x = pp.x0;
      pp.y = pp.y0;
      return pp;
    });

    if (s.orbitAttractor) {
      orbitAttractor = new Attractor(
        0,
        0,
        s.orbitAttractor.size ?? particleSize,
        s.orbitAttractor.rad ?? attractorRadiusBlock.getValue(),
        s.orbitAttractor.number ?? orbitAttractorIndex
      );

      // Prefer normalized coords if present, else derive from x0/y0 relative to current bounds
      const ou =
        typeof s.orbitAttractor.u0 === "number"
          ? s.orbitAttractor.u0
          : typeof s.orbitAttractor.x0 === "number"
          ? (s.orbitAttractor.x0 - bounds.x) / bounds.w
          : 0.5;

      const ov =
        typeof s.orbitAttractor.v0 === "number"
          ? s.orbitAttractor.v0
          : typeof s.orbitAttractor.y0 === "number"
          ? (s.orbitAttractor.y0 - bounds.y) / bounds.h
          : 0.5;

      orbitAttractor.u0 = ou;
      orbitAttractor.v0 = ov;
      orbitAttractor.x0 = bounds.x + ou * bounds.w;
      orbitAttractor.y0 = bounds.y + ov * bounds.h;
      orbitAttractor.x = orbitAttractor.x0;
      orbitAttractor.y = orbitAttractor.y0;
    }
  }

  // exportBoundsRevealFrames = 10;  /// ???
}

function getUiWidth() {
  return Math.round(menuDiv.elt.getBoundingClientRect().width || 0);
}

// ---------- p5.js: export deterministic render state ----------
function exportStateJSON() {
  updateExportBounds();

  const state = {
    version: 2,

    canvas: {
      width: width,
      height: height,
      uiWidth: UI_WIDTH,
      translateX: UI_WIDTH,
      translateY: 0,
    },
    seeds: {
      setup: SETUP_RANDOM_SEED,
      attractor: ATTRACTOR_SEED,
      particle: PARTICLE_SEED,
    },
    sim: {
      numFrames,
      frameRate: targetFrameRate,
      mainColor,
      particleSize,
      attractorRadWigglePhase,
      orbitAttractorIndex,
    },
    controls: {
      numParticles: numParticlesBlock.getValue(),
      numAttractors: numAttrBlock.getValue(),
      boundsSide: boundsBlock.getValue(),
      attractorRadius: attractorRadiusBlock.getValue(),
      particleSpeed: particleRoamAmpBlock.getValue(),
      wiggleBlastRange: wiggleBlastBlock.getValue(),
      wiggleBlastMode: wiggleBlastBlock.getRadio(),
      drawMode: numParticlesBlock.getRadio(),

      drawParticles: numParticlesBlock.checkbox.checked(),
      drawAttractors: numAttrBlock.checkbox.checked(),
      drawParticleNumbers: pNumbersCheckbox.checked(),
      drawAttractorNumbers: aNumbersCheckbox.checked(),
      drawAttractorsToParticles: aToPLinesCheckbox.checked(),
      drawAttractorsToAttractors: aToALinesCheckbox.checked(),
      orbitingAttractor: orbitingAttractorCheckbox.checked(),
    },
    bounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },

    exportBounds: {
      inset: exportInsetBlock.getValue(),
      x: exportBounds.x,
      y: exportBounds.y,
      w: exportBounds.w,
      h: exportBounds.h,
    },

    attractors: attractorArray.map((a) => ({
      x0: a.x0,
      y0: a.y0,
      u0: a.u0,
      v0: a.v0,
      size: a.size,
      number: a.number,
      rad: a.rad,
      wiggleOffset: a.wiggleOffset,
      cx: a.cx,
      cy: a.cy,
      noiseRadius: a.noiseRadius,
      phase: a.phase,
      baseX: a.baseX,
      baseY: a.baseY,
    })),

    orbitAttractor: {
      x0: orbitAttractor.x0,
      y0: orbitAttractor.y0,
      u0: bounds.w > 0 ? (orbitAttractor.x0 - bounds.x) / bounds.w : 0.5,
      v0: bounds.h > 0 ? (orbitAttractor.y0 - bounds.y) / bounds.h : 0.5,
      size: orbitAttractor.size,
      number: orbitAttractor.number,
      rad: orbitAttractor.rad,
    },

    particles: particleArray.map((p) => ({
      x0: p.x0,
      y0: p.y0,
      u0: p.u0,
      v0: p.v0,
      size: p.size,
      number: p.number,
      baseR: p.baseR,
      wiggleOffset: p.wiggleOffset,
      cx: p.cx,
      cy: p.cy,
      noiseRadius: p.noiseRadius,
      amp: p.amp,
      phase: p.phase,
      baseX: p.baseX,
      baseY: p.baseY,
    })),
  };

  saveJSON(state, "render-state.json");
}

// function circlingAttractor() {
//   // one full loop every numFrames
//   const phi = (TWO_PI * (frameCount % numFrames)) / numFrames;

//   let x = width / 2 + (attractorRadii / 2) * cos(phi);
//   let y = width / 2 + (attractorRadii / 2) * sin(phi);

//   let cp1 = new Attractor(x, y, 6, attractorRadiusSlider.value(), -123);

//   for (let i = 0; i < particleArray.length; i++) {
//     let p1 = particleArray[i];

//     let d = dist(cp1.x, cp1.y, p1.x, p1.y);

// if (d < cp1.rad) {
//       line(p1.x, p1.y, cp1.x, cp1.y);
//     }
//   }
//   cp1.show(mainColor, mainColor);
// }

// TODO:
// for each particle:
// if(this.lockedToCircle == true) {
// 1. calculate theta of attractor to particle.
// 2. add in another noise dimension to the particle.
// That noise dimension will be "pushing and pulling" the dist between the attractor and the particle. So this will be like an inverse of polar coord equation that takes in theta, takes in x and y of particle, takes in x and y of attractor (I think) and returns a rad. This rad is mapped to noise value.
// }
