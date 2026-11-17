(function () {
  const bar = document.querySelector(".filter-bar");
  if (!bar) return;

  const buttons = bar.querySelectorAll("button[data-filter]");
  const cards = document.querySelectorAll(".mag-card[data-category], .feature-hero[data-category]");

  function apply(filter) {
    buttons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === filter);
      btn.setAttribute("aria-pressed", btn.dataset.filter === filter ? "true" : "false");
    });

    cards.forEach((card) => {
      const cat = card.dataset.category;
      const show = filter === "all" || cat === filter;
      card.hidden = !show;
    });

    document.querySelectorAll(".edition").forEach((edition) => {
      const anyVisible =
        edition.querySelectorAll(
          ".mag-card:not([hidden]), .feature-hero:not([hidden])"
        ).length > 0;
      edition.hidden = !anyVisible;
    });
  }

  buttons.forEach((btn, i) => {
    btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    btn.addEventListener("click", () => apply(btn.dataset.filter));
  });
})();