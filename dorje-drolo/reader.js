"use strict";

const data = window.DORJE_READER_DATA;
const sections = data.sections;
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

function setSection(index, { scroll = true } = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= sections.length) return;
  elements.audio.pause();
  sectionIndex = index;
  activePhraseIndex = -1;
  followPlayback = true;
  elements.return.hidden = true;

  const section = sections[index];
  elements.select.value = section.id;
  elements.position.textContent = `Reflection ${index + 1} of ${sections.length}`;
  elements.title.textContent = section.title;
  elements.subtitle.textContent = section.subtitle;
  elements.verses.replaceChildren(...section.phrases.map(renderVerse));
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
  elements.return.hidden = bounds.bottom >= 0 && bounds.top <= window.innerHeight - 135;
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
  if (elements.audio.ended) elements.audio.currentTime = 0;
  try {
    await elements.audio.play();
  } catch {
    setStatus("Playback could not start. Try Play again.");
  }
}

elements.select.replaceChildren(...sections.map((section) => {
  const option = document.createElement("option");
  option.value = section.id;
  option.textContent = section.title;
  return option;
}));

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
    setStatus("All six reflections finished.");
    return;
  }
  setSection(sectionIndex + 1);
  beginPlayback();
});
elements.audio.addEventListener("error", () => {
  setStatus("This recording could not be loaded. The text is still available.");
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

setSection(0, { scroll: false });
