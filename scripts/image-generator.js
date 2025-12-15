(() => {
  const $ = (id) => document.getElementById(id);

  const emailEl = $("email");
  const promptEl = $("prompt");
  const aspectEl = $("aspect");
  const btnEl = $("generateBtn");
  const resultEl = $("result");
  const remainingEl = $("remainingText");

  // Build API paths relative to wherever this page is mounted.
  // Works for /tools/image-generator/ routed to your Worker.
  function basePath() {
    // Example: /tools/image-generator/ or /tools/image-generator/index.html
    const p = window.location.pathname;
    const idx = p.indexOf("/tools/image-generator");
    if (idx === -1) return "/tools/image-generator/";
    const base = p.slice(0, idx) + "/tools/image-generator/";
    return base;
  }

  const API_GENERATE = basePath() + "api/generate";
  const API_HEALTH = basePath() + "health";

  function setLoading(isLoading) {
    btnEl.disabled = isLoading;
    btnEl.textContent = isLoading ? "Generating..." : "Generate Image";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }

  function showStatus(html) {
    resultEl.innerHTML = html;
  }

  async function checkHealth() {
    try {
      const r = await fetch(API_HEALTH, { method: "GET" });
      if (!r.ok) return;
      const j = await r.json();
      // If your Worker returns limits in /health, show them.
      if (typeof j.monthlyCapEmail === "number") {
        remainingEl.textContent = `Monthly cap: ${j.monthlyCapEmail}`;
      }
    } catch (_) {
      // silent
    }
  }

  async function generate() {
    const email = (emailEl.value || "").trim().toLowerCase();
    const prompt = (promptEl.value || "").trim();
    const aspect = (aspectEl.value || "1:1").trim();

    if (!email) {
      showStatus(`<div class="status-bad">Email is required.</div>`);
      emailEl.focus();
      return;
    }
    if (!prompt) {
      showStatus(`<div class="status-bad">Prompt is required.</div>`);
      promptEl.focus();
      return;
    }

    setLoading(true);
    showStatus(`<div class="meta">Generating… (usually ~5–20s)</div>`);

    try {
      const res = await fetch(API_GENERATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          prompt,
          aspect_ratio: aspect
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data;

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const txt = await res.text();
        data = { error: txt || "Unexpected response" };
      }

      if (!res.ok || data?.error) {
        const msg = data?.error || data?.message || `Request failed (${res.status})`;
        const remaining = typeof data?.remaining === "number" ? data.remaining : null;

        showStatus(`
          <div class="status-bad">Error: ${escapeHtml(msg)}</div>
          ${remaining !== null ? `<div class="meta">Remaining this month: ${remaining}</div>` : ``}
        `);
        return;
      }

      // Expected success payload:
      // { imageUrl: "data:image/png;base64,..."} OR { imageBase64: "..."} OR { image: "data:..." }
      // plus optional { remaining: number }
      const remaining = typeof data?.remaining === "number" ? data.remaining : null;

      let src =
        data?.imageUrl ||
        data?.image ||
        (data?.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : null);

      if (!src) {
        showStatus(`<div class="status-bad">Generated, but no image was returned.</div>`);
        return;
      }

      const safePrompt = escapeHtml(prompt).slice(0, 260);

      showStatus(`
        <div class="status-good">Success.</div>
        ${remaining !== null ? `<div class="meta">Remaining this month: ${remaining}</div>` : ``}
        <div class="img-wrap">
          <img src="${src}" alt="Generated image: ${safePrompt}" />
        </div>
        <div class="actions">
          <a class="btn" href="${src}" download="jgil-image.png">Download</a>
          <button class="btn" type="button" id="copyPromptBtn">Copy prompt</button>
        </div>
        <div class="meta" style="margin-top:10px;">Prompt: ${safePrompt}</div>
      `);

      const copyBtn = document.getElementById("copyPromptBtn");
      if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(prompt);
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy prompt"), 1000);
          } catch {
            copyBtn.textContent = "Copy failed";
            setTimeout(() => (copyBtn.textContent = "Copy prompt"), 1200);
          }
        });
      }

      if (remaining !== null) {
        remainingEl.textContent = `Remaining this month: ${remaining}`;
      }
    } catch (err) {
      showStatus(`<div class="status-bad">Network error: ${escapeHtml(err?.message || String(err))}</div>`);
    } finally {
      setLoading(false);
    }
  }

  // Button
  btnEl.addEventListener("click", generate);

  // Ctrl+Enter submits (nice UX)
  promptEl.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") generate();
  });

  // Initial
  checkHealth();
})();
