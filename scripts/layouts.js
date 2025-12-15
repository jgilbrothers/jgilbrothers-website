/* layout.js
   Single Source of Truth header/footer injection for static Cloudflare Pages.
   - Injects /components/header.html into #site-header
   - Injects /components/footer.html into #site-footer
   - Highlights active nav link
   - Injects minimal CSS to prevent header layout drift
*/

(function () {
  const headerMount = document.getElementById("site-header");
  const footerMount = document.getElementById("site-footer");

  // If the page isn't using the component system yet, do nothing.
  if (!headerMount && !footerMount) return;

  function normalizePath(path) {
    // Ensure trailing slash for folder routes, but keep "/" as "/"
    if (!path) return "/";
    if (path === "/") return "/";
    return path.endsWith("/") ? path : path + "/";
  }

  function injectBaseCssOnce() {
    if (document.getElementById("layout-base-css")) return;

    const style = document.createElement("style");
    style.id = "layout-base-css";
    style.textContent = `
      /* Keep header consistent across every page */
      .site-header { width: 100%; }
      .site-top {
        max-width: 1100px;
        margin: 0 auto;
        padding: 16px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }
      .site-brand { text-decoration: none; color: inherit; display: inline-block; }
      .site-brand__title { font-weight: 700; }
      .site-brand__subtitle { opacity: .7; font-size: 13px; }

      .site-nav { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
      .site-nav a { text-decoration: none; color: inherit; opacity: .85; }
      .site-nav a.active { opacity: 1; font-weight: 700; }

      .skip-link {
        position: absolute;
        left: -9999px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      .skip-link:focus {
        left: 18px;
        top: 12px;
        width: auto;
        height: auto;
        padding: 8px 10px;
        background: #000;
        color: #fff;
        z-index: 9999;
        border-radius: 8px;
      }

      .site-footer {
        width: 100%;
        margin-top: 48px;
        padding: 24px 18px;
      }
      .site-footer .footer-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: grid;
        gap: 10px;
      }
      .footer-disclaimer {
        opacity: .75;
        font-size: 13px;
        line-height: 1.4;
        max-width: 1000px;
      }
    `;
    document.head.appendChild(style);
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return await res.text();
  }

  function markActiveNav(rootEl) {
    const current = normalizePath(window.location.pathname);
    const links = rootEl.querySelectorAll("a[href]");
    links.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      const target = normalizePath(href);
      if (target === current) a.classList.add("active");
    });
  }

  (async function init() {
    try {
      injectBaseCssOnce();

      if (headerMount) {
        const headerHtml = await fetchText("/components/header.html");
        headerMount.innerHTML = headerHtml;
        markActiveNav(headerMount);
      }

      if (footerMount) {
        const footerHtml = await fetchText("/components/footer.html");
        footerMount.innerHTML = footerHtml;
      }
    } catch (e) {
      // Fail safe: don't break page rendering if component load fails
      console.error("[layout.js]", e);
    }
  })();
})();
