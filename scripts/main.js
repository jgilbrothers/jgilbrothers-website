// J GIL Brothers global scripts

// Keep footer year current
(function setFooterYear() {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
