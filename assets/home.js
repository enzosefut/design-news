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

  const CARD_HOVER_SELECTOR =
    ".mag-card[data-category]:not([hidden]), .feature-hero[data-category]:not([hidden])";

  const HOVER_PROXIMITY_PX = 40;
  const HOVER_PERSPECTIVE = 650;
  const HOVER_QUICK_OPTS = { duration: 0.45, ease: "power3" };
  const HOVER_AMP = {
    card: { rot: 10, para: 16 },
    hero: { rot: 12, para: 20 },
  };

  let revealTriggers = [];
  let cardHoverControllers = [];
  let onCardPointerMove = null;
  let onCardPointerLeave = null;

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

  function isFinePointer() {
    return window.matchMedia("(pointer: fine)").matches;
  }

  function cardHoverInner(card) {
    if (card.classList.contains("feature-hero")) {
      return card.querySelector(
        ".feature-hero__media img, .feature-hero__media video"
      );
    }
    return card.querySelector(".mag-card__visual img, .mag-card__visual--type span");
  }

  function resetCardHoverController(c) {
    c.rotX(0);
    c.rotY(0);
    if (c.innerX) c.innerX(0);
    if (c.innerY) c.innerY(0);
    c.inZone = false;
  }

  function teardownCardHover() {
    if (onCardPointerMove) {
      document.removeEventListener("pointermove", onCardPointerMove);
      onCardPointerMove = null;
    }
    if (onCardPointerLeave) {
      document.documentElement.removeEventListener("pointerleave", onCardPointerLeave);
      onCardPointerLeave = null;
    }
    if (typeof gsap !== "undefined") {
      cardHoverControllers.forEach((c) => {
        resetCardHoverController(c);
        gsap.set(c.link, { rotationX: 0, rotationY: 0 });
        if (c.inner) gsap.set(c.inner, { x: 0, y: 0 });
      });
    }
    cardHoverControllers = [];
  }

  function initCardHover() {
    teardownCardHover();

    if (prefersReducedMotion() || !isFinePointer() || typeof gsap === "undefined") {
      return;
    }

    document.querySelectorAll(CARD_HOVER_SELECTOR).forEach((card) => {
      const link = card.querySelector(".mag-card__link, .feature-hero__link");
      if (!link) return;
      const inner = cardHoverInner(card);
      const amp = card.classList.contains("feature-hero")
        ? HOVER_AMP.hero
        : HOVER_AMP.card;

      gsap.set(card, { perspective: HOVER_PERSPECTIVE });
      gsap.set(link, {
        transformOrigin: "center center",
        transformPerspective: HOVER_PERSPECTIVE,
      });

      const rotX = gsap.quickTo(link, "rotationX", HOVER_QUICK_OPTS);
      const rotY = gsap.quickTo(link, "rotationY", HOVER_QUICK_OPTS);
      let innerX = null;
      let innerY = null;
      if (inner) {
        innerX = gsap.quickTo(inner, "x", HOVER_QUICK_OPTS);
        innerY = gsap.quickTo(inner, "y", HOVER_QUICK_OPTS);
      }

      cardHoverControllers.push({
        link,
        inner,
        rotX,
        rotY,
        innerX,
        innerY,
        amp,
        inZone: false,
      });
    });

    if (!cardHoverControllers.length) return;

    onCardPointerMove = (e) => {
      if (e.pointerType === "touch") {
        cardHoverControllers.forEach(resetCardHoverController);
        return;
      }

      const px = e.clientX;
      const py = e.clientY;

      cardHoverControllers.forEach((c) => {
        const r = c.link.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;

        const pad = HOVER_PROXIMITY_PX;
        const inProximity =
          px >= r.left - pad &&
          px <= r.right + pad &&
          py >= r.top - pad &&
          py <= r.bottom + pad;

        if (!inProximity) {
          if (c.inZone) resetCardHoverController(c);
          return;
        }

        c.inZone = true;
        const nx = gsap.utils.clamp(0, 1, (px - r.left) / r.width);
        const ny = gsap.utils.clamp(0, 1, (py - r.top) / r.height);
        const { rot, para } = c.amp;

        c.rotX(gsap.utils.interpolate(rot, -rot, ny));
        c.rotY(gsap.utils.interpolate(-rot, rot, nx));
        if (c.innerX) c.innerX(gsap.utils.interpolate(-para, para, nx));
        if (c.innerY) c.innerY(gsap.utils.interpolate(-para, para, ny));
      });
    };

    onCardPointerLeave = () => {
      cardHoverControllers.forEach(resetCardHoverController);
    };

    document.addEventListener("pointermove", onCardPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onCardPointerLeave);
  }

  function refreshCardHover() {
    initCardHover();
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
    requestAnimationFrame(() => {
      refreshScrollReveal();
      refreshCardHover();
    });
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
    initCardHover();
  }

  window.addEventListener(
    "resize",
    () => {
      cardHoverControllers.forEach(resetCardHoverController);
    },
    { passive: true }
  );

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