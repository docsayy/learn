/*
 * Learn Medicine — Floating Article Narration v4.1.0
 * Browser-native narration using the Web Speech API.
 *
 * Add before </body>:
 * <script src="../assets/js/article-narration.js?v=4.1.0"></script>
 *
 * The script automatically loads ../css/article-narration.css?v=4.1.0.
 */

(() => {
  "use strict";

  const VERSION = "4.1.0";
  const GLOBAL_KEY = "__learnMedicineNarration";
  const currentScript = document.currentScript;
  const synth = window.speechSynthesis;

  const CONFIG = {
    contentSelectors: [
      "[data-narration-content]",
      ".article-body",
      ".article-content",
      ".content",
      "article",
      "main"
    ],
    readableSelector:
      "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, dt, dd, th, td",
    headingSelector: "h1, h2, h3, h4, h5, h6",
    excludedSelector: [
      "[data-narration-ignore]",
      ".narration-floating-root",
      ".narration-player",
      ".toc",
      ".table-of-contents",
      ".article-toc",
      ".article-meta",
      ".article-breadcrumb",
      ".breadcrumb",
      ".home-btn",
      ".back-home",
      ".reading-time",
      ".article-actions",
      ".references",
      ".reference-list",
      "#references",
      "nav",
      "footer",
      "script",
      "style",
      "noscript",
      "button",
      "select",
      "input",
      "textarea",
      "pre",
      "code",
      "[aria-hidden='true']",
      "[hidden]"
    ].join(", "),
    rates: [0.75, 1, 1.25, 1.5, 1.75, 2],
    defaultRate: 1,
    maxChunkLength: 280,
    playerId: "article-narration-player",
    activeClass: "narration-active",
    storagePrefix: "learnMedicineNarration:v4:",
    preferenceStorageKey: "learnMedicineNarration:preferences:v4",
    legacyPreferenceKeys: [
      "learnMedicineNarration:preferences:v2",
      "learnMedicineNarration:preferences:v3"
    ],
    legacyStatePrefixes: [
      "learnMedicineNarration:v1:",
      "learnMedicineNarration:v2:",
      "learnMedicineNarration:v3:"
    ]
  };

  const state = {
    root: null,
    floatingRoot: null,
    launcher: null,
    chunks: [],
    currentIndex: 0,
    currentUtterance: null,
    mode: "idle", // idle | playing | paused | complete
    panelOpen: false,
    voices: [],
    voiceURI: "",
    voiceName: "",
    voiceLang: "",
    hasVoicePreference: false,
    rate: CONFIG.defaultRate,
    playAfterVoiceLoad: false,
    saveTimer: null,
    preferenceSaveTimer: null,
    controls: {},
    destroyed: false,
    lastTouchActivation: 0
  };

  const storageKey = `${CONFIG.storagePrefix}${location.pathname}`;

  const MEDICAL_REPLACEMENTS = [
    // Common syndromes, tests, and clinical abbreviations.
    [/\bHFrEF\b/gi, "heart failure with reduced ejection fraction"],
    [/\bHFmrEF\b/gi, "heart failure with mildly reduced ejection fraction"],
    [/\bHFpEF\b/gi, "heart failure with preserved ejection fraction"],
    [/\bMINOCA\b/gi, "myocardial infarction with non-obstructive coronary arteries"],
    [/\bSCAD\b/gi, "spontaneous coronary artery dissection"],
    [/\bSTEMI\b/gi, "S T elevation myocardial infarction"],
    [/\bNSTEMI\b/gi, "non S T elevation myocardial infarction"],
    [/\bACS\b/g, "A C S"],
    [/\bMI\b/g, "myocardial infarction"],
    [/\bCAD\b/g, "coronary artery disease"],
    [/\bCHF\b/g, "congestive heart failure"],
    [/\bCOPD\b/g, "C O P D"],
    [/\bARDS\b/g, "A R D S"],
    [/\bOSA\b/g, "obstructive sleep apnea"],
    [/\bCKD\b/g, "chronic kidney disease"],
    [/\bAKI\b/g, "acute kidney injury"],
    [/\bESRD\b/g, "end stage renal disease"],
    [/\bDKA\b/g, "diabetic ketoacidosis"],
    [/\bHHS\b/g, "hyperosmolar hyperglycemic state"],
    [/\bDVT\b/g, "deep vein thrombosis"],
    [/\bPE\b/g, "pulmonary embolism"],
    [/\bPNA\b/g, "pneumonia"],
    [/\bUTI\b/g, "urinary tract infection"],
    [/\bCVA\b/g, "cerebrovascular accident"],
    [/\bTIA\b/g, "transient ischemic attack"],
    [/\bGI\b/g, "G I"],
    [/\bGU\b/g, "G U"],
    [/\bICU\b/g, "I C U"],
    [/\bMICU\b/g, "medical I C U"],
    [/\bCCU\b/g, "cardiac care unit"],
    [/\bED\b/g, "emergency department"],
    [/\bOR\b/g, "operating room"],
    [/\bABG\b/g, "arterial blood gas"],
    [/\bVBG\b/g, "venous blood gas"],
    [/\bCBC\b/g, "C B C"],
    [/\bBMP\b/g, "B M P"],
    [/\bCMP\b/g, "C M P"],
    [/\bLFTs?\b/g, "liver function tests"],
    [/\bBUN\b/g, "B U N"],
    [/\bINR\b/g, "I N R"],
    [/\bPTT\b/g, "P T T"],
    [/\bPT\b/g, "P T"],
    [/\bECG\b/g, "E C G"],
    [/\bEKG\b/g, "E K G"],
    [/\bEEG\b/g, "E E G"],
    [/\bCT\b/g, "C T"],
    [/\bCTA\b/g, "C T angiography"],
    [/\bMRI\b/g, "M R I"],
    [/\bMRA\b/g, "M R angiography"],
    [/\bLP\b/g, "lumbar puncture"],
    [/\bCSF\b/g, "cerebrospinal fluid"],
    [/\bHIV\b/g, "H I V"],
    [/\bAIDS\b/g, "AIDS"],
    [/\bCD4\b/g, "C D four"],
    [/\bWBC\b/g, "white blood cell count"],
    [/\bRBC\b/g, "red blood cell count"],
    [/\bHgb\b/gi, "hemoglobin"],
    [/\bHct\b/gi, "hematocrit"],
    [/\bPlt\b/gi, "platelets"],
    [/\bMAP\b/g, "mean arterial pressure"],
    [/\bSBP\b/g, "systolic blood pressure"],
    [/\bDBP\b/g, "diastolic blood pressure"],
    [/\bHR\b/g, "heart rate"],
    [/\bRR\b/g, "respiratory rate"],
    [/\bSpO(?:2|₂)(?!\w)/gi, "oxygen saturation"],
    [/\bPaO(?:2|₂)(?!\w)/gi, "P A O two"],
    [/\bPaCO(?:2|₂)(?!\w)/gi, "P A C O two"],
    [/\bFiO(?:2|₂)(?!\w)/gi, "F I O two"],
    [/\bPEEP\b/g, "P E E P"],
    [/\bBiPAP\b/gi, "bi pap"],
    [/\bCPAP\b/gi, "C pap"],
    [/\bHFNC\b/g, "high flow nasal cannula"],
    [/\bNPO\b/g, "nothing by mouth"],
    [/\bIV\b/g, "intravenous"],
    [/\bIM\b/g, "intramuscular"],
    [/\bSQ\b/g, "subcutaneous"],
    [/\bSC\b/g, "subcutaneous"],
    [/\bPO\b/g, "by mouth"],
    [/\bPRN\b/g, "as needed"],
    [/\bBID\b/gi, "twice daily"],
    [/\bTID\b/gi, "three times daily"],
    [/\bQID\b/gi, "four times daily"],
    [/\bq(\d+)h\b/gi, "every $1 hours"],
    [/\bqHS\b/gi, "every night at bedtime"],
    [/\bqAM\b/gi, "every morning"],
    [/\bSTAT\b/gi, "stat"],

    // Units. These patterns require a preceding number to avoid changing ordinary letters.
    [/(\d+(?:\.\d+)?)\s*mg\/dL\b/gi, "$1 milligrams per deciliter"],
    [/(\d+(?:\.\d+)?)\s*mmol\/L\b/gi, "$1 millimoles per liter"],
    [/(\d+(?:\.\d+)?)\s*mEq\/L\b/gi, "$1 milliequivalents per liter"],
    [/(\d+(?:\.\d+)?)\s*mcg\/kg\/min\b/gi, "$1 micrograms per kilogram per minute"],
    [/(\d+(?:\.\d+)?)\s*(?:mcg|µg)\b/gi, "$1 micrograms"],
    [/(\d+(?:\.\d+)?)\s*mg\b/gi, "$1 milligrams"],
    [/(\d+(?:\.\d+)?)\s*kg\b/gi, "$1 kilograms"],
    [/(\d+(?:\.\d+)?)\s*mL\b/g, "$1 milliliters"],
    [/(\d+(?:\.\d+)?)\s*L\/min\b/g, "$1 liters per minute"],
    [/(\d+(?:\.\d+)?)\s*cm\b/gi, "$1 centimeters"],
    [/(\d+(?:\.\d+)?)\s*mm\s*Hg\b/gi, "$1 millimeters of mercury"],
    [/(\d+(?:\.\d+)?)\s*bpm\b/gi, "$1 beats per minute"],
    [/(\d+(?:\.\d+)?)\s*%/g, "$1 percent"],

    // Symbols and formatting commonly found in medical articles.
    [/≥/g, " greater than or equal to "],
    [/≤/g, " less than or equal to "],
    [/\s>\s/g, " greater than "],
    [/\s<\s/g, " less than "],
    [/→/g, " leads to "],
    [/↔/g, " compared with "],
    [/±/g, " plus or minus "],
    [/₂/g, " two"],
    [/₃/g, " three"],
    [/⁺/g, " positive"],
    [/⁻/g, " negative"],
    [/([0-9])\s*[–—]\s*([0-9])/g, "$1 to $2"],
    [/\bvs\.?\b/gi, "versus"],
    [/\bw\/(?=\s|$)/gi, "with"],
    [/\bw\/o\b/gi, "without"],
    [/\bs\/p\b/gi, "status post"],
    [/\bc\/o\b/gi, "complains of"],
    [/\bd\/c\b/gi, "discontinue"],
    [/\bNa(?:\+)?(?!\w)/g, "sodium"],
    [/\bK(?:\+)?(?!\w)/g, "potassium"],
    [/\bCa(?:\+{1,2})?(?!\w)/g, "calcium"],
    [/\bMg(?:\+{1,2})?(?!\w)/g, "magnesium"]
  ];

  const CRITICAL_CSS = `
    .narration-floating-root{position:fixed!important;inset:0!important;z-index:2147483000!important;pointer-events:none!important;font-family:Inter,Arial,sans-serif!important}
    .narration-launcher{position:fixed!important;right:max(14px,env(safe-area-inset-right))!important;bottom:max(78px,calc(env(safe-area-inset-bottom) + 78px))!important;z-index:2147483002!important;width:54px!important;height:54px!important;padding:0!important;border:0!important;border-radius:50%!important;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}
    .narration-player{position:fixed!important;right:max(14px,env(safe-area-inset-right))!important;bottom:max(144px,calc(env(safe-area-inset-bottom) + 144px))!important;z-index:2147483001!important;width:min(400px,calc(100vw - 28px))!important;max-height:min(72dvh,620px)!important;overflow:auto!important;pointer-events:auto!important}
    .narration-player[hidden]{display:none!important}
    @media(max-width:640px){.narration-launcher{right:max(10px,env(safe-area-inset-right))!important;bottom:max(76px,calc(env(safe-area-inset-bottom) + 76px))!important;width:50px!important;height:50px!important}.narration-player{left:max(10px,env(safe-area-inset-left))!important;right:max(10px,env(safe-area-inset-right))!important;bottom:max(136px,calc(env(safe-area-inset-bottom) + 136px))!important;width:auto!important;max-height:min(67dvh,calc(100dvh - 160px))!important}}
  `;

  function installCriticalStyles() {
    if (document.querySelector("style[data-narration-critical-style]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-narration-critical-style", VERSION);
    style.textContent = CRITICAL_CSS;
    document.head.appendChild(style);
  }

  function ensureStylesheet() {
    if (!currentScript?.src) return;

    try {
      const scriptURL = new URL(currentScript.src, location.href);
      const stylesheetURL = new URL("../css/article-narration.css", scriptURL);
      stylesheetURL.searchParams.set("v", VERSION);

      let link = document.querySelector('link[data-article-narration-style="auto"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "stylesheet";
        link.setAttribute("data-article-narration-style", "auto");
        document.head.appendChild(link);
      }

      if (link.href !== stylesheetURL.href) link.href = stylesheetURL.href;
    } catch {
      // Critical styles keep the player usable if the external CSS cannot load.
    }
  }

  function cleanupPreviousPlayers() {
    document
      .querySelectorAll(
        ".narration-floating-root, #article-narration-player, [data-article-narration-root]"
      )
      .forEach((node) => node.remove());
  }

  function findContentRoot() {
    for (const selector of CONFIG.contentSelectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  function isExcluded(element) {
    return Boolean(element.closest(CONFIG.excludedSelector));
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function cleanVisibleText(element) {
    const clone = element.cloneNode(true);
    clone
      .querySelectorAll(
        `${CONFIG.excludedSelector}, sup.footnote, .footnote-ref, .citation, .copy-button`
      )
      .forEach((node) => node.remove());

    return (clone.textContent || "")
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\[[0-9,\s–-]+\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitLongText(text, maxLength) {
    if (text.length <= maxLength) return [text];

    const pieces = [];
    let remainder = text;
    while (remainder.length > maxLength) {
      const sample = remainder.slice(0, maxLength + 1);
      const breakAt = Math.max(
        sample.lastIndexOf("; "),
        sample.lastIndexOf(": "),
        sample.lastIndexOf(", "),
        sample.lastIndexOf(" ")
      );
      const safeBreak = breakAt > maxLength * 0.55 ? breakAt + 1 : maxLength;
      pieces.push(remainder.slice(0, safeBreak).trim());
      remainder = remainder.slice(safeBreak).trim();
    }
    if (remainder) pieces.push(remainder);
    return pieces;
  }

  function segmentText(text) {
    if (!text) return [];
    let sentences = [];

    if ("Segmenter" in Intl) {
      try {
        const segmenter = new Intl.Segmenter(
          document.documentElement.lang || "en-US",
          { granularity: "sentence" }
        );
        sentences = Array.from(segmenter.segment(text), (entry) =>
          entry.segment.trim()
        );
      } catch {
        sentences = [];
      }
    }

    if (!sentences.length) {
      sentences = text
        .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
        .map((part) => part.trim())
        .filter(Boolean);
    }

    return sentences.flatMap((sentence) =>
      splitLongText(sentence, CONFIG.maxChunkLength)
    );
  }

  function normalizeMedicalText(input) {
    let text = input.replace(/&/g, " and ").replace(/\s+/g, " ").trim();
    for (const [pattern, replacement] of MEDICAL_REPLACEMENTS) {
      text = text.replace(pattern, replacement);
    }
    return text.replace(/\//g, " per ").replace(/\s+/g, " ").trim();
  }

  function buildChunks(root) {
    const elements = Array.from(root.querySelectorAll(CONFIG.readableSelector));
    let currentSection = "Article introduction";
    const chunks = [];

    for (const element of elements) {
      if (isExcluded(element) || !isVisible(element)) continue;

      const readableAncestor = element.parentElement?.closest(CONFIG.readableSelector);
      if (readableAncestor && root.contains(readableAncestor)) continue;

      const text = cleanVisibleText(element);
      if (text.length < 2) continue;

      if (element.matches(CONFIG.headingSelector)) currentSection = text;

      for (const sentence of segmentText(text)) {
        chunks.push({
          element,
          sectionTitle: currentSection,
          displayText: sentence,
          speechText: normalizeMedicalText(sentence)
        });
      }
    }

    return chunks;
  }

  function createPlayer() {
    const root = document.createElement("div");
    root.className = "narration-floating-root";
    root.setAttribute("data-article-narration-root", VERSION);
    root.setAttribute("data-narration-ignore", "true");

    root.innerHTML = `
      <button
        class="narration-launcher"
        type="button"
        aria-label="Open article narration player"
        aria-expanded="false"
        aria-controls="${CONFIG.playerId}"
        title="Listen to this article"
      >
        <span class="narration-launcher-ring" aria-hidden="true"></span>
        <span class="narration-launcher-core" aria-hidden="true">
          <svg class="narration-launcher-svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M4 10v4h3l4 4V6L7 10H4Z"></path>
            <path class="narration-wave wave-one" d="M14.5 9.2a4 4 0 0 1 0 5.6"></path>
            <path class="narration-wave wave-two" d="M17.3 6.5a7.8 7.8 0 0 1 0 11"></path>
          </svg>
        </span>
        <span class="narration-launcher-badge" aria-hidden="true"></span>
      </button>

      <section
        id="${CONFIG.playerId}"
        class="narration-player"
        aria-label="Article narration controls"
        hidden
      >
        <header class="narration-header">
          <div class="narration-header-copy">
            <div class="narration-eyebrow">LISTEN TO ARTICLE</div>
            <div class="narration-status" aria-live="polite">Preparing article…</div>
          </div>
          <button class="narration-close" type="button" aria-label="Close narration player" title="Close">×</button>
        </header>

        <div class="narration-now-reading">
          <span class="narration-now-label">Now reading</span>
          <strong class="narration-section-title">Article introduction</strong>
          <span class="narration-current-text">Ready to begin.</span>
        </div>

        <div class="narration-progress-row">
          <div class="narration-progress-track" role="progressbar" aria-label="Narration progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="narration-progress-fill"></div>
          </div>
          <span class="narration-progress-text">0%</span>
        </div>

        <div class="narration-main-controls">
          <button class="narration-icon-button narration-skip-back" type="button" aria-label="Previous sentence" title="Previous sentence">
            <span aria-hidden="true">↶</span>
          </button>
          <button class="narration-play" type="button" aria-label="Play article" title="Play article">
            <span class="narration-play-icon" aria-hidden="true">▶</span>
            <span class="narration-play-label">Play</span>
          </button>
          <button class="narration-icon-button narration-skip-forward" type="button" aria-label="Next sentence" title="Next sentence">
            <span aria-hidden="true">↷</span>
          </button>
        </div>

        <div class="narration-secondary-controls">
          <button class="narration-text-button narration-reset" type="button">
            <span aria-hidden="true">↺</span> Restart article
          </button>
          <button class="narration-text-button narration-stop" type="button">
            <span aria-hidden="true">■</span> Stop
          </button>
        </div>

        <div class="narration-settings">
          <div class="narration-setting-group">
            <span class="narration-setting-label">Speed</span>
            <div class="narration-rate-buttons" role="group" aria-label="Narration speed">
              ${CONFIG.rates
                .map(
                  (rate) =>
                    `<button class="narration-rate-button" type="button" data-rate="${rate}" aria-pressed="false">${rate}×</button>`
                )
                .join("")}
            </div>
          </div>

          <label class="narration-voice-field">
            <span class="narration-setting-label">Voice</span>
            <select class="narration-voice" aria-label="Narration voice">
              <option value="">Default device voice</option>
            </select>
          </label>
        </div>
      </section>
    `;

    return root;
  }

  function cacheControls() {
    const root = state.floatingRoot;
    state.launcher = root.querySelector(".narration-launcher");
    state.controls = {
      panel: root.querySelector(".narration-player"),
      launcher: state.launcher,
      close: root.querySelector(".narration-close"),
      status: root.querySelector(".narration-status"),
      sectionTitle: root.querySelector(".narration-section-title"),
      currentText: root.querySelector(".narration-current-text"),
      progressTrack: root.querySelector(".narration-progress-track"),
      progressFill: root.querySelector(".narration-progress-fill"),
      progressText: root.querySelector(".narration-progress-text"),
      previous: root.querySelector(".narration-skip-back"),
      play: root.querySelector(".narration-play"),
      playIcon: root.querySelector(".narration-play-icon"),
      playLabel: root.querySelector(".narration-play-label"),
      next: root.querySelector(".narration-skip-forward"),
      stop: root.querySelector(".narration-stop"),
      reset: root.querySelector(".narration-reset"),
      rateButtons: Array.from(root.querySelectorAll(".narration-rate-button")),
      voice: root.querySelector(".narration-voice")
    };
  }

  function togglePanelFromPointer(event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    event.preventDefault();
    event.stopPropagation();
    state.lastTouchActivation = Date.now();
    setPanelOpen(!state.panelOpen);
  }

  function togglePanelFromClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() - state.lastTouchActivation < 650) return;
    setPanelOpen(!state.panelOpen);
  }

  function bindEvents() {
    const c = state.controls;

    c.launcher.addEventListener("pointerup", togglePanelFromPointer, { passive: false });
    c.launcher.addEventListener("click", togglePanelFromClick, { passive: false });
    c.close.addEventListener("click", (event) => {
      event.preventDefault();
      setPanelOpen(false);
      c.launcher.focus({ preventScroll: true });
    });

    c.play.addEventListener("click", togglePlayPause);
    c.stop.addEventListener("click", stopNarration);
    c.reset.addEventListener("click", resetNarration);
    c.previous.addEventListener("click", () => moveBy(-1));
    c.next.addEventListener("click", () => moveBy(1));

    for (const button of c.rateButtons) {
      button.addEventListener("click", () => {
        state.rate = Number(button.dataset.rate) || CONFIG.defaultRate;
        savePreferences();
        updateRateButtons();
        restartCurrentChunkIfPlaying();
      });
    }

    c.voice.addEventListener("change", () => {
      const voice = state.voices.find(
        (candidate) => candidate.voiceURI === c.voice.value
      );
      state.voiceURI = voice?.voiceURI || "";
      state.voiceName = voice?.name || "";
      state.voiceLang = voice?.lang || "";
      state.hasVoicePreference = Boolean(voice);
      savePreferences(true);
      restartCurrentChunkIfPlaying();
    });

    document.addEventListener("pointerdown", (event) => {
      if (!state.panelOpen) return;
      if (state.controls.panel.contains(event.target) || state.launcher.contains(event.target)) return;
      setPanelOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (event.key === "Escape" && state.panelOpen) {
        setPanelOpen(false);
        c.launcher.focus({ preventScroll: true });
        return;
      }

      if (typing || !event.altKey) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlayPause();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveBy(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveBy(1);
      }
    });

    window.addEventListener("pagehide", () => {
      saveState(true);
      savePreferences(true);
      synth?.cancel();
    });
  }

  function setPanelOpen(open) {
    state.panelOpen = Boolean(open);
    const panel = state.controls.panel;
    panel.hidden = !state.panelOpen;
    panel.classList.toggle("is-open", state.panelOpen);
    state.floatingRoot.classList.toggle("narration-panel-open", state.panelOpen);
    state.launcher.setAttribute("aria-expanded", String(state.panelOpen));
    state.launcher.setAttribute(
      "aria-label",
      state.panelOpen
        ? "Close article narration player"
        : "Open article narration player"
    );

    if (state.panelOpen) {
      requestAnimationFrame(() => {
        panel.scrollTop = 0;
      });
    }
  }

  function loadPreferences() {
    const keys = [CONFIG.preferenceStorageKey, ...CONFIG.legacyPreferenceKeys];
    for (const key of keys) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (!saved || typeof saved !== "object") continue;

        const savedRate = Number(saved.rate);
        if (CONFIG.rates.includes(savedRate)) state.rate = savedRate;
        if (typeof saved.voiceURI === "string") state.voiceURI = saved.voiceURI;
        if (typeof saved.voiceName === "string") state.voiceName = saved.voiceName;
        if (typeof saved.voiceLang === "string") state.voiceLang = saved.voiceLang;
        state.hasVoicePreference = Boolean(
          state.voiceURI || state.voiceName || saved.hasVoicePreference
        );
        return true;
      } catch {
        // Try the next key.
      }
    }
    return false;
  }

  function savePreferences(immediate = false) {
    const write = () => {
      try {
        localStorage.setItem(
          CONFIG.preferenceStorageKey,
          JSON.stringify({
            rate: state.rate,
            voiceURI: state.voiceURI,
            voiceName: state.voiceName,
            voiceLang: state.voiceLang,
            hasVoicePreference: state.hasVoicePreference,
            updatedAt: Date.now()
          })
        );
      } catch {
        // Narration continues without persistence.
      }
    };

    clearTimeout(state.preferenceSaveTimer);
    if (immediate) write();
    else state.preferenceSaveTimer = window.setTimeout(write, 100);
  }

  function loadSavedState() {
    const keys = [
      storageKey,
      ...CONFIG.legacyStatePrefixes.map((prefix) => `${prefix}${location.pathname}`)
    ];

    for (const key of keys) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (!saved || typeof saved !== "object") continue;

        const index = Number(saved.currentIndex);
        if (Number.isInteger(index) && index >= 0) {
          state.currentIndex = Math.min(index, Math.max(0, state.chunks.length - 1));
        }
        if (saved.complete === true) state.mode = "complete";
        return;
      } catch {
        // Try the next key.
      }
    }
  }

  function saveState(immediate = false) {
    const write = () => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            currentIndex: state.currentIndex,
            complete: state.mode === "complete",
            updatedAt: Date.now()
          })
        );
      } catch {
        // Ignore storage failures.
      }
    };

    clearTimeout(state.saveTimer);
    if (immediate) write();
    else state.saveTimer = window.setTimeout(write, 120);
  }

  function loadVoices() {
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices.length) return;

    state.voices = voices.slice().sort((a, b) => {
      const aEnglish = /^en[-_]/i.test(a.lang) ? 0 : 1;
      const bEnglish = /^en[-_]/i.test(b.lang) ? 0 : 1;
      return aEnglish - bEnglish || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
    });

    const select = state.controls.voice;
    select.innerHTML = '<option value="">Default device voice</option>';
    for (const voice of state.voices) {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} — ${voice.lang}${voice.localService ? " (device)" : ""}`;
      select.appendChild(option);
    }

    let preferred = null;
    if (state.hasVoicePreference) {
      preferred =
        state.voices.find((voice) => voice.voiceURI === state.voiceURI) ||
        state.voices.find(
          (voice) => voice.name === state.voiceName && voice.lang === state.voiceLang
        ) ||
        state.voices.find((voice) => voice.name === state.voiceName) ||
        state.voices.find((voice) => voice.lang === state.voiceLang) ||
        null;
    }

    if (!preferred && !state.hasVoicePreference) {
      preferred =
        state.voices.find((voice) => voice.default && /^en[-_]/i.test(voice.lang)) ||
        state.voices.find((voice) => /^en-US$/i.test(voice.lang)) ||
        state.voices.find((voice) => /^en[-_]/i.test(voice.lang)) ||
        null;
    }

    if (preferred) {
      state.voiceURI = preferred.voiceURI;
      state.voiceName = preferred.name;
      state.voiceLang = preferred.lang;
      select.value = preferred.voiceURI;
      if (state.hasVoicePreference) savePreferences();
    } else {
      select.value = "";
    }

    if (state.playAfterVoiceLoad) {
      state.playAfterVoiceLoad = false;
      speakCurrentChunk();
    }
  }

  function selectedVoice() {
    return state.voices.find((voice) => voice.voiceURI === state.voiceURI) || null;
  }

  function updateRateButtons() {
    for (const button of state.controls.rateButtons) {
      const selected = Number(button.dataset.rate) === state.rate;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function togglePlayPause() {
    if (!synth || !state.chunks.length) return;

    if (state.mode === "playing") {
      synth.pause();
      state.mode = "paused";
      updateInterface("Paused");
      saveState();
      return;
    }

    if (state.mode === "paused" && synth.paused) {
      synth.resume();
      state.mode = "playing";
      updateInterface("Playing");
      return;
    }

    if (state.mode === "complete") {
      state.currentIndex = 0;
      state.mode = "idle";
    }

    if (!state.voices.length) {
      loadVoices();
      if (!state.voices.length) state.playAfterVoiceLoad = true;
    }

    speakCurrentChunk();
  }

  function speakCurrentChunk() {
    if (!synth || !state.chunks.length) return;
    const chunk = state.chunks[state.currentIndex];
    if (!chunk) return;

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(chunk.speechText);
    const voice = selectedVoice();

    utterance.rate = state.rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = voice?.lang || document.documentElement.lang || "en-US";
    if (voice) utterance.voice = voice;

    utterance.addEventListener("start", () => {
      if (state.currentUtterance !== utterance) return;
      state.mode = "playing";
      highlightCurrentChunk(true);
      updateInterface("Playing");
      saveState();
    });

    utterance.addEventListener("end", () => {
      if (state.currentUtterance !== utterance || state.mode !== "playing") return;
      if (state.currentIndex < state.chunks.length - 1) {
        state.currentIndex += 1;
        saveState();
        window.setTimeout(speakCurrentChunk, 45);
      } else {
        state.mode = "complete";
        state.currentUtterance = null;
        clearHighlight();
        updateInterface("Article complete");
        saveState(true);
      }
    });

    utterance.addEventListener("error", (event) => {
      if (state.currentUtterance !== utterance) return;
      if (["interrupted", "canceled"].includes(event.error)) return;
      state.mode = "idle";
      state.currentUtterance = null;
      updateInterface("Narration could not continue");
    });

    state.currentUtterance = utterance;
    state.mode = "playing";
    highlightCurrentChunk(true);
    updateInterface("Starting…");
    synth.speak(utterance);
  }

  function restartCurrentChunkIfPlaying() {
    if (state.mode !== "playing") {
      updateInterface(state.mode === "paused" ? "Paused" : "Ready");
      return;
    }
    synth?.cancel();
    state.currentUtterance = null;
    window.setTimeout(speakCurrentChunk, 35);
  }

  function stopNarration() {
    synth?.cancel();
    state.currentUtterance = null;
    state.mode = "idle";
    clearHighlight();
    updateInterface("Stopped — position saved");
    saveState(true);
  }

  function resetNarration() {
    synth?.cancel();
    state.currentUtterance = null;
    state.currentIndex = 0;
    state.mode = "idle";
    clearHighlight();

    try {
      localStorage.removeItem(storageKey);
      for (const prefix of CONFIG.legacyStatePrefixes) {
        localStorage.removeItem(`${prefix}${location.pathname}`);
      }
    } catch {
      // Reset remains functional when storage is blocked.
    }

    highlightCurrentChunk(true);
    updateInterface("Restarted from the beginning");
    saveState(true);
  }

  function moveBy(amount) {
    if (!state.chunks.length) return;
    const continuePlaying = state.mode === "playing";
    synth?.cancel();
    state.currentUtterance = null;
    state.currentIndex = Math.max(
      0,
      Math.min(state.chunks.length - 1, state.currentIndex + amount)
    );
    state.mode = continuePlaying ? "playing" : "idle";
    highlightCurrentChunk(true);
    updateInterface(continuePlaying ? "Playing" : "Position changed");
    saveState();
    if (continuePlaying) window.setTimeout(speakCurrentChunk, 35);
  }

  function clearHighlight() {
    document
      .querySelectorAll(`.${CONFIG.activeClass}`)
      .forEach((element) => element.classList.remove(CONFIG.activeClass));
  }

  function highlightCurrentChunk(shouldScroll) {
    clearHighlight();
    const chunk = state.chunks[state.currentIndex];
    if (!chunk?.element?.isConnected) return;
    chunk.element.classList.add(CONFIG.activeClass);

    if (!shouldScroll) return;
    const rect = chunk.element.getBoundingClientRect();
    const topBuffer = 100;
    const panelHeight = state.panelOpen
      ? Math.ceil(state.controls.panel.getBoundingClientRect().height || 0)
      : 0;
    const bottomBuffer = panelHeight ? Math.min(panelHeight + 36, innerHeight * 0.55) : 90;
    if (rect.top < topBuffer || rect.bottom > innerHeight - bottomBuffer) {
      chunk.element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }

  function updateInterface(statusMessage) {
    const c = state.controls;
    const total = state.chunks.length;
    const current = total ? state.currentIndex + 1 : 0;
    const percent = total
      ? state.mode === "complete"
        ? 100
        : Math.max(1, Math.round((current / total) * 100))
      : 0;
    const chunk = state.chunks[state.currentIndex];

    c.status.textContent = statusMessage;
    c.sectionTitle.textContent = chunk?.sectionTitle || "Article";
    c.currentText.textContent = chunk?.displayText || "No readable article content was found.";
    c.progressFill.style.width = `${percent}%`;
    c.progressText.textContent = `${percent}%`;
    c.progressTrack.setAttribute("aria-valuenow", String(percent));
    c.launcher.style.setProperty("--narration-progress", `${percent * 3.6}deg`);

    const playing = state.mode === "playing";
    c.launcher.classList.toggle("is-playing", playing);
    c.launcher.classList.toggle("is-paused", state.mode === "paused");
    c.playIcon.textContent = playing ? "❚❚" : "▶";
    c.playLabel.textContent = playing ? "Pause" : state.mode === "paused" ? "Resume" : "Play";
    c.play.setAttribute(
      "aria-label",
      playing ? "Pause article" : state.mode === "paused" ? "Resume article" : "Play article"
    );

    c.previous.disabled = state.currentIndex <= 0;
    c.next.disabled = !total || state.currentIndex >= total - 1;
    c.stop.disabled = state.mode === "idle" && !synth?.speaking;
    c.reset.disabled = !total || (state.currentIndex === 0 && state.mode === "idle");
    updateRateButtons();
  }

  function showUnavailable(message) {
    state.controls.status.textContent = message;
    state.controls.sectionTitle.textContent = "Narration unavailable";
    state.controls.currentText.textContent = message;
    state.floatingRoot.classList.add("narration-unavailable");
    state.controls.panel
      .querySelectorAll("button:not(.narration-close), select")
      .forEach((control) => (control.disabled = true));
    // The launcher and close button intentionally remain active so the message can be seen.
  }

  function destroy() {
    state.destroyed = true;
    synth?.cancel();
    clearHighlight();
    state.floatingRoot?.remove();
  }

  function initialize() {
    if (window[GLOBAL_KEY]?.destroy) window[GLOBAL_KEY].destroy();
    cleanupPreviousPlayers();
    installCriticalStyles();
    ensureStylesheet();

    state.root = findContentRoot();
    if (!state.root) return;

    state.floatingRoot = createPlayer();
    document.body.appendChild(state.floatingRoot);
    cacheControls();
    bindEvents();
    setPanelOpen(false);

    state.chunks = buildChunks(state.root);
    loadPreferences();
    loadSavedState();
    updateRateButtons();

    window[GLOBAL_KEY] = { version: VERSION, destroy };

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      showUnavailable("This browser does not provide text-to-speech narration.");
      return;
    }

    synth.cancel();
    loadVoices();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", loadVoices);
    }
    window.setTimeout(loadVoices, 250);
    window.setTimeout(loadVoices, 1000);

    if (!state.chunks.length) {
      showUnavailable("No readable article content was found.");
      return;
    }

    highlightCurrentChunk(false);
    updateInterface(state.mode === "complete" ? "Previously completed" : "Ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
