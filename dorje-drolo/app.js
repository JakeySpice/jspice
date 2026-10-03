"use strict";

const content = window.DORJE_DROLO_CONTENT;
const tracks = content.tracks;
const trackById = new Map(tracks.map((track) => [track.id, track]));
const groupById = new Map(content.groups.map((group) => [group.id, group]));

const elements = {
  audio: document.querySelector("#audio"),
  theme: document.querySelector("#theme-toggle"),
  tabs: document.querySelectorAll("[data-view]"),
  sequenceView: document.querySelector("#sequence-view"),
  libraryView: document.querySelector("#library-view"),
  practiceSequence: document.querySelector("#practice-sequence"),
  stepPanel: document.querySelector("#step-panel"),
  progress: document.querySelector(".practice-progress"),
  progressBar: document.querySelector("#progress-bar"),
  progressCount: document.querySelector("#progress-count"),
  resetProgress: document.querySelector("#reset-progress"),
  groups: document.querySelector("#track-groups"),
  nav: document.querySelector("#section-nav"),
  search: document.querySelector("#track-search"),
  reader: document.querySelector("#reader"),
  readerTitle: document.querySelector("#reader-title"),
  readerSubtitle: document.querySelector("#reader-subtitle"),
  readerSource: document.querySelector("#reader-source"),
  readerReview: document.querySelector("#reader-review"),
  readerTrackNav: document.querySelector("#reader-track-nav"),
  phraseList: document.querySelector("#phrase-list"),
  textLayers: document.querySelector("#text-layers"),
  followText: document.querySelector("#follow-text"),
  pauseAfterPhrase: document.querySelector("#pause-after-phrase"),
  previousPhrase: document.querySelector("#previous-phrase"),
  nextPhrase: document.querySelector("#next-phrase"),
  repeatPhrase: document.querySelector("#repeat-phrase"),
  nowSection: document.querySelector("#now-section"),
  nowTitle: document.querySelector("#now-title"),
  play: document.querySelector("#play-toggle"),
  previous: document.querySelector("#previous-track"),
  next: document.querySelector("#next-track"),
  rewind: document.querySelector("#rewind"),
  forward: document.querySelector("#forward"),
  seek: document.querySelector("#seek"),
  elapsed: document.querySelector("#elapsed"),
  duration: document.querySelector("#duration"),
  speed: document.querySelector("#speed"),
  playerMessage: document.querySelector("#player-message"),
  count: document.querySelector("#practice-count"),
  resetCount: document.querySelector("#reset-count"),
};

let currentTrackIndex = -1;
let currentPracticeIndex = 0;
let activeTranscript = null;
let activePhraseIndex = -1;
let repeatPhraseIndex = -1;
let repeatPhraseEnabled = false;
let seeking = false;
let completedSteps = new Set(readJsonSetting("dd-completed-steps", []));

