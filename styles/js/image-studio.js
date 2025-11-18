// js/image-studio.js
// J GIL Image Studio – client-side placeholder renderer
// All logic runs fully in the browser. No external calls.

const jgilStudioState = {
  initialized: false,
  currentMode: "artwork",
  selectedPresets: [],
  hasImage: false,
  elements: {},
};

document.addEventListener("DOMContentLoaded", initImageStudio);

function initImageStudio() {
  const promptInput = document.getElementById("jgil-prompt");
  const canvas = document.getElementById("jgil-canvas");
  const previewEmpty = document.getElementById("jgil-preview-empty");
  const supportMessage = document.getElementById("jgil-support-message");
  const generateBtn = document.getElementById("jgil-generate-btn");
  const modeButtons = document.querySelectorAll(".mode-option");
  const presetPills = document.querySelectorAll(".preset-pill");
  const sizeSelect = document.getElementById("jgil-size");
  const detailSelect = document.getElementById("jgil-detail");
  const downloadBtn = document.getElementById("jgil-download-btn");
  const saveBtn = document.getElementById("jgil-save-btn");
  const clearBtn = document.getElementById("jgil-clear-btn");
  const gallery = document.getElementById("jgil-gallery");

  // If we're on a page that doesn't have the studio markup, exit early.
  if (!promptInput || !canvas || !generateBtn || !gallery) {
    return;
  }

  const ctx = canvas.getContext ? canvas.getContext("2d") : null;

  jgilStudioState.elements = {
    promptInput,
    canvas,
    ctx,
    previewEmpty,
    supportMessage,
    generateBtn,
    modeButtons,
    presetPills,
    sizeSelect,
    detailSelect,
    downloadBtn,
    saveBtn,
    clearBtn,
    gallery,
  };

  // Capability check
  const canvasSupported =
    typeof HTMLCanvasElement !== "undefined" &&
    canvas instanceof HTMLCanvasElement &&
    typeof canvas.getContext === "function";

  let hasGpu = false;
  let hasWebGL = false;

  try {
    hasGpu = typeof navigator !== "undefined" && "gpu" in navigator;
  } catch (e) {
    hasGpu = false;
  }

  if (canvasSupported) {
    try {
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        hasWebGL = true;
      }
    } catch (e) {
      hasWebGL = false;
    }
  }

  if (!canvasSupported || (!hasGpu && !hasWebGL)) {
    if (supportMessage) {
      supportMessage.textContent =
        "Your browser does not appear to support the graphics features needed for this studio. Try an updated version of Chrome, Edge, Firefox, or Safari.";
    }
    generateBtn.disabled = true;
    downloadBtn.disabled = true;
    saveBtn.disabled = true;
    jgilStudioState.initialized = false;
    return;
  } else if (supportMessage) {
    supportMessage.textContent =
      "Your browser looks ready for in-browser image generation. This v1 uses a visual placeholder renderer only.";
  }

  // Mode buttons
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode") || "artwork";
      jgilStudioState.currentMode = mode;

      modeButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    });
  });

  // Preset pills
  presetPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const preset = pill.getAttribute("data-preset");
      if (!preset) return;

      const list = jgilStudioState.selectedPresets;
      const index = list.indexOf(preset);
      if (index === -1) {
        list.push(preset);
        pill.classList.add("active");
      } else {
        list.splice(index, 1);
        pill.classList.remove("active");
      }
    });
  });

  // Generate
  generateBtn.addEventListener("click", generateImage);

  // Download
  downloadBtn.addEventListener("click", () => {
    if (!jgilStudioState.hasImage) return;
    const { canvas } = jgilStudioState.elements;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = dataUrl;
    link.download = `jgil-image-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Save to gallery
  saveBtn.addEventListener("click", () => {
    if (!jgilStudioState.hasImage) return;
    const { canvas, ctx, gallery, previewEmpty } = jgilStudioState.elements;
    if (!gallery || !ctx) return;

    const dataUrl = canvas.toDataURL("image/png");

    const empty = gallery.querySelector(".gallery-empty");
    if (empty) {
      empty.remove();
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className = "gallery-item";

    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Saved image from J GIL Image Studio";

    item.appendChild(img);

    item.addEventListener("click", () => {
      const imgObj = new Image();
      imgObj.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgObj, 0, 0, canvas.width, canvas.height);
        if (previewEmpty) {
          previewEmpty.style.display = "none";
        }
        jgilStudioState.hasImage = true;
        jgilStudioState.elements.downloadBtn.disabled = false;
        jgilStudioState.elements.saveBtn.disabled = false;
      };
      imgObj.src = dataUrl;
    });

    gallery.appendChild(item);
  });

  // Clear & Try Again
  clearBtn.addEventListener("click", () => {
    const { canvas, ctx, previewEmpty, downloadBtn, saveBtn } =
      jgilStudioState.elements;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (previewEmpty) {
      previewEmpty.style.display = "";
    }
    downloadBtn.disabled = true;
    saveBtn.disabled = true;
    jgilStudioState.hasImage = false;
  });

  jgilStudioState.initialized = true;
}

function generateImage() {
  if (!jgilStudioState.initialized) return;

  const {
    promptInput,
    canvas,
    ctx,
    previewEmpty,
    supportMessage,
    generateBtn,
    sizeSelect,
    detailSelect,
    downloadBtn,
    saveBtn,
  } = jgilStudioState.elements;

  if (!ctx) return;

  const prompt = (promptInput.value || "").trim();
  if (!prompt) {
    if (supportMessage) {
      supportMessage.textContent =
        "Please enter a prompt first. Describe the vibe, colors, and what should stand out.";
    }
    return;
  }

  if (supportMessage) {
    supportMessage.textContent = "";
  }

  const originalLabel =
    generateBtn.dataset.originalLabel || generateBtn.textContent;
  generateBtn.dataset.originalLabel = originalLabel;
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating…";

  // Set canvas size
  const size = sizeSelect ? sizeSelect.value : "square";
  let width = 1024;
  let height = 1024;

  switch (size) {
    case "portrait":
      width = 768;
      height = 1024;
      break;
    case "landscape":
      width = 1024;
      height = 768;
      break;
    case "square":
    default:
      width = 1024;
      height = 1024;
      break;
  }

  canvas.width = width;
  canvas.height = height;

  const detail = detailSelect ? detailSelect.value : "balanced";

  const options = {
    width,
    height,
    mode: jgilStudioState.currentMode || "artwork",
    presets: [...jgilStudioState.selectedPresets],
    prompt,
    detail,
  };

  // Simulate a small generation delay visually but still snappy
  window.requestAnimationFrame(() => {
    renderPlaceholderImage(ctx, options);

    if (previewEmpty) {
      previewEmpty.style.display = "none";
    }

    jgilStudioState.hasImage = true;
    downloadBtn.disabled = false;
    saveBtn.disabled = false;

    generateBtn.disabled = false;
    generateBtn.textContent = originalLabel;
  });
}

function renderPlaceholderImage(ctx, options) {
  const { width, height, mode, presets, prompt, detail } = options;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Determine palette
  const isMonochrome = presets.includes("monochrome");
  const hasSoftGradient = presets.includes("soft-gradient");
  const isBoldPoster = presets.includes("bold-poster");
  const isIconOnly = presets.includes("icon-only");
  const isCleanWordmark = presets.includes("clean-wordmark");

  let bgStart = "#020617";
  let bgEnd = "#020617";
  let accent1 = "#f97316";
  let accent2 = "#22c55e";
  let accent3 = "#38bdf8";

  if (mode === "brand") {
    bgStart = "#020617";
    bgEnd = "#020617";
    accent1 = "#f97316";
    accent2 = "#e5e7eb";
    accent3 = "#22c55e";
  } else {
    bgStart = "#020617";
    bgEnd = "#020617";
    accent1 = "#f97316";
    accent2 = "#38bdf8";
    accent3 = "#a855f7";
  }

  if (isMonochrome) {
    accent1 = "#f9fafb";
    accent2 = "#9ca3af";
    accent3 = "#6b7280";
  }

  // Background shape / gradient
  if (hasSoftGradient) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, bgStart);
    gradient.addColorStop(0.45, mode === "brand" ? "#020617" : "#020617");
    gradient.addColorStop(1, bgEnd);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = bgStart;
  }

  ctx.fillRect(0, 0, width, height);

  // Deterministic seed from prompt + settings
  const seedString = [
    prompt,
    mode,
    presets.sort().join(","),
    detail,
    width,
    height,
  ].join("|");
  const seed = hashString(seedString);

  function seededRand(iMultiplier) {
    const x = seed ^ (iMultiplier * 374761393);
    const t = (x ^ (x >>> 13)) * 1274126177;
    return ((t ^ (t >>> 16)) >>> 0) / 4294967295;
  }

  // Draw layout based on mode
  if (mode === "brand") {
    // Big central "logo" block
    const logoW = width * 0.55;
    const logoH = height * (isIconOnly ? 0.35 : 0.22);
    const logoX = (width - logoW) / 2;
    const logoY = height * 0.3;

    ctx.fillStyle = isMonochrome ? "#020617" : "#020617";
    ctx.globalAlpha = 0.95;
    ctx.fillRect(logoX, logoY, logoW, logoH);

    // Logo border
    ctx.globalAlpha = 1;
    ctx.lineWidth = isBoldPoster ? 6 : 3;
    ctx.strokeStyle = isMonochrome ? accent2 : accent1;
    ctx.strokeRect(logoX, logoY, logoW, logoH);

    // Inner icon or wordmark
    if (isIconOnly) {
      const iconSize = Math.min(logoW, logoH) * 0.4;
      const iconX = logoX + logoW / 2;
      const iconY = logoY + logoH / 2;

      ctx.beginPath();
      ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = isMonochrome ? accent2 : accent1;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(iconX, iconY, iconSize * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = isMonochrome ? "#020617" : bgStart;
      ctx.fill();
    } else {
      ctx.fillStyle = isMonochrome ? accent2 : accent1;
      ctx.font = `${Math.floor(logoH * 0.35)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = isCleanWordmark ? "WORDMARK" : "BRAND";
      ctx.fillText(label, logoX + logoW / 2, logoY + logoH / 2);
    }

    // Baseline bar
    ctx.fillStyle = isMonochrome ? accent3 : accent2;
    const barY = logoY + logoH + height * 0.08;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(
      width * 0.18,
      barY,
      width * 0.64,
      Math.max(4, height * 0.01)
    );
    ctx.globalAlpha = 1;
  } else {
    // Artwork mode: layered shapes
    const shapeCount = isBoldPoster ? 8 : 5;

    for (let i = 0; i < shapeCount; i++) {
      const r = seededRand(i + 1);
      const r2 = seededRand(i + 37);
      const r3 = seededRand(i + 91);

      const x = r * width;
      const y = r2 * height;
      const w = (0.25 + r3 * 0.4) * width * (i % 2 === 0 ? 0.35 : 0.2);
      const h = (0.25 + r * 0.4) * height * (i % 2 === 0 ? 0.22 : 0.18);

      const rotation = (seededRand(i + 101) - 0.5) * (Math.PI / 5);

      const colorChoice = i % 3;
      if (colorChoice === 0) {
        ctx.fillStyle = accent1;
      } else if (colorChoice === 1) {
        ctx.fillStyle = accent2;
      } else {
        ctx.fillStyle = accent3;
      }

      ctx.globalAlpha = hasSoftGradient ? 0.55 : 0.75;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

    ctx.globalAlpha = 1;

    // Central circle focal point
    const circleRadius = Math.min(width, height) * 0.12;
    ctx.beginPath();
    ctx.arc(width * 0.55, height * 0.45, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = bgStart;
    ctx.fill();

    ctx.lineWidth = isBoldPoster ? 6 : 4;
    ctx.strokeStyle = accent1;
    ctx.stroke();

    // Big title bar if bold poster
    if (isBoldPoster) {
      const barHeight = height * 0.12;
      const barY = height * 0.72;
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, barY, width, barHeight);

      ctx.fillStyle = accent1;
      ctx.font = `${Math.floor(barHeight * 0.5)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("POSTER MOCK", width / 2, barY + barHeight / 2);
    }
  }

  // Overlay debug text (mode + presets)
  const debugText = [
    mode === "brand" ? "MODE: BRAND" : "MODE: ARTWORK",
    presets.length ? `PRESETS: ${presets.join(", ")}` : "PRESETS: none",
    `DETAIL: ${detail.toUpperCase()}`,
  ];

  ctx.font = `${Math.max(10, Math.floor(height * 0.02))}px system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(148, 163, 184, 0.9)";

  debugText.forEach((line, i) => {
    ctx.fillText(line, width * 0.04, height * 0.04 + i * (height * 0.03));
  });

  // Tiny prompt hash in bottom-right corner
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
  const shortHash = hashString(prompt).toString(16).slice(0, 8);
  ctx.fillText(`#${shortHash}`, width * 0.96, height * 0.96);
}

function hashString(str) {
  let hash = 0;
  const input = String(str || "");
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}
