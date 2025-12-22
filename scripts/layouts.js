/* /scripts/layouts.js
   Injects shared header/footer and activates current nav link.
   Compatible with existing /styles/styles.css header/footer system.
*/

(function () {
  const headerMount = document.getElementById("site-header");
  const footerMount = document.getElementById("site-footer");

  if (!headerMount && !footerMount) return;

  function normalizePath(p) {
    if (!p) return "/";
    if (p === "/") return "/";
    return p.endsWith("/") ? p : p + "/";
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return await res.text();
  }

  function setActiveNav(rootEl) {
    const current = normalizePath(window.location.pathname);
    const links = rootEl.querySelectorAll("a.nav-link[href]");
    links.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      const target = normalizePath(href);
      if (target === current) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function wireMobileToggle(rootEl) {
    const btn = rootEl.querySelector(".nav-toggle");
    const nav = rootEl.querySelector(".site-nav");
    if (!btn || !nav) return;

    function closeNav() {
      nav.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close after clicking a nav link (mobile)
    nav.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a.nav-link") : null;
      if (a) closeNav();
    });

    // Close on resize to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeNav();
    });
  }

  (async function init() {
    try {
      if (headerMount) {
        headerMount.innerHTML = await fetchText("/components/header.html");
        setActiveNav(headerMount);
        wireMobileToggle(headerMount);
      }

      if (footerMount) {
        footerMount.innerHTML = await fetchText("/components/footer.html");
      }
    } catch (e) {
      console.error("[layouts.js]", e);
    }
  })();
})();
