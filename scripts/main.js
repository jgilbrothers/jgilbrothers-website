// J GIL Brothers – Global JS

(function () {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  const body = document.body;

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = body.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close nav when a link is clicked (on mobile)
    nav.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.tagName.toLowerCase() === 'a' && body.classList.contains('nav-open')) {
        body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Set current year in footer if the element exists
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    const now = new Date();
    yearSpan.textContent = String(now.getFullYear());
  }
})();