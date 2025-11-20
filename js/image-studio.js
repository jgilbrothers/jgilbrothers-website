// J GIL Image Studio v1
// Pure front-end placeholder renderer: deterministic canvas art, no servers.

(function () {
  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function hashString(input) {
    var str = String(input || "");
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    if (!hash) hash = 1;
    return hash;
  }

  function createRng(seedInput) {
    var seed = hashString(seedInput);
    return function nextRandom() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function getSelectedRadioValue(name, fallback) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : fallback;
  }

  function getCanvasSize(sizeValue) {
    if (sizeValue === "portrait") {
      return { width: 768, height: 1024, label: "Portrait 768×1024" };
    }
    if (sizeValue === "landscape") {
      return { width: 1024, height: 768, label: "Landscape 1024×768" };
    }
    return { width: 1024, height: 1024, label: "Square 1024×1024" };
  }

  // ---------------------------------------------------------------------------
  // Palette + Drawing
  // ---------------------------------------------------------------------------

  function choosePalette(rng, mode, style) {
    var sets = [
      { bg: "#020617", accent: "#38bdf8", accent2: "#f97316", text: "#e5e7eb" },
      { bg: "#020617", accent: "#6366f1", accent2: "#22c55e", text: "#f9fafb" },
      { bg: "#020617", accent: "#fb7185", accent2: "#38bdf8", text: "#f3f4f6" },
      { bg: "#020617", accent: "#a855f7", accent2: "#ecfeff", text: "#e5e7eb" },
      { bg: "#020617", accent: "#22c55e", accent2: "#a5b4fc", text: "#e5e7eb" }
    ];
    var base = sets[Math.floor(rng() * sets.length)];
    var palette = {
      bg: base.bg,
      accent: base.accent,
      accent2: base.accent2,
      text: base.text
    };

    if (style === "monochrome") {
      palette.accent2 = palette.accent;
      palette.text = "#e5e7eb";
    } else if (style === "softGradient") {
      palette.bg = "#020617";
    }

    if (mode === "brand") {
      palette.accent2 = "#64748b";
    }

    return palette;
  }

  function drawBackground(ctx, canvas, rng, palette, mode, style) {
    var w = canvas.width;
    var h = canvas.height;

    if (style === "softGradient") {
      var grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, palette.accent);
      grad.addColorStop(0.5, palette.accent2);
      grad.addColorStop(1, palette.bg);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (style === "monochrome") {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    var split = 0.35 + rng() * 0.25;
    if (mode === "brand") split = 0.3;
    var vertical = rng() > 0.5;

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = palette.accent;
    if (vertical) {
      ctx.fillRect(0, 0, w * split, h);
    } else {
      ctx.fillRect(0, 0, w, h * split);
    }

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = palette.accent2;
    ctx.fillRect(w * 0.1, h * 0.2, w * 0.8, h * 0.6);
    ctx.globalAlpha = 1;
  }

  function drawShapes(ctx, canvas, rng, palette, mode, detail) {
    var w = canvas.width;
    var h = canvas.height;
    var base = mode === "brand" ? 3 : 5;
    var extra = detail === "highDetail" ? 4 : detail === "balanced" ? 2 : 0;
    var n = base + extra;

    for (var i = 0; i < n; i++) {
      var t = rng();
      var x = w * (0.15 + rng() * 0.7);
      var y = h * (0.15 + rng() * 0.7);

      if (mode === "brand") {
        x = w * (0.35 + rng() * 0.3);
        y = h * (0.3 + rng() * 0.25);
      }

      var primary = i % 2 === 0;
      ctx.globalAlpha = primary ? 0.9 : 0.55;
      ctx.fillStyle = primary ? palette.accent : palette.accent2;

      if (t < 0.35) {
        // Circle
        var r = (Math.min(w, h) *
          (mode === "brand" ? 0.09 : 0.13) *
          (0.7 + rng() * 0.6));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (t < 0.7) {
        // Bar
        var bw = w * (mode === "brand" ? 0.22 : 0.32) * (0.8 + rng() * 0.6);
        var bh = h * 0.04 * (0.7 + rng() * 0.9);
        var angle = (rng() - 0.5) * (mode === "brand" ? 0.3 : 0.7);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
        ctx.restore();
      } else {
        // Rect
        var rw = w * 0.18 * (0.7 + rng() * 0.9);
        var rh = h * 0.12 * (0.7 + rng() * 0.9);
        ctx.fillRect(x - rw / 2, y - rh / 2, rw, rh);
      }
    }

    ctx.globalAlpha = 1;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(/\s+/);
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      var width = ctx.measureText(test).width;
      if (width > maxWidth && i > 0) {
        ctx.fillText(line, x, y);
        line = words[i];
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, y);
  }

  function drawTitle(ctx, canvas, palette, mode, detail, prompt) {
    var w = canvas.width;
    var h = canvas.height;
    var text = (prompt || "").trim();
    var maxChars = detail === "highDetail" ? 90 : 70;

    if (!text) {
      text = "J GIL Image Studio";
    } else if (text.length > maxChars) {
      text = text.slice(0, maxChars - 1) + "…";
    }

    var baseSize = mode === "brand" ? 0.055 : 0.065;
    var fontSize = Math.round(h * baseSize);
    if (detail === "highDetail") fontSize = Math.round(fontSize * 0.95);

    ctx.fillStyle = palette.text;
    ctx.font =
      "600 " +
      fontSize +
      "px system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
    ctx.textAlign = mode === "brand" ? "center" : "left";

    var lineHeight = fontSize * 1.25;
    var marginX = mode === "brand" ? w * 0.12 : w * 0.1;
    var maxWidth = mode === "brand" ? w - marginX * 2 : w * 0.6;
    var startX = mode === "brand" ? w / 2 : marginX;
    var startY = mode === "brand" ? h * 0.56 : h * 0.74;

    wrapText(ctx, text, startX, startY, maxWidth, lineHeight);

    if (mode === "brand") {
      ctx.font =
        "500 " +
        Math.round(fontSize * 0.45) +
        "px system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
      ctx.fillStyle = "rgba(226, 232, 240, 0.86)";
      ctx.textAlign = "center";
      ctx.fillText("J GIL Brothers", w / 2, startY + lineHeight * 1.6);
    }
  }

  function clearCanvasPlaceholder(ctx, canvas) {
    var w = canvas.width;
    var h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    var pad = Math.round(Math.min(w, h) * 0.08);
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    var fontSize = Math.round(Math.min(w, h) * 0.045);
    ctx.font =
      "500 " +
      fontSize +
      "px system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Your image will appear here", w / 2, h / 2);
  }

  function loadImageIntoCanvas(canvas, ctx, src, callback) {
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h) {
        if (callback) callback(false);
        return;
      }
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      if (callback) callback(true);
    };
    img.onerror = function () {
      if (callback) callback(false);
    };
    img.src = src;
  }

  // ---------------------------------------------------------------------------
  // Main logic
  // ---------------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("imageStudioForm");
    var promptInput = document.getElementById("prompt");
    var styleButtons = Array.prototype.slice.call(
      document.querySelectorAll(".chip-style")
    );
    var generateBtn = document.getElementById("generateBtn");
    var downloadBtn = document.getElementById("downloadBtn");
    var saveBtn = document.getElementById("saveBtn");
    var clearBtn = document.getElementById("clearBtn");
    var galleryGrid = document.getElementById("galleryGrid");
    var galleryEmpty = document.getElementById("galleryEmpty");

    var canvas = document.getElementById("imageCanvas");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");

    var selectedStyle = "boldPoster";
    var hasGeneratedImage = false;
    var savedImages = [];

    function updateGenerateState() {
      var hasPrompt =
        promptInput && promptInput.value && promptInput.value.trim().length > 0;
      if (generateBtn) generateBtn.disabled = !hasPrompt;
    }

    function updateActionButtons() {
      var disabled = !hasGeneratedImage;
      if (downloadBtn) downloadBtn.disabled = disabled;
      if (saveBtn) saveBtn.disabled = disabled;
    }

    function getSettings() {
      var prompt = promptInput ? promptInput.value.trim() : "";
      var mode = getSelectedRadioValue("mode", "artwork");
      var style = selectedStyle || "boldPoster";
      var sizeValue = getSelectedRadioValue("size", "square");
      var detail = getSelectedRadioValue("detail", "balanced");
      var size = getCanvasSize(sizeValue);

      return {
        prompt: prompt,
        mode: mode,
        style: style,
        sizeValue: sizeValue,
        size: size,
        detail: detail
      };
    }

    function render() {
      var settings = getSettings();
      if (!settings.prompt) return;

      canvas.width = settings.size.width;
      canvas.height = settings.size.height;

      var seedKey =
        settings.prompt.toLowerCase() +
        "|" +
        settings.mode +
        "|" +
        settings.style +
        "|" +
        settings.sizeValue +
        "|" +
        settings.detail;

      var rng = createRng(seedKey);
      var palette = choosePalette(rng, settings.mode, settings.style);

      drawBackground(ctx, canvas, rng, palette, settings.mode, settings.style);
      drawShapes(ctx, canvas, rng, palette, settings.mode, settings.detail);
      drawTitle(
        ctx,
        canvas,
        palette,
        settings.mode,
        settings.detail,
        settings.prompt
      );

      hasGeneratedImage = true;
      updateActionButtons();
    }

    function clearAll() {
      if (promptInput) promptInput.value = "";
      updateGenerateState();
      hasGeneratedImage = false;
      updateActionButtons();

      canvas.width = 1024;
      canvas.height = 1024;
      clearCanvasPlaceholder(ctx, canvas);
    }

    function triggerDownload() {
      if (!hasGeneratedImage) return;

      if (canvas.toBlob) {
        canvas.toBlob(
          function (blob) {
            if (!blob) return;
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            var ts = new Date().toISOString().replace(/[:.]/g, "-");
            a.download = "jgil-image-studio-" + ts + ".png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          },
          "image/png"
        );
      } else {
        var data = canvas.toDataURL("image/png");
        var link = document.createElement("a");
        var ts2 = new Date().toISOString().replace(/[:.]/g, "-");
        link.href = data;
        link.download = "jgil-image-studio-" + ts2 + ".png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }

    function addToGallery() {
      if (!hasGeneratedImage || !galleryGrid) return;

      var dataUrl = canvas.toDataURL("image/png");
      var settings = getSettings();

      savedImages.push({
        url: dataUrl,
        settings: settings,
        createdAt: new Date()
      });

      var button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-item";

      var img = document.createElement("img");
      img.src = dataUrl;
      img.alt =
        "Saved image: " +
        (settings.prompt ? settings.prompt.slice(0, 60) : "generated image");

      var label = document.createElement("span");
      label.className = "gallery-label";

      var modeLabel = settings.mode === "brand" ? "Brand" : "Artwork";
      var styleLabel;
      switch (settings.style) {
        case "cleanWordmark":
          styleLabel = "Clean Wordmark";
          break;
        case "iconOnly":
          styleLabel = "Icon Only";
          break;
        case "softGradient":
          styleLabel = "Soft Gradient";
          break;
        case "monochrome":
          styleLabel = "Monochrome";
          break;
        default:
          styleLabel = "Bold Poster";
      }
      label.textContent = modeLabel + " • " + styleLabel;

      button.appendChild(img);
      button.appendChild(label);

      button.addEventListener("click", function () {
        loadImageIntoCanvas(canvas, ctx, dataUrl, function (ok) {
          if (ok) {
            hasGeneratedImage = true;
            updateActionButtons();
          }
        });
      });

      if (galleryGrid.firstChild) {
        galleryGrid.insertBefore(button, galleryGrid.firstChild);
      } else {
        galleryGrid.appendChild(button);
      }

      if (galleryEmpty) {
        galleryEmpty.hidden = galleryGrid.children.length > 0;
      }
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    if (promptInput) {
      promptInput.addEventListener("input", updateGenerateState);
    }

    styleButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        styleButtons.forEach(function (b) {
          b.classList.remove("is-selected");
          b.setAttribute("aria-pressed", "false");
        });
        this.classList.add("is-selected");
        this.setAttribute("aria-pressed", "true");
        selectedStyle = this.getAttribute("data-style") || "boldPoster";
      });
    });

    if (generateBtn) {
      generateBtn.addEventListener("click", function () {
        var settings = getSettings();
        if (!settings.prompt) return;

        try {
          render();
        } catch (err) {
          canvas.width = 1024;
          canvas.height = 1024;
          clearCanvasPlaceholder(ctx, canvas);
          ctx.save();
          ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
          ctx.font =
            "500 18px system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            "Something glitched. Try generating again.",
            canvas.width / 2,
            canvas.height * 0.55
          );
          ctx.restore();
          hasGeneratedImage = false;
          updateActionButtons();
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", triggerDownload);
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", addToGallery);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", clearAll);
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
      });
    }

    // -----------------------------------------------------------------------
    // Initial state
    // -----------------------------------------------------------------------

    canvas.width = 1024;
    canvas.height = 1024;
    clearCanvasPlaceholder(ctx, canvas);
    updateGenerateState();
    updateActionButtons();
    if (galleryEmpty) {
      galleryEmpty.hidden = false;
    }
  });
})();
