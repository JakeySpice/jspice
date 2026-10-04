"use strict";

const data = window.DORJE_READER_DATA;
let sections = data.sections;
const elements = {
  audio: document.querySelector("#recording"),
  select: document.querySelector("#section-select"),
  title: document.querySelector("#section-title"),
  subtitle: document.querySelector("#section-subtitle"),
  position: document.querySelector("#section-position"),
  verses: document.querySelector("#verses"),
  play: document.querySelector("#play-pause"),
  status: document.querySelector("#player-status"),
  size: document.querySelector("#text-size"),
  return: document.querySelector("#return-to-verse"),
  lineage: document.querySelector("#include-lineage"),
  previous: document.querySelector("#previous-section"),
  next: document.querySelector("#next-section"),
  note: document.querySelector("#recording-note"),
  source: document.querySelector("#section-source"),
  player: document.querySelector(".player"),
};

let sectionIndex = 0;
let activePhraseIndex = -1;
let followPlayback = true;

function setStatus(message) {
  elements.status.textContent = message;
}

function makeText(tag, className, value) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = value;
  return element;
}

function renderVerse(phrase) {
  const verse = document.createElement("div");
  verse.className = "verse";
  verse.setAttribute("aria-current", "false");
  const current = makeText("span", "current-label", "Current verse");
  current.setAttribute("aria-hidden", "true");
  verse.append(current);
  if (phrase.marker) verse.append(makeText("p", "recitation-label", phrase.marker));

  const tibetan = makeText("p", "tibetan", phrase.tibetan);
  tibetan.lang = "bo";
  verse.append(tibetan, makeText("p", "phonetics", phrase.phonetics));

  const english = document.createElement("p");
  english.className = "english";
  phrase.english.forEach((line, index) => {
    if (index > 0) english.append(document.createElement("br"));
    english.append(document.createTextNode(line));
  });
  verse.append(english);
  return verse;
}

function updateNavigation() {
  const section = sections[sectionIndex];
  elements.select.value = section.id;
  elements.position.textContent = `Step ${sectionIndex + 1} of ${sections.length} · ${section.group}`;
  elements.previous.disabled = sectionIndex === 0;
  elements.next.disabled = sectionIndex === sections.length - 1;
  elements.next.textContent = section.optional ? "Skip lineage" : "Next";
}

function setSection(index, { scroll = true } = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= sections.length) return;
  elements.audio.pause();
  sectionIndex = index;
  activePhraseIndex = -1;
  followPlayback = true;
  elements.return.hidden = true;

  const section = sections[index];
  updateNavigation();
  elements.title.textContent = section.title;
  elements.subtitle.textContent = section.subtitle;
  elements.verses.replaceChildren(...section.phrases.map(renderVerse));
  elements.note.hidden = section.phrases.length > 0;
  elements.source.href = section.sourcePdf || data.sourcePdf;
  elements.audio.src = `media/${encodeURIComponent(section.recording)}`;
  elements.audio.load();
  elements.play.textContent = "Play";
  setStatus(`${section.title} · ${section.duration}`);

  if (scroll) document.querySelector(".reading-section").scrollIntoView({ block: "start" });
}

function phraseAt(time) {
  return sections[sectionIndex].phrases.findIndex((phrase) => time >= phrase.start && time < phrase.end);
}

function activeVerse() {
  return activePhraseIndex < 0 ? null : elements.verses.children[activePhraseIndex];
}

function showCurrentVerse() {
  const verse = activeVerse();
  if (!verse) return;
  followPlayback = true;
  elements.return.hidden = true;
  verse.scrollIntoView({
    behavior: "auto",
    block: "center",
  });
}

function updateReturnButton() {
  if (followPlayback || !activeVerse()) {
    elements.return.hidden = true;
    return;
  }
  const bounds = activeVerse().getBoundingClientRect();
  elements.return.hidden = bounds.bottom >= 0 && bounds.top <= elements.player.getBoundingClientRect().top;
}

function updateActivePhrase() {
  const next = phraseAt(elements.audio.currentTime);
  if (next === activePhraseIndex) return;
  activePhraseIndex = next;
  [...elements.verses.children].forEach((verse, index) => {
    verse.setAttribute("aria-current", String(index === next));
  });
  if (next >= 0 && followPlayback) showCurrentVerse();
  else updateReturnButton();
}

async function beginPlayback() {
  if (elements.audio.error) elements.audio.load();
  if (elements.audio.ended) elements.audio.currentTime = 0;
  try {
    await elements.audio.play();
  } catch (error) {
    // Selecting another recording can cancel a pending play request.
    if (error.name !== "AbortError") setStatus("Playback could not start. Try Play again.");
  }
}

