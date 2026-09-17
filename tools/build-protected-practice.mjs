import {
  createCipheriv,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";
import {
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ITERATIONS = 400000;
const MAGIC = Buffer.from("DDPACK01", "ascii");
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const shellDirectory = path.join(repositoryRoot, "dorje-drolo-practice");
const assetDirectory = path.join(repositoryRoot, "Ngondro Audio");
const outputPath = path.join(repositoryRoot, "dorje-drolo", "practice.bin");
const password = process.env.DORJE_PRACTICE_PASSWORD;

if (!password) {
  throw new Error("Set DORJE_PRACTICE_PASSWORD before building the protected practice.");
}

const shellNames = ["index.html", "styles.css", "content.js", "app.js"];
const assetNames = (await readdir(assetDirectory))
  .filter((name) => /\.(mp3|pdf)$/i.test(name))
  .sort((left, right) => left.localeCompare(right));

function mimeType(name) {
  if (/\.mp3$/i.test(name)) return "audio/mpeg";
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.css$/i.test(name)) return "text/css";
  if (/\.js$/i.test(name)) return "text/javascript";
  return "text/html";
}

const inputs = [
  ...shellNames.map((name) => ({
    source: path.join(shellDirectory, name),
    archivePath: "shell/" + name,
  })),
  ...assetNames.map((name) => ({
    source: path.join(assetDirectory, name),
    archivePath: "assets/" + name,
  })),
];

let offset = 0;
const chunks = [];
const files = [];

for (const input of inputs) {
  const bytes = await readFile(input.source);
  files.push({
    path: input.archivePath,
    mime: mimeType(input.archivePath),
    offset,
    length: bytes.length,
  });
  chunks.push(bytes);
  offset += bytes.length;
}

const header = Buffer.from(JSON.stringify({
  format: 1,
  files,
}), "utf8");
const headerLength = Buffer.alloc(4);
headerLength.writeUInt32LE(header.length);
const plaintext = Buffer.concat([headerLength, header, ...chunks]);

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
const cipher = createCipheriv("aes-256-gcm", key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const authTag = cipher.getAuthTag();
const packageBytes = Buffer.concat([MAGIC, salt, iv, encrypted, authTag]);

await writeFile(outputPath, packageBytes);
console.log(JSON.stringify({
  output: path.relative(repositoryRoot, outputPath),
  files: files.length,
  plaintextBytes: plaintext.length,
  encryptedBytes: packageBytes.length,
}));
