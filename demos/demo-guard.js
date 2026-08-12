/* Runs inside every hosted client demo.

   The demo is a copy of a real client site shown in an iframe on a project
   page. It exists to be looked at and clicked through — nothing in it should
   reach the outside world. Anything that would leave the site (social links,
   mail and phone links, form submissions, booking confirmations) is made inert
   here, without touching the client's own markup or styling.

   Everything is handled on the capture phase at document level, so it fires
   before the page's own listeners and cancels them too — otherwise the contact
   form would still flash its "Request sent!" confirmation. */
(function () {
  "use strict";

  var EXTERNAL_SCHEME = /^(mailto:|tel:|sms:)/i;
  var ABSOLUTE_URL = /^https?:/i;

  function leavesTheSite(a) {
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return false;
    if (EXTERNAL_SCHEME.test(href)) return true;
    if (ABSOLUTE_URL.test(href)) return a.hostname !== window.location.hostname;
    return false;
  }

  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  // Links out of the demo: dead on click, and never opened in a new tab.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (a && leavesTheSite(a)) stop(e);
  }, true);

  // Every form — contact, booking, newsletter — stays inert.
  document.addEventListener("submit", function (e) {
    if (e.target && e.target.tagName === "FORM") stop(e);
  }, true);

  // Network calls. A demo is a static copy — its backend was left behind, so a
  // checkout or newsletter call would hit the portfolio's own origin and 404.
  // Block anything cross-origin or aimed at an API route, and fail with a
  // message the copied site can show in its own error handling.
  function blocked(url) {
    try {
      var u = new URL(url, window.location.href);
      if (u.origin !== window.location.origin) return true;
      return /(^|\/)api\//.test(u.pathname);
    } catch (e) {
      return false;
    }
  }

  var DEMO_ERROR = "this is a demo, the live backend is not connected";

  if (window.fetch) {
    var realFetch = window.fetch;
    window.fetch = function (input) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      if (blocked(url)) return Promise.reject(new Error(DEMO_ERROR));
      return realFetch.apply(this, arguments);
    };
  }

  if (window.XMLHttpRequest) {
    var realOpen = XMLHttpRequest.prototype.open;
    var realSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__demoBlocked = blocked(url);
      return realOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      if (this.__demoBlocked) {
        var xhr = this;
        setTimeout(function () {
          if (typeof xhr.onerror === "function") xhr.onerror(new Error(DEMO_ERROR));
          xhr.dispatchEvent(new Event("error"));
        }, 0);
        return;
      }
      return realSend.apply(this, arguments);
    };
  }

  // Mark them up front so nothing opens a tab and assistive tech agrees.
  function markInert() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      if (!leavesTheSite(links[i])) continue;
      links[i].removeAttribute("target");
      links[i].setAttribute("aria-disabled", "true");
    }
    var forms = document.querySelectorAll("form");
    for (var j = 0; j < forms.length; j++) {
      forms[j].setAttribute("novalidate", "");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markInert);
  } else {
    markInert();
  }
})();
