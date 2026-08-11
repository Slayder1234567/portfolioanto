/* ============================================================
   SHUTTER PAGE TRANSITION  (reload-based, no SPA)
   ------------------------------------------------------------
   · Click an internal link  -> shutters slide up to COVER, then
     the browser navigates (real page load).
   · New page loads          -> if we arrived via a shutter nav,
     the shutters slide away to REVEAL the page.
   Pure GSAP, no Barba/Lenis dependency. app.js stays untouched.
   ============================================================ */
(function () {
  "use strict";

  if (typeof window.gsap === "undefined") return;
  var gsap = window.gsap;

  // ── Tunables ────────────────────────────────────────────
  var SHUTTERS = 10;     // number of horizontal bands
  var DUR      = 0.5;    // base duration per band
  var STAGGER  = 0.3;    // spread of the stagger across all bands
  var FLAG     = "shutterNav";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var panel = document.querySelector("[data-transition-panel]");
  if (!panel) return;

  // ── Build the N shutter bands by cloning the template ────
  function buildShutters() {
    var existing = panel.querySelectorAll("[data-transition-shutter]");
    if (existing.length === SHUTTERS) return existing;
    var template = existing[0];
    if (!template) return existing;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < SHUTTERS; i++) frag.appendChild(template.cloneNode(true));
    panel.replaceChildren(frag);
    return panel.querySelectorAll("[data-transition-shutter]");
  }

  function hidePanel() {
    document.documentElement.classList.remove("t-cover");
    gsap.set(panel, { opacity: 0 });
  }

  // ── REVEAL : shutters retract upward to uncover the page ──
  function reveal() {
    var shutters = buildShutters();
    document.documentElement.classList.remove("t-cover");

    if (reducedMotion) { hidePanel(); return; }

    gsap.set(panel, { opacity: 1, pointerEvents: "none" });
    gsap.set(shutters, {
      yPercent: 0,
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
    });

    gsap.timeline({ onComplete: hidePanel })
      .to(shutters, {
        duration: DUR * 1.5,
        ease: "expo.out",
        yPercent: -50,
        clipPath: "polygon(0% 0%, 100% 0%, 100% -2%, 0% -2%)",
        stagger: { amount: STAGGER, from: "end" }
      });
  }

  // ── COVER : shutters climb up to cover, then navigate ─────
  var navigating = false;
  function cover(href) {
    if (navigating) return;
    navigating = true;

    if (reducedMotion) { window.location.href = href; return; }

    var shutters = buildShutters();
    try { sessionStorage.setItem(FLAG, "1"); } catch (e) {}

    gsap.set(panel, { opacity: 1, pointerEvents: "auto" });
    gsap.set(shutters, {
      scaleY: 1.02,
      yPercent: 50,
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
    });

    var done = false;
    function go() { if (done) return; done = true; window.location.href = href; }

    var tl = gsap.timeline({ onComplete: go });
    tl.to(shutters, {
      duration: DUR,
      ease: "power3.in",
      yPercent: 0,
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      stagger: { amount: STAGGER, from: "end" }
    }, 0);

    // NOTE: do NOT transform <main> here. It has margin-left and contains a
    // position:fixed pinned #hero; a transform on <main> would become the
    // hero's containing block and shift it right by --nav-w (black gutter).

    // Safety net: navigate even if the timeline stalls.
    setTimeout(go, (DUR + STAGGER) * 1000 + 300);
  }

  // ── Same-page transition : cover, run an action, reveal ───
  //    Used by in-page jumps (hero thumbnails -> work panels) so they
  //    get the exact same shutters as a real page navigation.
  function coverThen(action) {
    if (typeof action !== "function") return;
    if (navigating) return;

    if (reducedMotion) { action(); return; }

    navigating = true;
    var shutters = buildShutters();

    gsap.set(panel, { opacity: 1, pointerEvents: "auto" });
    gsap.set(shutters, {
      scaleY: 1.02,
      yPercent: 50,
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
    });

    function afterCover() {
      try { action(); } catch (e) {}
      // Two frames so the scroll jump / layout settles while still covered.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          navigating = false;
          reveal();
        });
      });
    }

    gsap.timeline({ onComplete: afterCover })
      .to(shutters, {
        duration: DUR,
        ease: "power3.in",
        yPercent: 0,
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        stagger: { amount: STAGGER, from: "end" }
      }, 0);
  }

  window.pageTransition = { coverThen: coverThen };

  // ── Decide whether a link should trigger a transition ─────
  function navTarget(a) {
    if (!a) return null;
    if (a.target && a.target !== "_self") return null;
    if (a.hasAttribute("download")) return null;
    if (a.hasAttribute("data-no-transition")) return null;

    var raw = a.getAttribute("href");
    if (!raw || raw.charAt(0) === "#") return null;
    if (/^(mailto:|tel:|javascript:)/i.test(raw)) return null;

    var url;
    try { url = new URL(a.href, window.location.href); } catch (e) { return null; }
    if (url.origin !== window.location.origin) return null;

    // Same page, only a hash change -> let in-page scroll handle it.
    if (url.pathname === window.location.pathname && url.hash) return null;
    if (url.href === window.location.href) return null;

    return url.href;
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    var href = navTarget(a);
    if (!href) return;
    e.preventDefault();
    cover(href);
  }, true);

  // ── On load: reveal if we just transitioned in ────────────
  var arrived = false;
  try { arrived = !!sessionStorage.getItem(FLAG); sessionStorage.removeItem(FLAG); } catch (e) {}

  if (arrived) reveal();
  else { buildShutters(); hidePanel(); }

  // ── bfcache restore (back/forward): never leave it stuck ──
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) {
      navigating = false;
      try { sessionStorage.removeItem(FLAG); } catch (e) {}
      hidePanel();
    }
  });
})();
