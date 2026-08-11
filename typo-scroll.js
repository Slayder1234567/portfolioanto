/* ============================================================
   ARCHIVE — Big Typo + centred video preview
   ------------------------------------------------------------
   Adapted from Osmo's "typo scroll" but WITHOUT its own Lenis /
   infinite-scroll (the site already runs a single Lenis +
   ScrollTrigger in app.js — a second instance would break it).

   Desktop : hovered title -> its video reveals, centred & fixed.
   Touch   : title nearest the viewport centre becomes active.
   Only the active item's <video> plays; the rest stay paused.
   ============================================================ */
(function () {
  "use strict";

  function initTypoScroll() {
    var containers = document.querySelectorAll("[data-typo-scroll-init]");
    if (!containers.length) return;

    function syncVideos(items) {
      items.forEach(function (item) {
        var v = item.querySelector("video");
        if (!v) return;
        if (item.getAttribute("data-typo-scroll-item") === "active") {
          if (v.paused) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          }
        } else if (!v.paused) {
          v.pause();
        }
      });
    }

    function setAll(items, activeItem) {
      items.forEach(function (item) {
        item.setAttribute(
          "data-typo-scroll-item",
          item === activeItem ? "active" : ""
        );
      });
      syncVideos(items);
    }

    var isTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;

    if (isTouch) {
      function update() {
        var centerY = window.innerHeight / 2;

        containers.forEach(function (container) {
          var items = container.querySelectorAll("[data-typo-scroll-item]");
          if (!items.length) return;

          var cRect = container.getBoundingClientRect();
          if (centerY < cRect.top || centerY > cRect.bottom) {
            setAll(items, null);
            return;
          }

          var closest = null;
          var closestDist = Infinity;
          items.forEach(function (item) {
            var r = item.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) return;
            var d = Math.abs(centerY - (r.top + r.height / 2));
            if (d < closestDist) {
              closestDist = d;
              closest = item;
            }
          });

          setAll(items, closest);
        });

        requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    } else {
      containers.forEach(function (container) {
        var items = container.querySelectorAll("[data-typo-scroll-item]");
        if (!items.length) return;

        items.forEach(function (item) {
          item.addEventListener("mouseenter", function () {
            setAll(items, item);
          });
        });

        container.addEventListener("mouseleave", function () {
          setAll(items, null);
        });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTypoScroll);
  } else {
    initTypoScroll();
  }
})();