function renderSectionOptions() {
  const groups = [];
  sections.forEach((section, index) => {
    let group = groups[groups.length - 1];
    if (!group || group.label !== section.group) {
      group = document.createElement("optgroup");
      group.label = section.group;
      groups.push(group);
    }
    const option = document.createElement("option");
    option.value = section.id;
    option.textContent = `${index + 1}. ${section.title}${section.optional ? " (optional)" : ""}`;
    group.append(option);
  });
  elements.select.replaceChildren(...groups);
}

function moveSection(offset) {
  const index = sectionIndex + offset;
  if (index < 0 || index >= sections.length) return;
  const wasPlaying = !elements.audio.paused && !elements.audio.ended;
  setSection(index);
  if (wasPlaying) beginPlayback();
}

elements.lineage.addEventListener("change", () => {
  const currentId = sections[sectionIndex].id;
  const wasPlaying = !elements.audio.paused && !elements.audio.ended;
  try {
    localStorage.setItem("dorje-include-lineage", String(elements.lineage.checked));
  } catch { /* The choice still works for this visit without storage. */ }
  sections = data.sections.filter((section) => elements.lineage.checked || !section.optional);
  renderSectionOptions();
  const currentIndex = sections.findIndex((section) => section.id === currentId);
  if (currentIndex >= 0) {
    // Changing the sequence must not restart the recording currently playing.
    sectionIndex = currentIndex;
    updateNavigation();
  } else {
    // Turning off the lineage while it is selected moves to the first reflection.
    setSection(sections.findIndex((section) => section.id === "reflection-one"), { scroll: false });
    if (wasPlaying) beginPlayback();
  }
});

elements.previous.addEventListener("click", () => moveSection(-1));
elements.next.addEventListener("click", () => moveSection(1));

elements.select.addEventListener("change", () => {
  setSection(sections.findIndex((section) => section.id === elements.select.value));
});
elements.play.addEventListener("click", () => {
  if (elements.audio.paused) beginPlayback();
  else elements.audio.pause();
});
elements.return.addEventListener("click", showCurrentVerse);
elements.audio.addEventListener("timeupdate", updateActivePhrase);
elements.audio.addEventListener("seeked", updateActivePhrase);
elements.audio.addEventListener("play", () => {
  elements.play.textContent = "Pause";
  setStatus(`Playing ${sections[sectionIndex].title}`);
});
elements.audio.addEventListener("pause", () => {
  elements.play.textContent = "Play";
  if (!elements.audio.ended) setStatus(`Paused · ${sections[sectionIndex].title}`);
});
elements.audio.addEventListener("ended", () => {
  if (sectionIndex === sections.length - 1) {
    elements.play.textContent = "Play again";
    setStatus("Practice complete · Final dedication finished.");
    return;
  }
  setSection(sectionIndex + 1);
  beginPlayback();
});
elements.audio.addEventListener("error", () => {
  setStatus("This recording could not be loaded. Try Play again, or use Next to continue.");
});

function turnOffFollow() {
  followPlayback = false;
  updateReturnButton();
}
window.addEventListener("wheel", turnOffFollow, { passive: true });
window.addEventListener("touchmove", turnOffFollow, { passive: true });
window.addEventListener("keydown", (event) => {
  if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", " "].includes(event.key) && event.target === document.body) turnOffFollow();
});
window.addEventListener("scroll", updateReturnButton, { passive: true });
window.addEventListener("resize", updateReturnButton);

// Keep the reader and its return button above the player when labels wrap.
new ResizeObserver(() => {
  document.documentElement.style.setProperty("--player-height", `${elements.player.getBoundingClientRect().height}px`);
  updateReturnButton();
}).observe(elements.player);

function setLargeText(large) {
  document.documentElement.classList.toggle("larger-text", large);
  elements.size.textContent = large ? "Smaller text" : "Larger text";
  elements.size.setAttribute("aria-pressed", String(large));
  try { localStorage.setItem("dorje-large-text", large ? "true" : "false"); } catch { /* Reading still works without storage. */ }
}
let largeText = false;
try { largeText = localStorage.getItem("dorje-large-text") === "true"; } catch { /* Use the default size. */ }
setLargeText(largeText);
elements.size.addEventListener("click", () => {
  largeText = !largeText;
  setLargeText(largeText);
});

try {
  elements.lineage.checked = localStorage.getItem("dorje-include-lineage") !== "false";
} catch { /* Include the optional chant by default when storage is unavailable. */ }
sections = data.sections.filter((section) => elements.lineage.checked || !section.optional);
renderSectionOptions();
setSection(0, { scroll: false });
