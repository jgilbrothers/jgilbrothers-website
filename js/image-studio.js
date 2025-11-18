// js/image-studio.js
// J GIL Image Studio – client-side placeholder renderer.
// All logic runs fully in the browser. No external calls.

(function () {
  "use strict";

  // Global-ish state inside this IIFE
  const studioState = {
    currentMode: "artwork",
    selectedPresets: [],
    hasImage: false,
    canvasSize: { width: 1024, height: 1024 },
    detailLevel: "Balanced",
    elements: {},
  };

  /**
   * Entry point – makes sure we always run, even if DOMContentLoaded
   * already fired before the script attached its listener.
   */
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(initImageStudio);

  function initImageStudio() {
    const supportEl = document.getElementById("jgil-support-message");
    studioState.elements.support = supportEl || null;

    // Basic feature check (canvas + WebGL/WebGPU)
    if (!window.HTMLCanvasElement) {
      setSupportMessage(
        "Your browser does not support the HTML canvas element required for J GIL Image Studio.",
        true
      );
      disableGenerate();
      return;
    }

    const hasWebGPU = !!navigator.gpu;
    const hasWebGL = checkWebGLSupport();

    if (!hasWebGPU && !hasWebGL) {
      setSupportMessage(
        "Your browser appears to lack WebGL/WebGPU support. This version of J GIL Image Studio may not run correctly here.",
        true
      );
      disableGenerate();
      return;
    }

    // Grab all DOM elements we rely on
    const promptInput = document.getElementById("jgil-prompt");
    const canvas = document.getElementById("jgil-canvas");
    const previewEmpty = document.getElementById("jgil-preview-empty");
    const generateBtn = document.getElementById("jgil-generate-btn");
    const downloadBtn = document.getElementById("jgil-download-btn");
    const saveBtn = document.getElementById("jgil-save-btn");
    const clearBtn = document.getElementById("jgil-clear-btn");
    const sizeSelect = document.getElementById("jgil-size");
    const detailSelect = document.getElementById("jgil-detail");
    const gallery = document.getElementById("jgil-gallery");
    const modeButtons = Array.from(
      document.querySelectorAll(".mode-toggle .mode-option")
    );
    const presetPills = Array.from(
      document.querySelectorAll(".preset-pills .preset-pill")
    );

    // Store references
    studioState.elements = {
      support: supportEl || null,
      promptInput,
      canvas,
      previewEmpty,
      generateBtn,
      downloadBtn,
      saveBtn,
      clearBtn,
      sizeSelect,
      detailSelect,
      gallery,
      modeButtons,
      presetPills,
    };

    // Validate – if key elements are missing, bail gracefully
    if (!promptInput || !canvas || !generateBtn) {
      setSupportMessage(
        "J GIL Image Studio setup error: missing required elements. Please refresh the page.",
        true
      );
      disableGenerate();
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSupportMessage(
        "Unable to initialize drawing context. Your browser may not fully support canvas rendering.",
        true
      );
      disableGenerate();
      return;
    }
    studioState.ctx = ctx;

    // Hook up mode buttons
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode") || "artwork";
        setMode(mode, modeButtons);
      });
    });

    // Hook up preset pills
    presetPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const preset = pill.getAttribute("data-preset");
        if (!preset) return;
        togglePreset(preset, pill);
      });
    });

    // Generate button
    generateBtn.addEventListener("click", () => {
      generateImage();
    });

    // Download PNG
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        if (!studioState.hasImage) return;
        downloadCurrentImage();
      });
    }

    // Save to gallery
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        if (!studioState.hasImage) return;
        saveToGallery();
      });
    }

    // Clear & Try Again
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        clearCanvas();
      });
    }

    // Size + detail selects
    if (sizeSelect) {
      sizeSelect.addEventListener("change", () => {
        updateCanvasSizeFromSelect();
      });
      updateCanvasSizeFromSelect(); // initialize size
    }
    if (detailSelect) {
      detailSelect.addEventListener("change", () => {
        studioState.detailLevel = detailSelect.value || "Balanced";
      });
      studioState.detailLevel = detailSelect.value || "Balanced";
    }

    // Initial UI state
    setMode("artwork", modeButtons);
    disableActionButtons();
    showPreviewEmpty(true);

    // Confirm to the user that script is live
    setSupportMessage(
      "Image Studio is ready. All rendering happens locally in your browser.",
      false
    );
  }

  // ---------- Helpers ----------

  function checkWebGLSupport() {
    try {
      const testCanvas = document.createElement("canvas");
      const gl =
        testCanvas.getContext("webgl") ||
        testCanvas.getContext("experimental-webgl");
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  function setSupportMessage(message, isError) {
    const el = studioState.elements.support;
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", !!isError);
  }

  function disableGenerate() {
    const btn = studioState.elements.generateBtn;
    if (btn) {
      btn.disabled = true;
    }
  }

  function disableActionButtons() {
    const { downloadBtn, saveBtn } = studioState.elements;
    if (downloadBtn) downloadBtn.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
  }

  function enableActionButtons() {
    const { downloadBtn, saveBtn } = studioState.elements;
    if (downloadBtn) downloadBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
  }

  function showPreviewEmpty(show) {
    const { previewEmpty } = studioState.elements;
    if (!previewEmpty) return;
    previewEmpty.style.display = show ? "block" : "none";
  }

  function setMode(mode, modeButtons) {
    studioState.currentMode = mode === "brand" ? "brand" : "artwork";
    modeButtons.forEach((btn) => {
      const btnMode = btn.getAttribute("data-mode");
      const isActive = btnMode === studioState.currentMode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function togglePreset(preset, pillEl) {
    const idx = studioState.selectedPresets.indexOf(preset);
    if (idx === -1) {
      studioState.selectedPresets.push(preset);
      pillEl.classList.add("active");
      pillEl.setAttribute("aria-pressed", "true");
    } else {
      studioState.selectedPresets.splice(idx, 1);
      pillEl.classList.remove("active");
      pillEl.setAttribute("aria-pressed", "false");
    }
  }

  function updateCanvasSizeFromSelect() {
    const { sizeSelect, canvas } = studioState.elements;
    if (!sizeSelect || !canvas) return;

    const val = sizeSelect.value;
    let width = 1024;
    let height = 1024;

    if (val === "portrait") {
      width = 768;
      height = 1024;
    } else if (val === "landscape") {
      width = 1024;
      height = 768;
    }

    canvas.width = width;
    canvas.height = height;
    studioState.canvasSize = { width, height };

    // also clear when size changes, but keep prompt
    clearCanvas(false);
  }

  // ---------- Core generation ----------

  function generateImage() {
    const { promptInput, canvas, generateBtn } = studioState.elements;
    const ctx = studioState.ctx;
    if (!promptInput || !canvas || !generateBtn || !ctx) return;

    const prompt = promptInput.value.trim();
    if (!prompt) {
      setSupportMessage(
        "Add a prompt first – be specific about style, mood, and colors.",
        true
      );
      return;
    }

    setSupportMessage(
      "Generating a placeholder visual locally in your browser…",
      false
    );

    generateBtn.disabled = true;
    const originalLabel = generateBtn.textContent;
    generateBtn.textContent = "Generating…";

    // Ensure canvas size matches selected option
    updateCanvasSizeFromSelect();

    const options = {
      mode: studioState.currentMode,
      presets: [...studioState.selectedPresets],
      prompt,
      size: { ...studioState.canvasSize },
      detail: studioState.detailLevel,
    };

    // Render immediately (no async needed)
    renderPlaceholderImage(ctx, options);

    studioState.hasImage = true;
    showPreviewEmpty(false);
    enableActionButtons();

    generateBtn.disabled = false;
    generateBtn.textContent = originalLabel;

    setSupportMessage(
      "Placeholder image generated. Download or save to the session gallery.",
      false
    );
  }

  function renderPlaceholderImage(ctx, options) {
    const { width, height } = options.size;
    const { mode, presets, prompt, detail } = options;

    // Wipe canvas
    ctx.clearRect(0, 0, width, height);

    // Compute a deterministic seed based on prompt
    const seed = hashString(prompt + "|" + mode + "|" + presets.join(","));
    const rand = seededRand(seed);

    // Color palettes
    const artworkPalette = [
      "#FF6B6B",
      "#FFD93D",
      "#6BCB77",
      "#4D96FF",
      "#9D4EDD",
    ];
    const brandPalette = ["#F4F4F6", "#2B2B2B", "#4A90E2", "#D64545", "#27AE60"];

    let basePalette = mode === "brand" ? brandPalette : artworkPalette;

    const isMonochrome = presets.includes("monochrome");
    const isSoftGradient = presets.includes("soft-gradient");
    const isBoldPoster = presets.includes("bold-poster");
    const isIconOnly = presets.includes("icon-only");
    const isWordmark = presets.includes("clean-wordmark");

    if (isMonochrome) {
      basePalette = mode === "brand" ? ["#2B2B2B", "#F4F4F6"] : ["#111827", "#E5E7EB"];
    }

    // Background layer
    if (isSoftGradient) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      const c1 = basePalette[Math.floor(rand() * basePalette.length)];
      const c2 = basePalette[Math.floor(rand() * basePalette.length)];
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
    } else {
      const bgColor =
        basePalette[Math.floor(rand() * basePalette.length)] || "#111827";
      ctx.fillStyle = bgColor;
    }
    ctx.fillRect(0, 0, width, height);

    // Mild noise / detail based on detail level
    const detailFactor = detail === "High Detail" ? 90 : detail === "Fast" ? 25 : 50;
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < detailFactor; i++) {
      ctx.fillStyle = basePalette[Math.floor(rand() * basePalette.length)];
      const w = (width * (0.03 + rand() * 0.15));
      const h = (height * (0.03 + rand() * 0.15));
      const x = rand() * (width - w);
      const y = rand() * (height - h);
      ctx.fillRect(x, y, w, h);
    }
    ctx.globalAlpha = 1;

    // Core composition
    if (mode === "brand") {
      drawBrandComposition(ctx, options, rand, basePalette);
    } else {
      drawArtworkComposition(ctx, options, rand, basePalette, isBoldPoster);
    }

    // Debug label (small, subtle text)
    ctx.save();
    ctx.font = `${Math.max(10, Math.round(width * 0.02))}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = "rgba(248, 250, 252, 0.8)";
    ctx.textBaseline = "top";

    const debugLines = [
      `Mode: ${mode}`,
      `Presets: ${presets.length ? presets.join(", ") : "none"}`,
      `Detail: ${detail}`,
    ];
    debugLines.forEach((line, idx) => {
      ctx.fillText(line, width * 0.03, height * (0.03 + idx * 0.03));
    });

    // Tiny prompt hash bottom-right
    const shortHash = Math.abs(hashString(prompt)).toString(16).slice(0, 6);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`#${shortHash}`, width * 0.97, height * 0.96);

    ctx.restore();
  }

  function drawBrandComposition(ctx, options, rand, palette) {
    const { width, height } = options.size;
    const { presets } = options;

    const margin = width * 0.12;
    const boxWidth = width - margin * 2;
    const boxHeight = height * 0.32;
    const boxX = margin;
    const boxY = height * 0.34;

    // Card background
    ctx.save();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, width * 0.02);
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fill();
    ctx.restore();

    const iconSize = Math.min(boxHeight * 0.65, boxWidth * 0.25);
    const iconX = boxX + boxWidth * 0.12;
    const iconY = boxY + boxHeight / 2;

    const primaryColor = palette[Math.floor(rand() * palette.length)] || "#F97316";
    const accentColor = palette[Math.floor(rand() * palette.length)] || "#FDBA74";

    // Icon
    if (presets.includes("icon-only")) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();
      ctx.lineWidth = Math.max(2, iconSize * 0.06);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.95)";
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      const radius = iconSize * 0.18;
      ctx.roundRect(
        iconX - iconSize / 2,
        iconY - iconSize / 2,
        iconSize,
        iconSize * 0.7,
        radius
      );
      ctx.fillStyle = primaryColor;
      ctx.fill();

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = accentColor;
      ctx.fillRect(
        iconX - iconSize / 2,
        iconY - iconSize / 2 + iconSize * 0.42,
        iconSize,
        iconSize * 0.28
      );
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Wordmark
    if (!presets.includes("icon-only")) {
      ctx.save();
      const textAreaX = iconX + iconSize * 0.7;
      const textAreaY = boxY + boxHeight * 0.3;
      const textAreaW = boxWidth - (textAreaX - boxX) - boxWidth * 0.08;

      ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
      ctx.fillRect(
        textAreaX,
        textAreaY,
        textAreaW,
        Math.max(12, boxHeight * 0.18)
      );

      ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
      ctx.font = `${Math.max(12, Math.round(width * 0.026))}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText("BRAND TITLE", textAreaX + textAreaW / 2, textAreaY + boxHeight * 0.09);

      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
      const lineHeight = boxHeight * 0.05;
      const lineYStart = textAreaY + boxHeight * 0.22;
      for (let i = 0; i < 3; i++) {
        const lw = textAreaW * (0.6 + 0.2 * rand());
        ctx.fillRect(
          textAreaX,
          lineYStart + i * (lineHeight + boxHeight * 0.02),
          lw,
          lineHeight * 0.5
        );
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      // If icon-only, add subtle tagline bar under icon
      ctx.save();
      const barWidth = boxWidth * 0.55;
      const barHeight = boxHeight * 0.12;
      const barX = boxX + (boxWidth - barWidth) / 2;
      const barY = boxY + boxHeight * 0.72;
      ctx.roundRect(barX, barY, barWidth, barHeight, barHeight / 2);
      ctx.fillStyle = "rgba(248, 250, 252, 0.14)";
      ctx.fill();
      ctx.restore();
    }
  }

  function drawArtworkComposition(ctx, options, rand, palette, isBoldPoster) {
    const { width, height } = options.size;

    // big central circle or orb
    const orbRadius = Math.min(width, height) * 0.22;
    const orbX = width * 0.5;
    const orbY = height * 0.48;

    ctx.save();
    const orbGrad = ctx.createRadialGradient(
      orbX,
      orbY,
      orbRadius * 0.2,
      orbX,
      orbY,
      orbRadius
    );
    const g1 = palette[Math.floor(rand() * palette.length)] || "#F97316";
    const g2 = palette[Math.floor(rand() * palette.length)] || "#22D3EE";
    orbGrad.addColorStop(0, "rgba(248, 250, 252, 0.98)");
    orbGrad.addColorStop(0.3, g1);
    orbGrad.addColorStop(1, g2);
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(2, orbRadius * 0.07);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius * 1.07, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // poster frame at bottom if bold poster
    if (isBoldPoster) {
      ctx.save();
      const frameHeight = height * 0.22;
      const frameY = height - frameHeight - height * 0.06;
      const frameMargin = width * 0.09;
      const frameWidth = width - frameMargin * 2;

      ctx.roundRect(
        frameMargin,
        frameY,
        frameWidth,
        frameHeight,
        width * 0.03
      );
      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.fill();

      ctx.fillStyle = "rgba(248, 250, 252, 0.98)";
      ctx.font = `${Math.max(
        18,
        Math.round(width * 0.04)
      )}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";

      const titleX = frameMargin + frameWidth * 0.08;
      const titleY = frameY + frameHeight * 0.18;
      ctx.fillText("POSTER TITLE", titleX, titleY);

      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
      const lineH = frameHeight * 0.12;
      const lineY = titleY + frameHeight * 0.3;
      for (let i = 0; i < 3; i++) {
        const lw = frameWidth * (0.4 + 0.25 * rand());
        ctx.fillRect(titleX, lineY + i * (lineH * 0.65), lw, lineH * 0.4);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ---------- Download, gallery, clear ----------

  function downloadCurrentImage() {
    const { canvas } = studioState.elements;
    if (!canvas) return;
    const dataURL = canvas.toDataURL("image/png");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `jgil-image-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function saveToGallery() {
    const { canvas, gallery } = studioState.elements;
    if (!canvas || !gallery) return;

    const dataURL = canvas.toDataURL("image/png");
    const item = document.createElement("button");
    item.type = "button";
    item.className = "gallery-item";
    item.setAttribute("aria-label", "Load saved image into preview");

    const img = document.createElement("img");
    img.src = dataURL;
    img.alt = "Saved placeholder image";
    item.appendChild(img);

    item.addEventListener("click", () => {
      const ctx = studioState.ctx;
      if (!ctx) return;
      const imgEl = new Image();
      imgEl.onload = function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        studioState.hasImage = true;
        showPreviewEmpty(false);
        enableActionButtons();
        setSupportMessage(
          "Loaded a saved image from this session back into the preview.",
          false
        );
      };
      imgEl.src = dataURL;
    });

    // Remove empty text if present
    const empty = gallery.querySelector(".gallery-empty");
    if (empty) empty.remove();

    gallery.appendChild(item);
    setSupportMessage(
      "Image saved to this session’s gallery. It will clear if you refresh the page.",
      false
    );
  }

  function clearCanvas(clearSupportMessage = true) {
    const { canvas } = studioState.elements;
    const ctx = studioState.ctx;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    studioState.hasImage = false;
    disableActionButtons();
    showPreviewEmpty(true);
    if (clearSupportMessage) {
      setSupportMessage(
        "Canvas cleared. Adjust your prompt or settings and generate again.",
        false
      );
    }
  }

  // ---------- Deterministic randomness helpers ----------

  function seededRand(seed) {
    let x = seed;
    return function () {
      // Mulberry32-ish
      x |= 0;
      x = (x + 0x6d2b79f5) | 0;
      let t = Math.imul(x ^ (x >>> 15), 1 | x);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let hash = 0;
    const input = String(str || "");
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return hash | 0;
  }

  // Polyfill for roundRect if missing (older browsers)
  if (CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (
      x,
      y,
      w,
      h,
      r
    ) {
      if (w < 0) {
        x += w;
        w = -w;
      }
      if (h < 0) {
        y += h;
        h = -h;
      }
      if (!r) {
        r = 0;
      }
      if (typeof r === "number") {
        r = { tl: r, tr: r, br: r, bl: r };
      } else {
        const defaultR = { tl: 0, tr: 0, br: 0, bl: 0 };
        for (const side in defaultR) {
          r[side] = r[side] || defaultR[side];
        }
      }
      this.beginPath();
      this.moveTo(x + r.tl, y);
      this.lineTo(x + w - r.tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
      this.lineTo(x + w, y + h - r.br);
      this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
      this.lineTo(x + r.bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
      this.lineTo(x, y + r.tl);
      this.quadraticCurveTo(x, y, x + r.tl, y);
      this.closePath();
      return this;
    };
  }
})();
