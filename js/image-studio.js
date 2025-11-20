// js/image-studio.js
// Pure front-end placeholder logic for J GIL Image Studio
// No external API calls, no network requests.

(function () {
  const promptInput = document.getElementById('promptInput');
  const modeToggle = document.getElementById('modeToggle');
  const styleChips = document.getElementById('styleChips');
  const sizeSelect = document.getElementById('sizeSelect');
  const detailSelect = document.getElementById('detailSelect');
  const generateBtn = document.getElementById('generateBtn');
  const saveToGalleryBtn = document.getElementById('saveToGalleryBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statusText = document.getElementById('statusText');
  const previewModeTag = document.getElementById('previewModeTag');
  const previewCanvas = document.getElementById('previewCanvas');
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const previewGenerating = document.getElementById('previewGenerating');
  const previewMetaText = document.getElementById('previewMetaText');
  const previewTimestamp = document.getElementById('previewTimestamp');
  const sessionGallery = document.getElementById('sessionGallery');

  if (!previewCanvas) {
    // Page not loaded or markup missing; fail silently.
    return;
  }

  const ctx = previewCanvas.getContext('2d');
  let lastImageDataUrl = null;
  let isGenerating = false;

  function getActiveMode() {
    const active = modeToggle.querySelector('.mode-pill.is-active');
    return active ? active.dataset.mode : 'brand';
  }

  function getActiveStyle() {
    const selected = styleChips.querySelector('.style-chip.is-selected');
    return selected ? selected.dataset.style : 'minimal';
  }

  function updateModeTag() {
    const mode = getActiveMode();
    const style = getActiveStyle();

    const modeLabel = mode === 'brand' ? 'Brand' : 'Artwork';
    const styleLabel = {
      minimal: 'Minimal',
      bold: 'Bold',
      retro: 'Retro',
      neon: 'Neon'
    }[style] || 'Custom';

    previewModeTag.textContent = modeLabel + ' · ' + styleLabel;
  }

  function setCanvasSizeFromSelection() {
    const size = sizeSelect.value;

    // Default dimensions; canvas will scale with CSS
    let width = 960;
    let height = 720;

    if (size === 'square') {
      width = 800;
      height = 800;
    } else if (size === 'portrait') {
      width = 720;
      height = 960;
    }

    previewCanvas.width = width;
    previewCanvas.height = height;
  }

  function drawMockup() {
    const prompt = (promptInput.value || '').trim();
    const mode = getActiveMode();
    const style = getActiveStyle();
    const detail = detailSelect.value;

    setCanvasSizeFromSelection();

    const w = previewCanvas.width;
    const h = previewCanvas.height;

    // Base background color based on style
    let baseColor1 = '#e5e5e5';
    let baseColor2 = '#f8f8f8';
    let accentColor = '#000000';

    if (style === 'bold') {
      baseColor1 = '#111111';
      baseColor2 = '#3b3b3b';
      accentColor = '#ffffff';
    } else if (style === 'retro') {
      baseColor1 = '#f4d9a6';
      baseColor2 = '#f5b5a7';
      accentColor = '#3b1d2a';
    } else if (style === 'neon') {
      baseColor1 = '#050814';
      baseColor2 = '#181b3a';
      accentColor = '#4ad6ff';
    }

    // Fill gradient background
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, baseColor1);
    gradient.addColorStop(1, baseColor2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Add a subtle pattern based on detail level
    const passes = detail === 'detailed' ? 120 : detail === 'balanced' ? 60 : 30;
    ctx.save();
    ctx.globalAlpha = style === 'bold' ? 0.18 : 0.12;

    for (let i = 0; i < passes; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 8 + Math.random() * 32;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
    }

    ctx.restore();

    // Central badge / logo block
    const blockWidth = w * 0.5;
    const blockHeight = h * 0.25;
    const blockX = (w - blockWidth) / 2;
    const blockY = (h - blockHeight) / 2;

    ctx.fillStyle = style === 'bold' ? '#ffffff' : 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = style === 'bold' ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(blockX, blockY, blockWidth, blockHeight, 24);
    ctx.fill();
    ctx.stroke();

    // Crown-esque motif for "brand" mode
    if (mode === 'brand') {
      const crownWidth = blockWidth * 0.35;
      const crownHeight = blockHeight * 0.24;
      const cx = blockX + blockWidth / 2;
      const cy = blockY + blockHeight * 0.34;

      ctx.beginPath();
      ctx.moveTo(cx - crownWidth / 2, cy + crownHeight / 2);
      ctx.lineTo(cx - crownWidth / 4, cy - crownHeight / 2);
      ctx.lineTo(cx, cy + crownHeight / 4);
      ctx.lineTo(cx + crownWidth / 4, cy - crownHeight / 2);
      ctx.lineTo(cx + crownWidth / 2, cy + crownHeight / 2);
      ctx.closePath();
      ctx.fillStyle = accentColor;
      ctx.fill();
    } else {
      // Simple abstract glyph for artwork mode
      ctx.save();
      ctx.translate(blockX + blockWidth / 2, blockY + blockHeight * 0.35);
      ctx.rotate(-0.2);
      ctx.fillStyle = accentColor;
      ctx.fillRect(-blockWidth * 0.18, -blockHeight * 0.12, blockWidth * 0.36, blockHeight * 0.24);
      ctx.restore();
    }

    // Text inside the block
    ctx.fillStyle = style === 'bold' ? '#111111' : '#111111';
    ctx.textAlign = 'center';

    const mainLabel = prompt || 'Your concept here';
    const secondaryLabel = mode === 'brand' ? 'Brand mockup' : 'Artwork mockup';

    const maxMainWidth = blockWidth * 0.8;
    const words = mainLabel.split(/\s+/);
    let line = '';
    const lines = [];
    const mainFontSize = Math.min(28, Math.max(16, w * 0.028));
    ctx.font = '600 ' + mainFontSize + 'px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

    for (let i = 0; i < words.length; i++) {
      const testLine = line ? line + ' ' + words[i] : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxMainWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    if (lines.length > 3) {
      lines.length = 3;
      lines[2] = lines[2] + '…';
    }

    let textY = blockY + blockHeight * 0.55;
    const lineHeight = mainFontSize * 1.15;

    lines.forEach(function (l) {
      ctx.fillText(l, blockX + blockWidth / 2, textY);
      textY += lineHeight;
    });

    ctx.font = '400 ' + Math.max(12, mainFontSize * 0.6) + 'px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(secondaryLabel + ' · ' + style.charAt(0).toUpperCase() + style.slice(1), blockX + blockWidth / 2, blockY + blockHeight * 0.82);
  }

  function startGenerating() {
    if (isGenerating) return;

    const prompt = (promptInput.value || '').trim();
    if (!prompt) {
      statusText.textContent = 'Type a quick description before generating.';
      return;
    }

    isGenerating = true;
    generateBtn.disabled = true;
    saveToGalleryBtn.disabled = true;
    downloadBtn.disabled = true;

    previewPlaceholder.style.display = 'none';
    previewGenerating.classList.add('is-visible');
    statusText.textContent = 'Generating preview (in-browser)…';

    const delay = detailSelect.value === 'detailed'
      ? 1200
      : detailSelect.value === 'balanced'
        ? 800
        : 400;

    setTimeout(function () {
      // Draw mockup
      drawMockup();

      // Mark generation finished
      previewGenerating.classList.remove('is-visible');
      generateBtn.disabled = false;
      saveToGalleryBtn.disabled = false;
      downloadBtn.disabled = false;
      isGenerating = false;

      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      statusText.textContent = 'Preview updated.';
      previewMetaText.textContent = 'Last generated from prompt.';
      previewTimestamp.textContent = 'Generated at ' + timestamp;

      // Cache the current PNG for download/gallery
      lastImageDataUrl = previewCanvas.toDataURL('image/png');
    }, delay);
  }

  function saveToGallery() {
    if (!lastImageDataUrl) return;

    const item = document.createElement('article');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.className = 'gallery-thumb';
    img.src = lastImageDataUrl;
    img.alt = 'Saved mockup preview';

    const meta = document.createElement('div');
    meta.className = 'gallery-meta';

    const main = document.createElement('div');
    main.className = 'gallery-meta-main';
    main.textContent = (promptInput.value || 'Untitled idea').slice(0, 48);

    const sub = document.createElement('div');
    sub.className = 'gallery-meta-sub';

    const mode = getActiveMode();
    const style = getActiveStyle();
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const modeLabel = mode === 'brand' ? 'Brand' : 'Artwork';
    sub.textContent = modeLabel + ' · ' + style + ' · ' + time;

    meta.appendChild(main);
    meta.appendChild(sub);

    item.appendChild(img);
    item.appendChild(meta);

    // Prepend newest first
    if (sessionGallery.firstChild) {
      sessionGallery.insertBefore(item, sessionGallery.firstChild);
    } else {
      sessionGallery.appendChild(item);
    }

    statusText.textContent = 'Saved to this session gallery (resets on refresh).';
  }

  function downloadImage() {
    if (!lastImageDataUrl) return;

    const link = document.createElement('a');
    link.href = lastImageDataUrl;
    link.download = 'jgil-image-studio.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    statusText.textContent = 'PNG download started.';
  }

  function wireEvents() {
    if (modeToggle) {
      modeToggle.addEventListener('click', function (e) {
        const btn = e.target.closest('.mode-pill');
        if (!btn) return;
        modeToggle.querySelectorAll('.mode-pill').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        updateModeTag();
      });
    }

    if (styleChips) {
      styleChips.addEventListener('click', function (e) {
        const chip = e.target.closest('.style-chip');
        if (!chip) return;
        styleChips.querySelectorAll('.style-chip').forEach(function (c) {
          c.classList.toggle('is-selected', c === chip);
        });
        updateModeTag();
      });
    }

    if (sizeSelect) {
      sizeSelect.addEventListener('change', function () {
        // Resize on next generation; here we just update the meta text.
        previewMetaText.textContent = 'Size set to ' + sizeSelect.value + '. Generate again to update the canvas.';
      });
    }

    if (detailSelect) {
      detailSelect.addEventListener('change', function () {
        previewMetaText.textContent = 'Detail set to ' + detailSelect.value + '. Generate again to apply.';
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', function (e) {
        e.preventDefault();
        startGenerating();
      });
    }

    if (saveToGalleryBtn) {
      saveToGalleryBtn.addEventListener('click', function (e) {
        e.preventDefault();
        saveToGallery();
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function (e) {
        e.preventDefault();
        downloadImage();
      });
    }

    updateModeTag();
    setCanvasSizeFromSelection();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireEvents);
  } else {
    wireEvents();
  }
})();
