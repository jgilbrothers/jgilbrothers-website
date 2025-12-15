/* Image Generator (frontend)
   - Strong status + error handling
   - Works with /tools/image-generator/index.html IDs
   - Expects a same-origin API endpoint: /api/image-generate
*/

(function () {
  const form = document.getElementById("imageGenForm");
  const emailEl = document.getElementById("email");
  const promptEl = document.getElementById("prompt");
  const aspectEl = document.getElementById("aspect");
  const btn = document.getElementById("generateBtn");
  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("results");

  if (!form || !emailEl || !promptEl || !aspectEl || !btn || !statusEl || !resultsEl) {
    return; // page not loaded / IDs missing
  }

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

  function addImage(src, alt) {
    const img = document.createElement("img");
    img.className = "result-img";
    img.src = src;
    img.alt = alt || "Generated image";
    resultsEl.prepend(img);
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
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

    // quick heads-up for weapon prompts (common safety block)
    if (/gun|rifle|machine gun|pistol|shotgun/i.test(prompt)) {
      setStatus(
        "Heads up: prompts mentioning weapons often get blocked. If it fails, try removing weapon wording.\nGenerating..."
      );
    } else {
      setStatus("Generating...");
    }

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
        addImage(url, prompt);
        setStatus("Done.");
        return;
      }

      const text = await res.text();
      const data = safeJsonParse(text);

      if (!res.ok) {
        // show server error details
        const errMsg =
          (data && (data.error || data.message)) ||
          text ||
          `Request failed (${res.status})`;
        throw new Error(errMsg);
      }

      // Supported response shapes:
      // { imageUrl: "https://..." }
      // { url: "https://..." }
      // { image: "base64..." } or { b64: "..." }
      // { dataUrl: "data:image/png;base64,..." }
      const imageUrl =
        (data && (data.imageUrl || data.url)) ||
        null;

      const dataUrl =
        (data && data.dataUrl) ||
        null;

      const base64 =
        (data && (data.image || data.b64)) ||
        null;

      if (dataUrl && typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
        addImage(dataUrl, prompt);
        setStatus("Done.");
        return;
      }

      if (imageUrl && typeof imageUrl === "string") {
        addImage(imageUrl, prompt);
        setStatus("Done.");
        return;
      }

      if (base64 && typeof base64 === "string") {
        // assume png if not specified
        const src = base64.startsWith("data:image/")
          ? base64
          : `data:image/png;base64,${base64}`;
        addImage(src, prompt);
        setStatus("Done.");
        return;
      }

      // If we get here, API returned OK but no recognizable payload
      setStatus("Generated, but response format was unexpected. Check Worker response JSON.");
    } catch (err) {
      const msg =
        err && err.name === "AbortError"
          ? "Timed out. If your prompt is heavy or blocked, it may not complete. Try a simpler prompt."
          : (err && err.message) ? err.message : "Unknown error.";
      setStatus(`Error: ${msg}`);
    } finally {
      disable(false);
    }
  });
})();
