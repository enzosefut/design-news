(function () {
  const bar = document.querySelector(".filter-bar");
  if (!bar) return;

  const buttons = bar.querySelectorAll("button[data-filter]");
  const cards = document.querySelectorAll(".post-card[data-category]");

  function apply(filter) {
    buttons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === filter);
    });
    cards.forEach((card) => {
      const cat = card.dataset.category;
      const show = filter === "all" || cat === filter;
      card.hidden = !show;
    });
    document.querySelectorAll(".day-group").forEach((group) => {
      const visible = group.querySelectorAll(".post-card:not([hidden])").length > 0;
      group.hidden = !visible;
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => apply(btn.dataset.filter));
  });
})();