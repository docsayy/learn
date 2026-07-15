/*
 * Learn Medicine — Article Narration
 * Free browser-based text-to-speech using the Web Speech API.
 *
 * Add before </body>:
 * <script src="../assets/js/article-narration.js"></script>
 *
 * Optional:
 * - Add data-narration-content to the exact article-body container.
 * - Add data-narration-ignore to anything that should never be narrated.
 * - Add data-narration-controls where the player should be mounted.
 */

(() => {
  "use strict";

  const synth = window.speechSynthesis;
  const narrationScript = document.currentScript;

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
    excludedSelector: [
      "[data-narration-ignore]",
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
    maxChunkLength: 320,
    storagePrefix: "learnMedicineNarration:v1:",
    activeClass: "narration-active",
    playerId: "article-narration-player"
  };

  const state = {
    root: null,
    player: null,
    chunks: [],
    currentIndex: 0,
    currentUtterance: null,
    voices: [],
    voiceURI: "",
    rate: CONFIG.defaultRate,
    mode: "idle", // idle | playing | paused | complete
    playAfterVoiceLoad: false,
    saveTimer: null,
    controls: {}
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

  function ensureStylesheet() {
    if (document.querySelector('link[data-article-narration-style], link[href*="article-narration.css"]')) {
      return;
    }

    if (!narrationScript?.src) return;

    try {
      const stylesheetURL = new URL("../css/article-narration.css", narrationScript.src);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = stylesheetURL.href;
      link.setAttribute("data-article-narration-style", "true");
      document.head.appendChild(link);
    } catch {
      // If the stylesheet cannot be inferred, the controls remain functional and unstyled.
    }
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

    return clone.textContent
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
      const preferredBreak = Math.max(
        sample.lastIndexOf("; "),
        sample.lastIndexOf(": "),
        sample.lastIndexOf(", "),
        sample.lastIndexOf(" ")
      );
      const breakAt = preferredBreak > maxLength * 0.55 ? preferredBreak + 1 : maxLength;
      pieces.push(remainder.slice(0, breakAt).trim());
      remainder = remainder.slice(breakAt).trim();
    }

    if (remainder) pieces.push(remainder);
    return pieces;
  }

  function segmentText(text) {
    if (!text) return [];

    let sentences = [];

    if ("Segmenter" in Intl) {
      try {
        const segmenter = new Intl.Segmenter(document.documentElement.lang || "en", {
          granularity: "sentence"
        });
        sentences = Array.from(segmenter.segment(text), (entry) => entry.segment.trim());
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

  function buildChunks(root) {
    const candidateElements = Array.from(root.querySelectorAll(CONFIG.readableSelector));

    return candidateElements
      .filter((element) => {
        if (isExcluded(element) || !isVisible(element)) return false;

        // Avoid duplicate narration from nested readable blocks such as <li><p>...</p></li>.
        const readableAncestor = element.parentElement?.closest(CONFIG.readableSelector);
        if (readableAncestor && root.contains(readableAncestor)) return false;

        return true;
      })
      .flatMap((element) => {
        const text = cleanVisibleText(element);
        if (text.length < 2) return [];

        return segmentText(text).map((sentence) => ({
          element,
          displayText: sentence,
          speechText: normalizeMedicalText(sentence)
        }));
      });
  }

  function normalizeMedicalText(input) {
    let text = input.replace(/&/g, " and ").replace(/\s+/g, " ").trim();

    // Expand specific medical units and abbreviations before converting remaining slashes.
    for (const [pattern, replacement] of MEDICAL_REPLACEMENTS) {
      text = text.replace(pattern, replacement);
    }

    return text.replace(/\//g, " per ").replace(/\s+/g, " ").trim();
  }

  function createPlayer() {
    const player = document.createElement("section");
    player.id = CONFIG.playerId;
    player.className = "narration-player";
    player.setAttribute("aria-label", "Article narration controls");
    player.setAttribute("data-narration-ignore", "true");

    player.innerHTML = `
      <div class="narration-heading-row">
        <div>
          <div class="narration-title">
            <span class="narration-speaker" aria-hidden="true">🔊</span>
            Listen to Article
          </div>
          <div class="narration-status" id="narration-status" aria-live="polite">Preparing article…</div>
        </div>
        <button class="narration-collapse" type="button" aria-expanded="true" aria-controls="narration-body" title="Collapse narration controls">−</button>
      </div>

      <div class="narration-body" id="narration-body">
        <div class="narration-progress-wrap">
          <div class="narration-progress-track" role="progressbar" aria-label="Narration progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="narration-progress-fill"></div>
          </div>
          <span class="narration-progress-text">0%</span>
        </div>

        <div class="narration-controls">
          <button class="narration-button narration-skip-back" type="button" title="Previous sentence" aria-label="Previous sentence">
            <span aria-hidden="true">↶</span><span class="narration-button-label">Previous</span>
          </button>

          <button class="narration-button narration-play primary" type="button" title="Play article" aria-label="Play article">
            <span class="narration-play-icon" aria-hidden="true">▶</span><span class="narration-play-label">Play</span>
          </button>

          <button class="narration-button narration-skip-forward" type="button" title="Next sentence" aria-label="Next sentence">
            <span aria-hidden="true">↷</span><span class="narration-button-label">Next</span>
          </button>

          <button class="narration-button narration-stop" type="button" title="Stop narration" aria-label="Stop narration">
            <span aria-hidden="true">■</span><span class="narration-button-label">Stop</span>
          </button>
        </div>

        <div class="narration-options">
          <label class="narration-field">
            <span>Speed</span>
            <select class="narration-rate" aria-label="Narration speed">
              ${CONFIG.rates
                .map((rate) => `<option value="${rate}">${rate}×</option>`)
                .join("")}
            </select>
          </label>

          <label class="narration-field narration-voice-field">
            <span>Voice</span>
            <select class="narration-voice" aria-label="Narration voice">
              <option value="">Default device voice</option>
            </select>
          </label>
        </div>

        <div class="narration-current" aria-live="polite">
          <span class="narration-current-label">Current:</span>
          <span class="narration-current-text">Ready to begin.</span>
        </div>
      </div>
    `;

    return player;
  }

  function mountPlayer(player, root) {
    const explicitMount = document.querySelector("[data-narration-controls]");
    if (explicitMount) {
      explicitMount.appendChild(player);
      return;
    }

    const articleHeader = root.querySelector(
      ".article-header, header.article-header, .article-title-block"
    );

    if (articleHeader) {
      articleHeader.insertAdjacentElement("afterend", player);
    } else {
      root.prepend(player);
    }
  }

  function cacheControls() {
    const player = state.player;
    state.controls = {
      status: player.querySelector(".narration-status"),
      body: player.querySelector(".narration-body"),
      collapse: player.querySelector(".narration-collapse"),
      progressTrack: player.querySelector(".narration-progress-track"),
      progressFill: player.querySelector(".narration-progress-fill"),
      progressText: player.querySelector(".narration-progress-text"),
      previous: player.querySelector(".narration-skip-back"),
      play: player.querySelector(".narration-play"),
      playIcon: player.querySelector(".narration-play-icon"),
      playLabel: player.querySelector(".narration-play-label"),
      next: player.querySelector(".narration-skip-forward"),
      stop: player.querySelector(".narration-stop"),
      rate: player.querySelector(".narration-rate"),
      voice: player.querySelector(".narration-voice"),
      currentText: player.querySelector(".narration-current-text")
    };
  }

  function bindEvents() {
    const controls = state.controls;

    controls.play.addEventListener("click", togglePlayPause);
    controls.stop.addEventListener("click", stopNarration);
    controls.previous.addEventListener("click", () => moveBy(-1));
    controls.next.addEventListener("click", () => moveBy(1));

    controls.rate.addEventListener("change", () => {
      state.rate = Number(controls.rate.value) || CONFIG.defaultRate;
      saveState();
      restartCurrentChunkIfPlaying();
    });

    controls.voice.addEventListener("change", () => {
      state.voiceURI = controls.voice.value;
      saveState();
      restartCurrentChunkIfPlaying();
    });

    controls.collapse.addEventListener("click", () => {
      const expanded = controls.collapse.getAttribute("aria-expanded") === "true";
      controls.collapse.setAttribute("aria-expanded", String(!expanded));
      controls.collapse.textContent = expanded ? "+" : "−";
      controls.collapse.title = expanded
        ? "Expand narration controls"
        : "Collapse narration controls";
      controls.body.hidden = expanded;
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isTyping || !event.altKey) return;

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
      synth?.cancel();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) saveState(true);
    });
  }

  function loadSavedState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!saved || typeof saved !== "object") return;

      const savedIndex = Number(saved.currentIndex);
      if (Number.isInteger(savedIndex) && savedIndex >= 0) {
        state.currentIndex = Math.min(savedIndex, Math.max(0, state.chunks.length - 1));
      }

      const savedRate = Number(saved.rate);
      if (CONFIG.rates.includes(savedRate)) state.rate = savedRate;

      if (typeof saved.voiceURI === "string") state.voiceURI = saved.voiceURI;
      if (saved.complete === true) state.mode = "complete";
    } catch {
      // Storage may be disabled; narration still works without persistence.
    }
  }

  function saveState(immediate = false) {
    const performSave = () => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            currentIndex: state.currentIndex,
            rate: state.rate,
            voiceURI: state.voiceURI,
            complete: state.mode === "complete",
            updatedAt: Date.now()
          })
        );
      } catch {
        // Ignore storage failures.
      }
    };

    clearTimeout(state.saveTimer);
    if (immediate) performSave();
    else state.saveTimer = window.setTimeout(performSave, 150);
  }

  function loadVoices() {
    if (!synth) return;

    const allVoices = synth.getVoices();
    if (!allVoices.length) return;

    state.voices = allVoices.slice().sort((a, b) => {
      const aEnglish = /^en[-_]/i.test(a.lang) ? 0 : 1;
      const bEnglish = /^en[-_]/i.test(b.lang) ? 0 : 1;
      return aEnglish - bEnglish || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
    });

    const voiceSelect = state.controls.voice;
    const previousValue = state.voiceURI;

    voiceSelect.innerHTML = '<option value="">Default device voice</option>';

    for (const voice of state.voices) {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} — ${voice.lang}${voice.localService ? " (device)" : ""}`;
      voiceSelect.appendChild(option);
    }

    const selectedExists = state.voices.some((voice) => voice.voiceURI === previousValue);
    if (selectedExists) {
      voiceSelect.value = previousValue;
    } else {
      const preferred =
        state.voices.find((voice) => voice.default && /^en[-_]/i.test(voice.lang)) ||
        state.voices.find((voice) => /^en-US$/i.test(voice.lang)) ||
        state.voices.find((voice) => /^en[-_]/i.test(voice.lang));

      if (preferred) {
        state.voiceURI = preferred.voiceURI;
        voiceSelect.value = preferred.voiceURI;
      }
    }

    if (state.playAfterVoiceLoad) {
      state.playAfterVoiceLoad = false;
      speakCurrentChunk();
    }
  }

  function selectedVoice() {
    return state.voices.find((voice) => voice.voiceURI === state.voiceURI) || null;
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
        window.setTimeout(speakCurrentChunk, 40);
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
    const wasPlaying = state.mode === "playing";
    if (!wasPlaying) {
      updateInterface(state.mode === "paused" ? "Paused" : "Ready");
      return;
    }

    synth.cancel();
    state.currentUtterance = null;
    window.setTimeout(speakCurrentChunk, 30);
  }

  function stopNarration() {
    if (!synth) return;
    synth.cancel();
    state.currentUtterance = null;
    state.mode = "idle";
    clearHighlight();
    updateInterface("Stopped — position saved");
    saveState(true);
  }

  function moveBy(amount) {
    if (!state.chunks.length) return;

    const shouldContinue = state.mode === "playing";
    synth?.cancel();
    state.currentUtterance = null;
    state.mode = shouldContinue ? "playing" : "idle";
    state.currentIndex = Math.max(
      0,
      Math.min(state.chunks.length - 1, state.currentIndex + amount)
    );

    highlightCurrentChunk(true);
    updateInterface(shouldContinue ? "Playing" : "Position changed");
    saveState();

    if (shouldContinue) window.setTimeout(speakCurrentChunk, 30);
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

    if (shouldScroll) {
      const rect = chunk.element.getBoundingClientRect();
      const topBuffer = 110;
      const bottomBuffer = 90;
      const isOutsideView =
        rect.top < topBuffer || rect.bottom > window.innerHeight - bottomBuffer;

      if (isOutsideView) {
        chunk.element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest"
        });
      }
    }
  }

  function updateInterface(statusMessage) {
    const controls = state.controls;
    const total = state.chunks.length;
    const current = total ? state.currentIndex + 1 : 0;
    const percent = total
      ? state.mode === "complete"
        ? 100
        : Math.round((state.currentIndex / total) * 100)
      : 0;

    controls.status.textContent = statusMessage;
    controls.progressFill.style.width = `${percent}%`;
    controls.progressText.textContent = `${percent}%`;
    controls.progressTrack.setAttribute("aria-valuenow", String(percent));

    const isPlaying = state.mode === "playing";
    controls.playIcon.textContent = isPlaying ? "❚❚" : "▶";
    controls.playLabel.textContent = isPlaying ? "Pause" : state.mode === "paused" ? "Resume" : "Play";
    controls.play.setAttribute(
      "aria-label",
      isPlaying ? "Pause article" : state.mode === "paused" ? "Resume article" : "Play article"
    );
    controls.play.title = controls.play.getAttribute("aria-label");

    controls.previous.disabled = state.currentIndex <= 0;
    controls.next.disabled = !total || state.currentIndex >= total - 1;
    controls.stop.disabled = state.mode === "idle" && !synth?.speaking;

    controls.currentText.textContent = total
      ? `${current} of ${total} — ${state.chunks[state.currentIndex].displayText}`
      : "No readable article content was found.";
  }

  function disablePlayer(message) {
    state.controls.status.textContent = message;
    state.controls.currentText.textContent = message;
    state.player.classList.add("narration-unavailable");
    state.player
      .querySelectorAll("button, select")
      .forEach((control) => (control.disabled = true));
  }

  function initialize() {
    ensureStylesheet();
    state.root = findContentRoot();
    if (!state.root) return;

    state.player = createPlayer();
    mountPlayer(state.player, state.root);
    cacheControls();

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      disablePlayer("Narration is not supported by this browser.");
      return;
    }

    // Remove any speech left in the browser queue by a prior page.
    synth.cancel();

    // Build chunks after the player is mounted; the player is explicitly excluded.
    state.chunks = buildChunks(state.root);
    loadSavedState();

    state.controls.rate.value = String(state.rate);
    bindEvents();
    loadVoices();

    if (typeof synth.onvoiceschanged !== "undefined") {
      synth.addEventListener("voiceschanged", loadVoices);
    }

    // Some mobile browsers populate voices asynchronously without firing immediately.
    window.setTimeout(loadVoices, 250);
    window.setTimeout(loadVoices, 1000);

    if (!state.chunks.length) {
      disablePlayer("No readable article content was found.");
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
