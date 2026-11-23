(function () {
  function syncChromeHeights() {
    const header = document.querySelector(".site-header");
    if (header) {
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${Math.ceil(header.getBoundingClientRect().height)}px`
      );
    }
    document.documentElement.style.removeProperty("--date-rail-height");
  }

  syncChromeHeights();
  window.addEventListener("resize", syncChromeHeights);
  window.addEventListener("orientationchange", syncChromeHeights);
  if (document.fonts?.ready) document.fonts.ready.then(syncChromeHeights);

  const bar = document.querySelector(".filter-bar");
  const editions = () => document.querySelectorAll(".edition");
  const cards = () =>
    document.querySelectorAll(".mag-card[data-category], .feature-hero[data-category]");
  const navLinks = () =>
    document.querySelectorAll(".date-nav__link, .date-rail__chip");

  const REVEAL_SELECTOR =
    ".mag-card[data-category]:not([hidden]), .feature-hero[data-category]:not([hidden])";

  let revealTriggers = [];

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function showAllCardsImmediately() {
    document.documentElement.classList.add("cards-visible");
    document.querySelectorAll(".mag-card, .feature-hero").forEach((el) => {
      el.classList.add("is-revealed");
    });
  }

  function teardownReveal() {
    revealTriggers.forEach((st) => st.kill());
    revealTriggers = [];
  }

  function markRevealed(elements) {
    elements.forEach((el) => el.classList.add("is-revealed"));
  }

  function initScrollReveal() {
    teardownReveal();

    if (prefersReducedMotion()) {
      showAllCardsImmediately();
      return;
    }

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      showAllCardsImmediately();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
      if (!el.classList.contains("is-revealed")) {
        gsap.set(el, { autoAlpha: 0 });
      }
    });

    revealTriggers = ScrollTrigger.batch(REVEAL_SELECTOR, {
      onEnter: (batch) => {
        const todo = batch.filter((el) => !el.classList.contains("is-revealed"));
        if (!todo.length) return;
        gsap.to(todo, {
          autoAlpha: 1,
          stagger: 0.2,
          duration: 1,
          ease: "sine.out",
          onComplete: () => markRevealed(todo),
        });
      },
    });

    ScrollTrigger.refresh();
  }

  function refreshScrollReveal() {
    if (
      prefersReducedMotion() ||
      document.documentElement.classList.contains("cards-visible")
    ) {
      return;
    }
    if (typeof ScrollTrigger === "undefined") return;
    initScrollReveal();
  }

  function applyFilter(filter) {
    if (!bar) return;
    const buttons = bar.querySelectorAll("button[data-filter]");
    buttons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === filter);
      btn.setAttribute("aria-pressed", btn.dataset.filter === filter ? "true" : "false");
    });

    cards().forEach((card) => {
      const cat = card.dataset.category;
      const show = filter === "all" || cat === filter;
      card.hidden = !show;
    });

    editions().forEach((edition) => {
      const anyVisible =
        edition.querySelectorAll(
          ".mag-card:not([hidden]), .feature-hero:not([hidden])"
        ).length > 0;
      edition.hidden = !anyVisible;
      edition.classList.toggle("edition--muted", !anyVisible);
    });

    syncNavFromVisibility();
    requestAnimationFrame(() => refreshScrollReveal());
  }

  function editionHasVisible(date) {
    const el = document.getElementById(date);
    if (!el || el.hidden) return false;
    return (
      el.querySelectorAll(
        ".mag-card:not([hidden]), .feature-hero:not([hidden])"
      ).length > 0
    );
  }

  function syncNavFromVisibility() {
    navLinks().forEach((link) => {
      const d = link.dataset.date;
      const dim = !editionHasVisible(d);
      link.classList.toggle("date-nav__link--muted", dim);
      link.setAttribute("aria-disabled", dim ? "true" : "false");
    });
  }

  function setActiveDate(date) {
    navLinks().forEach((link) => {
      link.classList.toggle("is-active", link.dataset.date === date);
    });
  }

  function getScrollOffsetPx() {
    const header = document.querySelector(".site-header");
    let offset = header ? header.getBoundingClientRect().height : 96;
    const root = getComputedStyle(document.documentElement);
    const gap = parseFloat(root.getPropertyValue("--edition-scroll-gap")) || 1;
    offset += gap * 16;
    return Math.ceil(offset);
  }

  function scrollToEdition(date) {
    const el = document.getElementById(date);
    if (!el || el.hidden) return;
    history.replaceState(null, "", `#${date}`);
    const target = el.querySelector(".edition__mast") || el;
    const y = target.getBoundingClientRect().top + window.scrollY - getScrollOffsetPx();
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    setActiveDate(date);
    window.setTimeout(() => {
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    }, 450);
  }

  if (bar) {
    bar.querySelectorAll("button[data-filter]").forEach((btn, i) => {
      btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
    });
    applyFilter("all");
  } else {
    initScrollReveal();
  }

  navLinks().forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.getAttribute("aria-disabled") === "true") {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      scrollToEdition(link.dataset.date);
    });
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveDate(visible[0].target.dataset.date);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );
    editions().forEach((ed) => observer.observe(ed));
  }

  window.setTimeout(() => {
    if (
      !document.documentElement.classList.contains("cards-visible") &&
      (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
    ) {
      showAllCardsImmediately();
    }
  }, 4000);

  const hash = window.location.hash.replace(/^#/, "");
  if (hash && document.getElementById(hash)) {
    requestAnimationFrame(() => scrollToEdition(hash));
  }
})();