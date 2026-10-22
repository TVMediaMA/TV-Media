/**
 * services.js - Services Switchboard mode selector (services.html)
 * Toggles the four service modes without a page reload and supports
 * deep links via URL hash: #monthly, #sprints, #audits, #workshops.
 * Without JavaScript, every panel stays visible as a stacked page.
 */
(function () {
  "use strict";

  var wrap = document.getElementById("switchboard");
  if (!wrap) {
    return;
  }

  var tabs = Array.prototype.slice.call(wrap.querySelectorAll(".mode-tab"));
  var panels = Array.prototype.slice.call(wrap.querySelectorAll(".mode-panel"));
  if (!tabs.length || tabs.length !== panels.length) {
    return;
  }

  var modes = tabs.map(function (tab) {
    return tab.getAttribute("data-mode");
  });
  var DEFAULT_MODE = modes[0];

  function modeFromHash() {
    var key = window.location.hash.replace("#", "").toLowerCase();
    return modes.indexOf(key) !== -1 ? key : DEFAULT_MODE;
  }

  function activate(mode, options) {
    var opts = options || {};
    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute("data-mode") === mode;
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
      if (isActive && opts.focusTab) {
        tab.focus();
      }
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-mode") !== mode;
    });
    if (opts.updateHash && window.location.hash.replace("#", "") !== mode) {
      window.history.pushState(null, "", "#" + mode);
    }
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      activate(tab.getAttribute("data-mode"), { updateHash: true });
    });

    tab.addEventListener("keydown", function (event) {
      var nextIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      }
      if (nextIndex !== null) {
        event.preventDefault();
        activate(modes[nextIndex], { updateHash: true, focusTab: true });
      }
    });
  });

  window.addEventListener("hashchange", function () {
    activate(modeFromHash());
  });

  wrap.classList.add("js-ready");
  activate(modeFromHash());
})();

