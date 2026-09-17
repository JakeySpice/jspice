"use strict";

const MAGIC = "DDPACK01";
const ITERATIONS = 400000;
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const objectUrls = [];

const elements = {
  form: document.querySelector("#unlock-form"),
  password: document.querySelector("#practice-password"),
  reveal: document.querySelector("#reveal-password"),
  submit: document.querySelector("#unlock-button"),
  status: document.querySelector("#status"),
  gate: document.querySelector("#gate"),
  host: document.querySelector("#practice-host"),
  frame: document.querySelector("#practice-frame"),
};

let archivePromise;

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", isError);
}

function getArchive() {
  archivePromise ??= fetch("practice.bin", { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error("The encrypted practice package is unavailable.");
    return response.arrayBuffer();
  });
  return archivePromise;
}

async function deriveKey(password, salt) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decryptArchive(password) {
  const archive = new Uint8Array(await getArchive());
  const magic = textDecoder.decode(archive.subarray(0, 8));
  if (magic !== MAGIC) throw new Error("The encrypted package is invalid.");

  const salt = archive.subarray(8, 24);
  const iv = archive.subarray(24, 36);
  const encrypted = archive.subarray(36);
  const key = await deriveKey(password, salt);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
}

function unpack(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const headerLength = view.getUint32(0, true);
  const headerStart = 4;
  const bodyStart = headerStart + headerLength;
  const header = JSON.parse(textDecoder.decode(bytes.subarray(headerStart, bodyStart)));
  const files = new Map();

  header.files.forEach((file) => {
    const start = bodyStart + file.offset;
    files.set(file.path, {
      ...file,
      bytes: bytes.slice(start, start + file.length),
    });
  });
  return files;
}

function fileText(files, path) {
  const file = files.get(path);
  if (!file) throw new Error("Missing protected file: " + path);
  return textDecoder.decode(file.bytes);
}

function escapeInlineScript(source) {
  return source.replaceAll("</script", "<\\/script");
}

function buildPracticeDocument(files) {
  let html = fileText(files, "shell/index.html");
  const css = fileText(files, "shell/styles.css");
  const content = fileText(files, "shell/content.js");
  const app = fileText(files, "shell/app.js");
  const assetUrls = {};

  files.forEach((file, path) => {
    if (!path.startsWith("assets/")) return;
    const name = path.slice("assets/".length);
    const url = URL.createObjectURL(new Blob([file.bytes], { type: file.mime }));
    objectUrls.push(url);
    assetUrls[name] = url;

    const originalReference = "../Ngondro%20Audio/" + encodeURIComponent(name);
    html = html.replaceAll(originalReference, url);
  });

  html = html
    .replace('<link rel="stylesheet" href="styles.css" />', "<style>" + css + "</style>")
    .replace('<script src="content.js" defer></script>', "")
    .replace('<script src="app.js" defer></script>', "")
    .replace('<a class="wordmark" href="./"', '<a class="wordmark" href="/" target="_top"')
    .replaceAll("Local only", "Private session")
    .replaceAll("kept on this device", "decrypted on this device")
    .replace(
      "</body>",
      "<script>window.DORJE_ASSET_URLS=" + escapeInlineScript(JSON.stringify(assetUrls)) + ";</script>" +
        "<script>" + escapeInlineScript(content) + "</script>" +
        "<script>" + escapeInlineScript(app) + "</script></body>",
    );

  return html;
}

async function unlock(password) {
  setStatus("Decrypting the practice materials on this device…");
  const decrypted = await decryptArchive(password);
  const files = unpack(decrypted);
  elements.frame.srcdoc = buildPracticeDocument(files);
  elements.password.value = "";
  elements.gate.hidden = true;
  elements.host.hidden = false;
  document.title = "Private practice | jspice.au";
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = elements.password.value.trim();
  if (!password) return;

  elements.submit.disabled = true;
  elements.password.disabled = true;
  setStatus("Opening the encrypted practice…");

  try {
    await unlock(password);
  } catch {
    setStatus("That password did not unlock this practice.", true);
    elements.password.disabled = false;
    elements.submit.disabled = false;
    elements.password.focus();
    elements.password.select();
  }
});

elements.reveal.addEventListener("click", () => {
  const show = elements.password.type === "password";
  elements.password.type = show ? "text" : "password";
  elements.reveal.textContent = show ? "Hide" : "Show";
  elements.reveal.setAttribute("aria-label", (show ? "Hide" : "Show") + " password");
  elements.password.focus();
});

window.addEventListener("beforeunload", () => {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
});
