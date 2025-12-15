/* Image Generator (frontend)
   - Strong status + error handling
   - Results displayed as cards (not huge)
   - Click image to open lightbox
   - Expects same-origin endpoint: /api/image-generate
*/

(function () {
  const form = document.getElementById("imageGenForm");
  const emailEl = document.getElementById("email");
  const promptEl = document.getElementById("prompt");
  const aspectEl = document.getElementById("aspect");
  const btn = document.getElementById("generateBtn");
  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("results");

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");

  if (!form || !emailEl || !promptEl || !aspectEl || !btn || !statusEl || !resultsEl) return;

  const API_ENDPOINT = "/api/image-generate";
  const TIMEOUT_MS = 45000;

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function disable(state) {
    btn.disabled = state;
    btn.textContent = state ? "Generating..." : "Generate Image";
  }

  function safeJsonParse(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function openLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
  }

  if (lightbox) {
    lightbox.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  function addResultCard(src, prompt, aspect) {
    const card = document.createElement("div");
    card.className = "result-card";

    const img = document.createElement("img");
    img.src = src;
    img.alt = "Generated image";
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(src));

    const meta = document.createElement("div");
    meta.className = "result-meta";
    meta.textContent = `Aspect: ${aspect} • ${prompt.length > 90 ? prompt.slice(0, 90) + "…" : prompt}`;

    card.appendChild(img);
    card.appendChild(meta);

    resultsEl.prepend(card);
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = (emailEl.value || "").trim();
    const prompt = (promptEl.value || "").trim();
    const aspect = (aspectEl.value || "1:1").trim();

    if (!email || !prompt) {
      setStatus("Email + Prompt are required.");
      return;
    }

    setStatus("Generating...");
    disable(true);

    try {
      const res = await fetchWithTimeout(
        API_ENDPOINT,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, prompt, aspect })
        },
        TIMEOUT_MS
      );

      const contentType = (res.headers.get("content-type") || "").toLowerCase();

      // If API returns an image directly
      if (contentType.startsWith("image/")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        addResultCard(url, prompt, aspect);
        setStatus("Done.");
        return;
      }

      const text = await res.text();
      const data = safeJsonParse(text);

      if (!res.ok) {
        const errMsg =
          (data && (data.error || data.message)) ||
          text ||
          `Request failed (${res.status})`;
        throw new Error(errMsg);
      }

      const imageUrl = (data && (data.imageUrl || data.url)) || null;
      const dataUrl = (data && data.dataUrl) || null;
      const base64 = (data && (data.image || data.b64)) || null;

      if (dataUrl && typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
        addResultCard(dataUrl, prompt, aspect);
        setStatus("Done.");
        return;
      }

      if (imageUrl && typeof imageUrl === "string") {
        addResultCard(imageUrl, prompt, aspect);
        setStatus("Done.");
        return;
      }

      if (base64 && typeof base64 === "string") {
        const src = base64.startsWith("data:image/")
          ? base64
          : `data:image/png;base64,${base64}`;
        addResultCard(src, prompt, aspect);
        setStatus("Done.");
        return;
      }

      setStatus("Generated, but response format was unexpected. Check Worker response JSON.");
    } catch (err) {
      const msg =
        err && err.name === "AbortError"
          ? "Timed out. Try a simpler prompt."
          : (err && err.message) ? err.message : "Unknown error.";
      setStatus(`Error: ${msg}`);
    } finally {
      disable(false);
    }
  });
})();
