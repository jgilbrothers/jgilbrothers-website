// J GIL Image Studio - Placeholder Canvas Engine
// Pure front-end, no servers, no external APIs.

(function () {
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var form = document.getElementById('image-studio-form');
    var promptInput = document.getElementById('prompt-input');
    var canvas = document.getElementById('preview-canvas');
    var canvasPlaceholder = document.getElementById('canvas-placeholder');
    var sizeSelect = document.getElementById('canvas-size');
    var detailSelect = document.getElementById('detail-level');
    var chipsContainer = document.getElementById('style-chips');
    var statusMessage = document.getElementById('status-message');
    var galleryGrid = document.getElementById('gallery-grid');
    var galleryEmpty = document.getElementById('gallery-empty');

    var generateBtn = document.getElementById('generate-btn');
    var downloadBtn = document.getElementById('download-btn');
    var saveBtn = document.getElementById('save-btn');
    var clearBtn = document.getElementById('clear-btn');

    if (!canvas || !canvas.getContext) {
      return;
    }

    var ctx = canvas.getContext('2d');
    var activeStyles = new Set();
    var gallery = [];

    // Style chips
    if (chipsContainer) {
      chipsContainer.addEventListener('click', function (e) {
        if (e.target && e.target.matches('button.chip')) {
          var chip = e.target;
          var style = chip.getAttribute('data-style');
          if (!style) return;
          if (chip.classList.contains('chip-active')) {
            chip.classList.remove('chip-active');
            activeStyles.delete(style);
          } else {
            chip.classList.add('chip-active');
            activeStyles.add(style);
          }
        }
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', function () {
        var prompt = (promptInput && promptInput.value || '').trim();
        if (!prompt) {
          setStatus('Add a short prompt first.');
          return;
        }
        var mode = getMode();
        var size = sizeSelect ? sizeSelect.value : 'square';
        var detail = detailSelect ? detailSelect.value : 'balanced';

        setStatus('Generating…');
        renderPlaceholder(canvas, ctx, {
          prompt: prompt,
          mode: mode,
          size: size,
          detail: detail,
          styles: Array.from(activeStyles)
        });

        if (canvasPlaceholder) {
          canvasPlaceholder.style.display = 'none';
        }
        setStatus('Done. You can download or save to gallery.');
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        var dataUrl = canvas.toDataURL('image/png');
        var link = document.createElement('a');
        var stamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = 'jgil-image-studio-' + stamp + '.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var dataUrl = canvas.toDataURL('image/png');
        gallery.push(dataUrl);
        refreshGallery(gallery, galleryGrid, galleryEmpty);
        setStatus('Saved to this session\'s gallery.');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearCanvas(canvas, ctx);
        if (canvasPlaceholder) {
          canvasPlaceholder.style.display = 'flex';
        }
        if (promptInput) {
          promptInput.value = '';
        }
        setStatus('Cleared. Add a new prompt and generate again.');
      });
    }

    // Initial clear
    clearCanvas(canvas, ctx);

    function setStatus(msg) {
      if (statusMessage) {
        statusMessage.textContent = msg || '';
      }
    }

    function getMode() {
      var inputs = document.querySelectorAll('input[name="mode"]');
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].checked) return inputs[i].value;
      }
      return 'artwork';
    }
  }

  function refreshGallery(items, container, emptyLabel) {
    if (!container) return;
    container.innerHTML = '';
    if (!items.length) {
      if (emptyLabel) emptyLabel.style.display = 'block';
      return;
    }
    if (emptyLabel) emptyLabel.style.display = 'none';

    items.forEach(function (dataUrl) {
      var img = document.createElement('img');
      img.src = dataUrl;
      container.appendChild(img);
    });
  }

  function clearCanvas(canvas, ctx) {
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // subtle base background
    var grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#050814');
    grad.addColorStop(1, '#10162b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Placeholder render engine

  function renderPlaceholder(canvas, ctx, opts) {
    if (!canvas || !ctx) return;
    opts = opts || {};
    var prompt = opts.prompt || '';
    var mode = opts.mode || 'artwork';
    var size = opts.size || 'square';
    var detail = opts.detail || 'balanced';
    var styles = opts.styles || [];

    // canvas size
    if (size === 'square') {
      canvas.width = 1024;
      canvas.height = 1024;
    } else if (size === 'portrait') {
      canvas.width = 768;
      canvas.height = 1024;
    } else if (size === 'landscape') {
      canvas.width = 1024;
      canvas.height = 768;
    }

    var seed = hashString(prompt + '|' + mode + '|' + styles.sort().join(',') + '|' + size + '|' + detail);
    var rand = mulberry32(seed);

    clearCanvas(canvas, ctx);

    var palettes = [
      ['#4a90e2', '#d64545', '#f4f4f6', '#2b2b2b'],
      ['#27ae60', '#4a90e2', '#e5e5e5', '#050814'],
      ['#d64545', '#f39c12', '#f4f4f6', '#2b2b2b'],
      ['#8e44ad', '#4a90e2', '#ecf0f1', '#050814']
    ];
    var palette = palettes[Math.floor(rand() * palettes.length)];

    // Background gradient tweaks based on style
    var bgStart = palette[0];
    var bgEnd = palette[3];
    if (styles.indexOf('monochrome') !== -1) {
      bgStart = '#050814';
      bgEnd = '#1e2239';
    } else if (styles.indexOf('softGradient') !== -1) {
      bgStart = palette[0];
      bgEnd = palette[1];
    }

    var grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, bgStart);
    grad.addColorStop(1, bgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Mode logic
    if (mode === 'artwork') {
      renderArtworkLayout(canvas, ctx, rand, palette, detail, styles);
    } else {
      renderBrandLayout(canvas, ctx, rand, palette, detail, styles);
    }

    // Prompt text overlay (subtle)
    renderPromptTag(canvas, ctx, prompt, rand);
  }

  function renderArtworkLayout(canvas, ctx, rand, palette, detail, styles) {
    var w = canvas.width;
    var h = canvas.height;

    var layers = detail === 'high' ? 18 : detail === 'balanced' ? 12 : 7;

    for (var i = 0; i < layers; i++) {
      var color = palette[Math.floor(rand() * palette.length)];
      ctx.fillStyle = color;

      var shapeType = rand();
      var x = rand() * w;
      var y = rand() * h;
      var ww = (0.1 + rand() * 0.5) * w;
      var hh = (0.1 + rand() * 0.4) * h;

      ctx.save();
      ctx.globalAlpha = 0.15 + rand() * 0.5;
      ctx.translate(x, y);
      ctx.rotate((rand() - 0.5) * Math.PI / 3);

      if (shapeType < 0.4) {
        ctx.fillRect(-ww / 2, -hh / 2, ww, hh);
      } else if (shapeType < 0.7) {
        ctx.beginPath();
        ctx.arc(0, 0, ww / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-ww / 2, -hh / 2);
        ctx.lineTo(ww / 2, -hh / 3);
        ctx.lineTo(0, hh / 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // Extra high-detail lines
    if (detail === 'high') {
      ctx.save();
      ctx.strokeStyle = 'rgba(244,244,246,0.18)';
      ctx.lineWidth = 1;
      var count = 22;
      for (var j = 0; j < count; j++) {
        ctx.beginPath();
        ctx.moveTo(rand() * w, rand() * h);
        ctx.lineTo(rand() * w, rand() * h);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function renderBrandLayout(canvas, ctx, rand, palette, detail, styles) {
    var w = canvas.width;
    var h = canvas.height;

    // Big centered icon
    var iconSize = Math.min(w, h) * 0.32;
    var cx = w / 2;
    var cy = h / 2 - iconSize * 0.15;

    // Outer ring
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = palette[2];
    ctx.beginPath();
    ctx.arc(cx, cy, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inner symbol
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette[1];
    ctx.beginPath();
    ctx.moveTo(cx - iconSize * 0.25, cy + iconSize * 0.1);
    ctx.lineTo(cx, cy - iconSize * 0.25);
    ctx.lineTo(cx + iconSize * 0.25, cy + iconSize * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (styles.indexOf('iconOnly') === -1) {
      // Wordmark bar
      var barWidth = iconSize * 1.5;
      var barHeight = iconSize * 0.22;
      var barX = cx - barWidth / 2;
      var barY = cy + iconSize * 0.4;

      ctx.save();
      ctx.fillStyle = 'rgba(5, 8, 20, 0.8)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = palette[2];
      ctx.font = Math.round(barHeight * 0.45) + 'px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText('J GIL MOCKUP', cx, barY + barHeight / 2);
      ctx.restore();

      if (detail !== 'fast') {
        ctx.save();
        ctx.strokeStyle = 'rgba(244,244,246,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.restore();
      }
    }

    // Optional monochrome overlay
    if (styles.indexOf('monochrome') !== -1) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  function renderPromptTag(canvas, ctx, prompt, rand) {
    if (!prompt) return;
    var w = canvas.width;
    var h = canvas.height;

    var short = prompt.length > 40 ? prompt.slice(0, 37) + '…' : prompt;

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(5, 8, 20, 0.9)';
    var paddingX = 14;
    var paddingY = 8;
    ctx.font = '13px system-ui, sans-serif';
    var textWidth = ctx.measureText(short).width;
    var boxWidth = textWidth + paddingX * 2;
    var boxHeight = 26;

    var margin = 18;
    var x = w - boxWidth - margin;
    var y = h - boxHeight - margin;

    roundRect(ctx, x, y, boxWidth, boxHeight, 14);
    ctx.fill();

    ctx.fillStyle = '#f4f4f6';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(short, x + paddingX, y + boxHeight / 2);
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Hash + PRNG helpers

  function hashString(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
})();
