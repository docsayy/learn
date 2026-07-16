/*
 * Learn Medicine — Article Reading Progress
 *
 * Add before </body>:
 * <script src="../assets/js/article-progress.js"></script>
 *
 * The script works with either:
 *   <div id="reading-progress"></div>
 *   <div id="progressBar" class="progress-bar"></div>
 *
 * If neither exists, it creates the progress bar automatically.
 */

(() => {
  "use strict";

  const STORAGE_PREFIX = "learnMedicineArticleProgress:v1:";
  const storageKey = `${STORAGE_PREFIX}${location.pathname}`;

  let progressBar = null;
  let frameRequested = false;
  let lastSavedPercent = -1;

  function createProgressBar() {
    const bar = document.createElement("div");
    bar.id = "reading-progress";
    bar.setAttribute("aria-hidden", "true");

    Object.assign(bar.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "0%",
      height: "4px",
      zIndex: "9999",
      pointerEvents: "none",
      background: "var(--accent, #0f766e)",
      transition: "width 80ms linear"
    });

    document.body.prepend(bar);
    return bar;
  }

  function findProgressBar() {
    return (
      document.getElementById("reading-progress") ||
      document.getElementById("progressBar") ||
      document.querySelector(".progress-bar") ||
      createProgressBar()
    );
  }

  function getProgress() {
    const root = document.documentElement;
    const scrollTop = window.scrollY || root.scrollTop || 0;
    const scrollableHeight = Math.max(
      0,
      root.scrollHeight - window.innerHeight
    );

    if (scrollableHeight <= 0) return 100;

    return Math.min(
      100,
      Math.max(0, (scrollTop / scrollableHeight) * 100)
    );
  }

  function saveProgress(percent) {
    const roundedPercent = Math.round(percent);

    // Avoid writing to localStorage on every pixel of scrolling.
    if (
      roundedPercent === lastSavedPercent ||
      (roundedPercent % 2 !== 0 && roundedPercent < 95)
    ) {
      return;
    }

    lastSavedPercent = roundedPercent;

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          percent: roundedPercent,
          completed: roundedPercent >= 95,
          updatedAt: new Date().toISOString()
        })
      );
    } catch (_) {
      // Reading progress still works when storage is blocked or unavailable.
    }
  }

  function renderProgress() {
    frameRequested = false;

    if (!progressBar) return;

    const percent = getProgress();
    progressBar.style.width = `${percent}%`;
    progressBar.dataset.progress = String(Math.round(percent));
    document.documentElement.dataset.readingProgress = String(
      Math.round(percent)
    );

    saveProgress(percent);

    window.dispatchEvent(
      new CustomEvent("learnmedicine:reading-progress", {
        detail: {
          percent: Math.round(percent),
          completed: percent >= 95
        }
      })
    );
  }

  function requestRender() {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(renderProgress);
  }

  function initialize() {
    progressBar = findProgressBar();

    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("aria-label", "Article reading progress");
    progressBar.setAttribute("aria-valuemin", "0");
    progressBar.setAttribute("aria-valuemax", "100");

    window.addEventListener("scroll", requestRender, { passive: true });
    window.addEventListener("resize", requestRender, { passive: true });
    window.addEventListener("orientationchange", requestRender, {
      passive: true
    });
    window.addEventListener("load", requestRender, { once: true });
    window.addEventListener("pageshow", requestRender);

    // Recalculate when images, accordions, calculators, or narration controls
    // change the article height after the initial page load.
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(requestRender);
      observer.observe(document.documentElement);
    }

    requestRender();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
