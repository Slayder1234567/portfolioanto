/* Runs inside every hosted client demo.

   The demo is displayed in an iframe on a project page. Two things have to be
   contained: links that leave the client's site would otherwise replace the
   demo frame, and any form that reaches a live endpoint would send real data
   from a portfolio visitor. */
(function () {
  "use strict";

  var host = window.location.hostname;

  function containLinks() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (!/^https?:/i.test(a.getAttribute("href") || "")) continue;
      if (a.hostname === host) continue;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  }

  // Belt and braces: this demo's own script already cancels its contact form,
  // but any form added later must not post from within the portfolio.
  function neutraliseForms() {
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form || form.tagName !== "FORM") return;
      var action = form.getAttribute("action");
      if (!action || action === "#") return; // handled by the site's own JS
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  function init() {
    containLinks();
    neutraliseForms();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
