(() => {
  const nav = document.getElementById("site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (nav && toggle) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => {
      setOpen(!nav.classList.contains("is-open"));
    });

    nav.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.matches && t.matches("a")) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  // Active link
  const links = document.querySelectorAll(".nav-link");
  const path = window.location.pathname || "/";

  const normalize = (p) => {
    if (!p) return "/";
    // treat /index.html as /
    if (p === "/index.html") return "/";
    return p;
  };

  const current = normalize(path);

  links.forEach((a) => {
    const href = normalize(a.getAttribute("href"));

    // folder routes: match exact folder prefix
    const isFolder = href.endsWith("/");

    const match = isFolder
      ? current === href || current.startsWith(href)
      : current === href;

    if (match) a.setAttribute("aria-current", "page");
  });
})();
