(() => {
  const form = document.getElementById("imgGenForm");
  if (!form) return;

  const emailEl = document.getElementById("email");
  const promptEl = document.getElementById("prompt");
  const aspectEl = document.getElementById("aspectRatio");

  const btn = document.getElementById("generateBtn");
  const statusEl = document.getElementById("status");
  const quotaEl = document.getElementById("quota");

  const resultWrap = document.getElementById("resultWrap");
  const resultImg = document.getElementById("resultImg");
  const downloadLink = document.getElementById("downloadLink");
  const errorBox = document.getElementById("errorBox");

  const API_ENDPOINT = "/api/image-generate";

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function showError(msg) {
    if (!errorBox) return;
    errorBox.hidden = false;
    errorBox.textContent = msg || "Something went wrong.";
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function showResult(dataUrl) {
    if (!resultWrap || !resultImg || !downloadLink) return;
    resultImg.src = dataUrl;
    downloadLink.href = dataUrl;
    resultWrap.hidden = false;
  }

  function hideResult() {
    if (!resultWrap) return;
    resultWrap.hidden = true;
    if (resultImg) resultImg.removeAttribute("src");
    if (downloadLink) downloadLink.href = "#";
  }

  function normalizeEmail(v) {
    const s = String(v || "").trim().toLowerCase();
    if (!s.includes("@")) return "";
    return s;
  }

  function safeString(v) {
    return String(v == null ? "" : v);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    hideResult();

    const email = normalizeEmail(emailEl?.value);
    const prompt = safeString(promptEl?.value).trim();
    const aspect_ratio = safeString(aspectEl?.value || "1:1").trim();

    if (!email) {
      showError("Email is required.");
      return;
    }
    if (prompt.length < 5) {
      showError("Prompt is too short. Add more detail.");
      return;
    }

    btn.disabled = true;
    setStatus("Generating…");
    quotaEl.textContent = "";

    try {
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          prompt,
          aspect_ratio,
          output_format: "png",
        }),
      });

      let data;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // If something upstream returns non-JSON, show text
        const t = await res.text();
        throw new Error(t || "Unexpected response from server.");
      }

      if (!res.ok) {
        // Worker returns: { error: "..." }
        const msg = data?.error || `Request failed (${res.status}).`;
        showError(msg);
        setStatus("");
        return;
      }

      if (!data?.image) {
        showError("No image returned. Try a different prompt.");
        setStatus("");
        return;
      }

      showResult(data.image);

      if (typeof data.remaining === "number") {
        quotaEl.textContent = `Remaining this month: ${data.remaining}`;
      }

      setStatus("Done.");
    } catch (err) {
      showError(err?.message || "Network error. Try again.");
      setStatus("");
    } finally {
      btn.disabled = false;
      setTimeout(() => setStatus(""), 2500);
    }
  });
})();