function readSetting(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readJsonSetting(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeSetting(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // The companion still works when browser storage is unavailable.
  }
}

function writeJsonSetting(key, value) {
  writeSetting(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(seconds, tenths = false) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const formatted = tenths ? remainder.toFixed(1).padStart(4, "0") : Math.floor(remainder).toString().padStart(2, "0");
  return `${minutes}:${formatted}`;
}

function showView(view) {
  const validView = ["sequence", "library", "reader"].includes(view) ? view : "sequence";
  if (validView === "reader" && !activeTranscript) loadTrackById("reflection-one", false);
  elements.sequenceView.hidden = validView !== "sequence";
  elements.libraryView.hidden = validView !== "library";
  elements.reader.hidden = validView !== "reader";
  elements.tabs.forEach((tab) => {
    const active = tab.dataset.view === validView;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  writeSetting("dd-view", validView);
  if (validView === "reader") {
    requestAnimationFrame(() => elements.reader.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  elements.theme.innerHTML = `<span aria-hidden="true">${isDark ? "☀" : "☾"}</span>`;
  elements.theme.setAttribute("aria-label", `Use ${isDark ? "light" : "dark"} theme`);
  writeSetting("dd-theme", isDark ? "dark" : "light");
}

function setCount(value) {
  const nextValue = Math.max(0, Number.parseInt(value, 10) || 0);
  elements.count.value = nextValue;
  elements.count.textContent = nextValue.toLocaleString();
  writeSetting("dd-prostrations", nextValue);
}

function renderLibraryNavigation() {
  elements.nav.innerHTML = content.groups
    .map((group) => `<a href="#group-${escapeHtml(group.id)}">${escapeHtml(group.title)}</a>`)
    .join("");
}

function renderTracks(query = "") {
  const normalisedQuery = query.trim().toLocaleLowerCase();
  const renderedGroups = content.groups
    .map((group) => {
      const visibleTracks = tracks.filter((track) => {
        if (track.group !== group.id) return false;
        return `${track.title} ${track.subtitle ?? ""} ${group.title}`.toLocaleLowerCase().includes(normalisedQuery);
      });
      if (visibleTracks.length === 0) return "";
      const buttons = visibleTracks
        .map((track) => {
          const active = tracks[currentTrackIndex]?.id === track.id;
          return `
            <button class="track-button${active ? " is-active" : ""}" type="button" data-track-id="${escapeHtml(track.id)}" aria-current="${active}">
              <span class="track-play" aria-hidden="true">${active && !elements.audio.paused ? "Ⅱ" : "▶"}</span>
              <span class="track-title">${escapeHtml(track.title)}${track.subtitle ? `<span>${escapeHtml(track.subtitle)}</span>` : ""}</span>
              <span class="track-meta">${escapeHtml(track.duration)}${track.transcript ? " · text" : ""}</span>
            </button>`;
        })
        .join("");
      return `
        <section class="track-group" id="group-${escapeHtml(group.id)}">
          <header><h3>${escapeHtml(group.title)}</h3><span>${visibleTracks.length}</span></header>
          <div class="track-grid">${buttons}</div>
        </section>`;
    })
    .filter(Boolean)
    .join("");
  elements.groups.innerHTML = renderedGroups || '<p class="empty-state">No recordings match that search.</p>';
}

function renderPracticeSequence() {
  elements.practiceSequence.innerHTML = content.practiceSteps
    .map((step, index) => {
      const selected = index === currentPracticeIndex;
      const complete = completedSteps.has(step.id);
      const stepTrack = step.trackId ? trackById.get(step.trackId) : null;
      const status = step.kind === "manual" ? "Manual" : step.kind === "choice" ? "Choose" : stepTrack?.transcript ? "Text" : stepTrack?.duration ?? "Audio";
      return `
        <li class="sequence-item${selected ? " is-selected" : ""}${complete ? " is-complete" : ""}">
          <button type="button" data-step-index="${index}" aria-current="${selected ? "step" : "false"}">
            <span class="sequence-number">${complete ? "✓" : String(index + 1).padStart(2, "0")}</span>
            <span class="sequence-copy">
              <small>${escapeHtml(step.part)}</small>
              <strong>${escapeHtml(step.title)}</strong>
              ${step.subtitle ? `<span>${escapeHtml(step.subtitle)}</span>` : ""}
            </span>
            <span class="sequence-status">${status}</span>
          </button>
        </li>`;
    })
    .join("");
  updateProgress();
}

function updateProgress() {
  const total = content.practiceSteps.length;
  const complete = content.practiceSteps.filter((step) => completedSteps.has(step.id)).length;
  elements.progressCount.textContent = `${complete} of ${total}`;
  elements.progressBar.style.width = `${(complete / total) * 100}%`;
  elements.progress.setAttribute("aria-valuemax", String(total));
  elements.progress.setAttribute("aria-valuenow", String(complete));
}

function renderStepDetail(step, index) {
  const track = step.trackId ? trackById.get(step.trackId) : null;
  const complete = completedSteps.has(step.id);
  const optionButtons = (step.trackIds ?? [])
    .map((trackId) => {
      const option = trackById.get(trackId);
      return `<button class="recording-choice" type="button" data-step-track="${escapeHtml(trackId)}"><span aria-hidden="true">▶</span><span><strong>${escapeHtml(option.title)}</strong><small>${escapeHtml(option.subtitle ?? option.duration)}</small></span></button>`;
    })
    .join("");
  const trackAction = track
    ? `<button class="primary-action" type="button" data-step-track="${escapeHtml(track.id)}">${track.transcript ? "Learn this chant" : "Play recording"}</button>`
    : "";
  const mappingNote = step.review ? '<p class="mapping-note">Recording placement is provisional until its source boundary is checked.</p>' : "";
  const manualLabel = step.kind === "manual" ? '<span class="detail-kind">Manual checkpoint</span>' : "";
  const choiceLabel = step.kind === "choice" ? '<span class="detail-kind">Choose a recording</span>' : "";
  const isLast = index === content.practiceSteps.length - 1;
  const completionLabel = complete && isLast
    ? "Practice complete"
    : complete
      ? "Completed · go to next"
      : step.kind === "manual"
        ? "Continue"
        : "Complete step";

  elements.stepPanel.innerHTML = `
    <div class="step-detail">
      <div class="detail-topline"><span>Step ${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(step.part)}</span></div>
      <h2>${escapeHtml(step.title)}</h2>
      ${step.subtitle ? `<p class="detail-subtitle">${escapeHtml(step.subtitle)}</p>` : ""}
      ${manualLabel}${choiceLabel}
      ${step.note ? `<p>${escapeHtml(step.note)}</p>` : ""}
      ${mappingNote}
      ${trackAction}
      ${optionButtons ? `<div class="recording-choices">${optionButtons}</div>` : ""}
      ${step.counter ? '<p class="detail-hint">The manual prostration counter is below. It stays independent of audio repeats.</p>' : ""}
      <button class="complete-action${complete ? " is-complete" : ""}" id="complete-step" type="button">
        ${completionLabel}
        <span aria-hidden="true">${complete && isLast ? "✓" : "→"}</span>
      </button>
    </div>`;
}

function selectPracticeStep(index, options = {}) {
  const nextIndex = Math.max(0, Math.min(content.practiceSteps.length - 1, index));
  currentPracticeIndex = nextIndex;
  writeSetting("dd-current-step", nextIndex);
  const step = content.practiceSteps[nextIndex];
  renderPracticeSequence();
  renderStepDetail(step, nextIndex);
  if (options.play && step.kind === "track") loadTrackById(step.trackId, true);
  if (options.play && step.kind === "manual") elements.audio.pause();
  if (options.scroll) {
    if (step.kind === "track" && trackById.get(step.trackId)?.transcript) showView("reader");
    else elements.stepPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function completeCurrentStep() {
  const step = content.practiceSteps[currentPracticeIndex];
  completedSteps.add(step.id);
  writeJsonSetting("dd-completed-steps", [...completedSteps]);
  const isLast = currentPracticeIndex === content.practiceSteps.length - 1;
  if (isLast) {
    elements.audio.pause();
    renderPracticeSequence();
    renderStepDetail(step, currentPracticeIndex);
    return;
  }
  selectPracticeStep(currentPracticeIndex + 1, { play: true, scroll: true });
}

function showPlayerMessage(message) {
  elements.playerMessage.textContent = message;
  elements.playerMessage.hidden = !message;
}

function loadTrackById(trackId, autoplay = false) {
  const index = tracks.findIndex((track) => track.id === trackId);
  if (index < 0) return;
  const track = tracks[index];
  currentTrackIndex = index;
  activePhraseIndex = -1;
  repeatPhraseIndex = -1;
  setRepeatPhrase(false);
  elements.audio.src = window.DORJE_ASSET_URLS?.[track.file] ?? `${content.audioRoot}${track.file}`;
  elements.audio.playbackRate = Number(elements.speed.value);
  elements.nowSection.textContent = groupById.get(track.group)?.title ?? "Recording";
  elements.nowTitle.textContent = track.title;
  elements.play.disabled = false;
  elements.seek.disabled = false;
  elements.seek.value = "0";
  elements.elapsed.textContent = "0:00";
  elements.duration.textContent = track.duration;
  showPlayerMessage("");
  writeSetting("dd-last-track", track.id);
  renderTracks(elements.search.value);
  renderTranscript(track);
  if (autoplay) elements.audio.play().catch(() => showPlayerMessage("Tap play to begin this recording."));
}

function moveTrack(offset) {
  const start = currentTrackIndex < 0 ? 0 : currentTrackIndex;
  const nextIndex = (start + offset + tracks.length) % tracks.length;
  loadTrackById(tracks[nextIndex].id, true);
}

function renderTranscript(track) {
  activeTranscript = track.transcript ? content.transcripts[track.transcript] : null;
  if (!activeTranscript) {
    elements.phraseList.innerHTML = "";
    return;
  }
  elements.readerTitle.textContent = activeTranscript.title;
  elements.readerSubtitle.textContent = activeTranscript.subtitle;
  elements.readerSource.textContent = activeTranscript.sourcePage;
  elements.readerReview.textContent = activeTranscript.status;
  elements.readerTrackNav.innerHTML = tracks
    .filter((candidate) => candidate.transcript)
    .map((candidate) => `<button type="button" data-reader-track="${escapeHtml(candidate.id)}" aria-current="${candidate.id === track.id ? "true" : "false"}">${escapeHtml(candidate.readerLabel ?? candidate.title.replace(" Reflection", ""))}</button>`)
    .join("");
  requestAnimationFrame(() => {
    const activeReaderButton = elements.readerTrackNav.querySelector('[aria-current="true"]');
    if (activeReaderButton) {
      elements.readerTrackNav.scrollTo({
        left: activeReaderButton.offsetLeft - (elements.readerTrackNav.clientWidth - activeReaderButton.offsetWidth) / 2,
        behavior: "smooth",
      });
    }
  });
  elements.phraseList.innerHTML = activeTranscript.phrases
    .map((phrase, index) => `
      <button class="phrase" type="button" data-phrase-index="${index}" aria-current="false">
        <span class="phrase-time">${formatTime(phrase.start, true)}</span>
        <span class="phrase-text">
          ${phrase.marker ? `<span class="phrase-marker">${escapeHtml(phrase.marker)}</span>` : ""}
          <span class="phrase-tibetan" lang="bo">${escapeHtml(phrase.tibetan)}</span>
          <span class="phrase-phonetics">${escapeHtml(phrase.phonetics)}</span>
          <span class="phrase-english">${phrase.english.map(escapeHtml).join("<br>")}</span>
        </span>
        <span class="phrase-play" aria-hidden="true">▶</span>
      </button>`)
    .join("");
  applyTextLayers();
  updateActivePhrase(true);
}

function getPhraseIndex(time) {
  if (!activeTranscript || time < activeTranscript.phrases[0].start) return -1;
  let result = 0;
  activeTranscript.phrases.forEach((phrase, index) => {
    if (time >= phrase.start) result = index;
  });
  return result;
}

function updateActivePhrase(force = false) {
  if (!activeTranscript) return;
  const nextIndex = getPhraseIndex(elements.audio.currentTime);
  if (!force && nextIndex === activePhraseIndex) return;
  activePhraseIndex = nextIndex;
  elements.phraseList.querySelectorAll("[data-phrase-index]").forEach((button, index) => {
    const active = index === activePhraseIndex;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", String(active));
    button.querySelector(".phrase-play").textContent = active && !elements.audio.paused ? "Ⅱ" : "▶";
  });
  if (activePhraseIndex >= 0 && elements.followText.checked && !force) {
    elements.phraseList.querySelector(`[data-phrase-index="${activePhraseIndex}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function playPhrase(index) {
  if (!activeTranscript) return;
  const boundedIndex = Math.max(0, Math.min(activeTranscript.phrases.length - 1, index));
  repeatPhraseIndex = boundedIndex;
  elements.audio.currentTime = activeTranscript.phrases[boundedIndex].start;
  activePhraseIndex = boundedIndex;
  updateActivePhrase(true);
  elements.audio.play().catch(() => showPlayerMessage("Tap play to begin this phrase."));
}

function setRepeatPhrase(enabled) {
  repeatPhraseEnabled = enabled;
  if (enabled && activeTranscript) repeatPhraseIndex = activePhraseIndex >= 0 ? activePhraseIndex : 0;
  elements.repeatPhrase.setAttribute("aria-pressed", String(enabled));
  elements.repeatPhrase.textContent = enabled ? "Repeating phrase" : "Repeat phrase";
}

function applyTextLayers() {
  elements.reader.dataset.layers = elements.textLayers.value;
  writeSetting("dd-text-layers", elements.textLayers.value);
}

renderLibraryNavigation();
renderTracks();

const savedTheme = readSetting("dd-theme", window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
setTheme(savedTheme);
setCount(readSetting("dd-prostrations", "0"));

const savedSpeed = readSetting("dd-speed", "1");
if ([...elements.speed.options].some((option) => option.value === savedSpeed)) elements.speed.value = savedSpeed;

const savedLayers = readSetting("dd-text-layers", "phonetics-english");
if ([...elements.textLayers.options].some((option) => option.value === savedLayers)) elements.textLayers.value = savedLayers;
elements.followText.checked = readSetting("dd-follow-text", "true") === "true";
elements.pauseAfterPhrase.checked = readSetting("dd-pause-after-phrase", "false") === "true";

currentPracticeIndex = Math.max(0, Math.min(content.practiceSteps.length - 1, Number(readSetting("dd-current-step", "0")) || 0));
renderPracticeSequence();
renderStepDetail(content.practiceSteps[currentPracticeIndex], currentPracticeIndex);

const savedTrackId = readSetting("dd-last-track");
if (trackById.has(savedTrackId)) loadTrackById(savedTrackId, false);
showView(readSetting("dd-view", "sequence"));

elements.tabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
elements.theme.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
elements.search.addEventListener("input", () => renderTracks(elements.search.value));

elements.practiceSequence.addEventListener("click", (event) => {
  const button = event.target.closest("[data-step-index]");
  if (!button) return;
  selectPracticeStep(Number(button.dataset.stepIndex), { play: true, scroll: true });
});

elements.stepPanel.addEventListener("click", (event) => {
  const trackButton = event.target.closest("[data-step-track]");
  if (trackButton) {
    loadTrackById(trackButton.dataset.stepTrack, true);
    if (trackById.get(trackButton.dataset.stepTrack)?.transcript) showView("reader");
    return;
  }
  if (event.target.closest("#complete-step")) completeCurrentStep();
});

elements.resetProgress.addEventListener("click", () => {
  if (!window.confirm("Reset progress through this practice sequence?")) return;
  completedSteps = new Set();
  writeJsonSetting("dd-completed-steps", []);
  selectPracticeStep(0, { scroll: true });
});

elements.groups.addEventListener("click", (event) => {
  const button = event.target.closest("[data-track-id]");
  if (!button) return;
  const alreadyPlaying = tracks[currentTrackIndex]?.id === button.dataset.trackId && !elements.audio.paused;
  if (alreadyPlaying) elements.audio.pause();
  else {
    loadTrackById(button.dataset.trackId, true);
    if (trackById.get(button.dataset.trackId)?.transcript) showView("reader");
  }
});

elements.readerTrackNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reader-track]");
  if (button) loadTrackById(button.dataset.readerTrack, true);
});

elements.phraseList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-phrase-index]");
  if (button) playPhrase(Number(button.dataset.phraseIndex));
});

elements.previousPhrase.addEventListener("click", () => playPhrase((activePhraseIndex >= 0 ? activePhraseIndex : 0) - 1));
elements.nextPhrase.addEventListener("click", () => playPhrase((activePhraseIndex >= 0 ? activePhraseIndex : -1) + 1));
elements.repeatPhrase.addEventListener("click", () => setRepeatPhrase(!repeatPhraseEnabled));
elements.textLayers.addEventListener("change", applyTextLayers);
elements.followText.addEventListener("change", () => writeSetting("dd-follow-text", elements.followText.checked));
elements.pauseAfterPhrase.addEventListener("change", () => writeSetting("dd-pause-after-phrase", elements.pauseAfterPhrase.checked));

elements.play.addEventListener("click", () => {
  if (elements.audio.paused) elements.audio.play().catch(() => showPlayerMessage("This recording could not begin. Try selecting it again."));
  else elements.audio.pause();
});
elements.previous.addEventListener("click", () => moveTrack(-1));
elements.next.addEventListener("click", () => moveTrack(1));
elements.rewind.addEventListener("click", () => { elements.audio.currentTime = Math.max(0, elements.audio.currentTime - 10); });
elements.forward.addEventListener("click", () => { elements.audio.currentTime = Math.min(elements.audio.duration || 0, elements.audio.currentTime + 10); });

elements.seek.addEventListener("input", () => {
  seeking = true;
  elements.elapsed.textContent = formatTime(Number(elements.seek.value));
});
elements.seek.addEventListener("change", () => {
  elements.audio.currentTime = Number(elements.seek.value);
  seeking = false;
  updateActivePhrase(true);
  if (repeatPhraseEnabled) repeatPhraseIndex = activePhraseIndex;
});

elements.speed.addEventListener("change", () => {
  elements.audio.playbackRate = Number(elements.speed.value);
  writeSetting("dd-speed", elements.speed.value);
});

elements.audio.addEventListener("loadedmetadata", () => {
  elements.seek.max = String(elements.audio.duration);
  elements.duration.textContent = formatTime(elements.audio.duration);
});

elements.audio.addEventListener("timeupdate", () => {
  if (!seeking) {
    elements.seek.value = String(elements.audio.currentTime);
    elements.elapsed.textContent = formatTime(elements.audio.currentTime);
  }
  if (repeatPhraseEnabled && activeTranscript && repeatPhraseIndex >= 0) {
    const phrase = activeTranscript.phrases[repeatPhraseIndex];
    if (elements.audio.currentTime >= phrase.end) {
      elements.audio.currentTime = phrase.start;
      elements.audio.play().catch(() => {});
    }
  } else if (elements.pauseAfterPhrase.checked && activeTranscript && activePhraseIndex >= 0) {
    const phrase = activeTranscript.phrases[activePhraseIndex];
    if (elements.audio.currentTime >= phrase.end) {
      elements.audio.pause();
      const nextPhrase = activeTranscript.phrases[activePhraseIndex + 1];
      elements.audio.currentTime = nextPhrase ? nextPhrase.start : phrase.end;
      updateActivePhrase(true);
    }
  }
  updateActivePhrase();
});

elements.audio.addEventListener("play", () => {
  elements.play.textContent = "Ⅱ";
  elements.play.setAttribute("aria-label", "Pause");
  renderTracks(elements.search.value);
  updateActivePhrase(true);
});

elements.audio.addEventListener("pause", () => {
  elements.play.textContent = "▶";
  elements.play.setAttribute("aria-label", "Play");
  renderTracks(elements.search.value);
  updateActivePhrase(true);
});

elements.audio.addEventListener("error", () => showPlayerMessage("The selected recording could not be loaded."));

document.querySelectorAll("[data-count]").forEach((button) => {
  button.addEventListener("click", () => setCount((Number.parseInt(elements.count.value, 10) || 0) + Number(button.dataset.count)));
});

elements.resetCount.addEventListener("click", () => {
  if (window.confirm("Reset the personal counter to zero?")) setCount(0);
});
