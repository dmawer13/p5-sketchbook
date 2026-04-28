let items = [];
let active = 0;

const carousel = document.getElementById("carousel");
const strip = document.getElementById("strip");
const statusEl = document.getElementById("status");
const details = document.getElementById("details");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function clampIndex(value) {
  if (!items.length) {
    return 0;
  }
  return Math.max(0, Math.min(items.length - 1, value));
}

function openActiveSketch() {
  const item = items[active];
  if (!item) {
    return;
  }
  window.open(item.sketchUrl, "_blank", "noopener,noreferrer");
}

function scrollActiveThumbIntoView() {
  const activeThumb = strip.querySelector(".thumb.active");
  if (!activeThumb) {
    return;
  }
  activeThumb.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
}

function renderStrip() {
  strip.innerHTML = "";

  items.forEach((item, i) => {
    const thumb = document.createElement("button");
    thumb.className = "thumb";
    thumb.type = "button";
    thumb.title = item.title || item.slug;

    if (i === active) {
      thumb.classList.add("active");
    }

    if (item.previewUrl) {
      const img = document.createElement("img");
      img.src = item.previewUrl;
      img.alt = item.title || item.slug;
      thumb.appendChild(img);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "tiny-missing";
      fallback.textContent = "NO IMG";
      thumb.appendChild(fallback);
    }

    thumb.addEventListener("click", () => {
      active = i;
      render();
    });

    strip.appendChild(thumb);
  });

  scrollActiveThumbIntoView();
}

function renderDetails() {
  const item = items[active];
  if (!item) {
    details.innerHTML = "<p>No sketches yet.</p>";
    return;
  }

  const metaBits = [
    `<span class="pill">${item.slug}</span>`,
    `<span class="pill">${item.year || "year ?"}</span>`,
    `<span class="pill">${item.p5Version || "p5 default"}</span>`
  ];

  if (Array.isArray(item.tags)) {
    for (const tag of item.tags) {
      metaBits.push(`<span class="pill">${tag}</span>`);
    }
  }

  details.innerHTML = `
    <h2>${item.title || item.slug}</h2>
    <div class="meta-row">${metaBits.join("")}</div>
    <a href="${item.sketchUrl}" target="_blank" rel="noopener noreferrer">OPEN SKETCH</a>
  `;
}

function renderCarousel() {
  carousel.innerHTML = "";

  if (!items.length) {
    return;
  }

  const item = items[active];
  statusEl.textContent = `${active + 1} / ${items.length}`;

  const card = document.createElement("article");
  card.className = "card";

  if (item.previewUrl) {
    const img = document.createElement("img");
    img.src = item.previewUrl;
    img.alt = item.title || item.slug;
    card.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "missing";
    placeholder.textContent = "NO PREVIEW";
    card.appendChild(placeholder);
  }

  const copy = document.createElement("div");
  copy.className = "card-copy";

  const title = document.createElement("p");
  title.className = "card-title";
  title.textContent = item.title || item.slug;

  const index = document.createElement("p");
  index.className = "card-index";
  index.textContent = `${active + 1} of ${items.length}`;

  copy.append(title, index);
  card.appendChild(copy);

  card.addEventListener("click", openActiveSketch);
  carousel.appendChild(card);
}

function render() {
  if (!items.length) {
    statusEl.textContent = "No sketches";
    details.innerHTML = "<p>Run <code>npm run snapshots</code> then reload.</p>";
    strip.innerHTML = "";
    return;
  }

  renderCarousel();
  renderDetails();
  renderStrip();
}

function move(delta) {
  if (!items.length) {
    return;
  }

  active = clampIndex(active + delta);
  render();
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    move(event.shiftKey ? -5 : -1);
    return;
  }

  if (event.key === "ArrowRight") {
    move(event.shiftKey ? 5 : 1);
    return;
  }

  if (event.key === "PageUp") {
    move(-10);
    return;
  }

  if (event.key === "PageDown") {
    move(10);
    return;
  }

  if (event.key === "Home") {
    active = 0;
    render();
    return;
  }

  if (event.key === "End") {
    active = items.length - 1;
    render();
    return;
  }

  if (event.key === "Enter") {
    openActiveSketch();
  }
});

prevBtn.addEventListener("click", () => move(-1));
nextBtn.addEventListener("click", () => move(1));

async function init() {
  try {
    const response = await fetch("./manifest.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("manifest missing");
    }

    const data = await response.json();
    items = Array.isArray(data.sketches) ? data.sketches : [];
    render();
  } catch {
    statusEl.textContent = "manifest.json missing";
    details.innerHTML = "<p>Run <code>npm run snapshots</code>.</p>";
  }
}

init();
