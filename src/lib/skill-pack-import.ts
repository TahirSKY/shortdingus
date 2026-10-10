import { unzipSync } from "fflate";

export const PACK_LIMITS = {
  archiveBytes: 25 * 1024 * 1024,
  totalBytes: 100 * 1024 * 1024,
  fileBytes: 50 * 1024 * 1024,
  textFileBytes: 512 * 1024,
  totalTextBytes: 2 * 1024 * 1024,
  files: 100,
} as const;

export interface PackEntry {
  path: string;
  name: string;
  bytes: Uint8Array;
  size: number;
  mimeType: string;
  kind: "text" | "binary";
  text?: string;
}

export interface ParsedPack {
  name: string;
  entries: PackEntry[];
  skipped: string[];
  totalBytes: number;
}

interface RawEntry {
  path: string;
  bytes: Uint8Array;
  mimeType?: string;
}

interface ZipDirectoryEntry {
  path: string;
  compressedBytes: number;
  uncompressedBytes: number;
  directory: boolean;
}

const TEXT_EXTENSIONS = new Set([
  "md", "markdown", "txt", "text", "css", "json", "jsonc", "json5", "html", "htm", "xml", "js", "mjs", "cjs", "jsx", "ts", "tsx",
  "py", "sh", "bash", "zsh", "ps1", "bat", "cmd", "csv", "tsv", "toml", "ini", "cfg", "conf", "yaml", "yml", "sql", "svg", "log",
  "diff", "patch", "properties", "makefile", "dockerfile",
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  md: "text/markdown", markdown: "text/markdown", txt: "text/plain", text: "text/plain", css: "text/css", json: "application/json", jsonc: "application/json", json5: "application/json",
  html: "text/html", htm: "text/html", xml: "application/xml", js: "text/javascript", mjs: "text/javascript", cjs: "text/javascript", jsx: "text/javascript", ts: "text/typescript", tsx: "text/typescript",
  py: "text/x-python", sh: "text/x-shellscript", bash: "text/x-shellscript", zsh: "text/x-shellscript", ps1: "text/plain", bat: "text/plain", cmd: "text/plain", csv: "text/csv", tsv: "text/tab-separated-values",
  toml: "text/plain", ini: "text/plain", cfg: "text/plain", conf: "text/plain", yaml: "text/yaml", yml: "text/yaml", sql: "text/plain", svg: "image/svg+xml", log: "text/plain", diff: "text/plain", patch: "text/plain",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg", opus: "audio/opus", pdf: "application/pdf",
};

function extensionOf(path: string) {
  const base = path.split("/").pop() || "";
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot + 1).toLowerCase();
}

function isTextExtension(path: string) {
  const base = path.split("/").pop()?.toLowerCase() || "";
  if (base === "makefile" || base === "dockerfile") return true;
  return TEXT_EXTENSIONS.has(extensionOf(path));
}

function normalizePath(rawPath: string) {
  const normalized = rawPath.replace(/\\/g, "/").trim();
  if (!normalized || normalized.includes("\0")) throw new Error("The pack contains an empty or invalid file path.");
  if (normalized.startsWith("/") || /^[a-z]:/i.test(normalized)) throw new Error(`Unsafe absolute path in pack: ${rawPath}`);
  if (normalized.length > 500) throw new Error("The pack contains a path that is too long.");
  const parts = normalized.split("/");
  if (parts.some((part) => part === "..")) throw new Error(`Unsafe parent-directory path in pack: ${rawPath}`);
  const clean = parts.filter((part) => part && part !== ".").join("/");
  if (!clean) throw new Error(`The pack contains an invalid file path: ${rawPath}`);
  return clean;
}

function ignoredReason(path: string): string | null {
  const parts = path.split("/");
  const lowerParts = parts.map((part) => part.toLowerCase());
  const base = lowerParts[lowerParts.length - 1] || "";
  if (lowerParts.some((part) => part === ".git" || part === "node_modules" || part === "__macosx")) return "generated or package-manager folder";
  if ([".ds_store", "thumbs.db", "desktop.ini"].includes(base)) return "operating-system metadata";
  if (/^\.env(?:\.|$)/i.test(base) || /^(?:id_rsa|id_ed25519|id_ecdsa)(?:\.|$)/i.test(base) || /\.(?:pem|p12|pfx|key)$/i.test(base)) return "possible secret or private key";
  return null;
}

function mimeFor(path: string, suggested?: string) {
  const mime = suggested?.split(";")[0].trim();
  if (mime && mime !== "application/octet-stream") return mime;
  return MIME_BY_EXTENSION[extensionOf(path)] || mime || "application/octet-stream";
}

function looksLikeUtf8Text(bytes: Uint8Array) {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

function makeEntry(path: string, bytes: Uint8Array, suggestedMime?: string): PackEntry {
  if (bytes.byteLength > PACK_LIMITS.fileBytes) throw new Error(`${path} is larger than the ${formatBytes(PACK_LIMITS.fileBytes)} per-file limit.`);
  const extension = extensionOf(path);
  const mimeType = mimeFor(path, suggestedMime);
  const text = isTextExtension(path) || mimeType.startsWith("text/") || mimeType === "application/json" || (!extension && looksLikeUtf8Text(bytes));
  if (text) {
    if (bytes.byteLength > PACK_LIMITS.textFileBytes) throw new Error(`${path} is larger than the ${formatBytes(PACK_LIMITS.textFileBytes)} text-file limit.`);
    return { path, name: path.split("/").pop() || path, bytes, size: bytes.byteLength, mimeType, kind: "text", text: new TextDecoder("utf-8").decode(bytes) };
  }
  return { path, name: path.split("/").pop() || path, bytes, size: bytes.byteLength, mimeType, kind: "binary" };
}

function commonRoot(paths: string[]) {
  if (!paths.length) return null;
  const split = paths.map((path) => path.split("/"));
  const first = split[0][0];
  if (!first || split.some((parts) => parts.length < 2 || parts[0] !== first)) return null;
  return first;
}

function makeParsedPack(rawEntries: RawEntry[], suggestedName: string): ParsedPack {
  if (rawEntries.length > PACK_LIMITS.files) throw new Error(`This pack has more than ${PACK_LIMITS.files} files. Split it into smaller packs.`);

  const normalized = rawEntries.map((entry) => ({ ...entry, path: normalizePath(entry.path) }));
  const root = commonRoot(normalized.map((entry) => entry.path));
  const skipped: string[] = [];
  const entries: PackEntry[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  let totalTextBytes = 0;

  for (const raw of normalized) {
    const rootSkip = ignoredReason(raw.path);
    if (rootSkip) {
      skipped.push(`${raw.path} (${rootSkip})`);
      continue;
    }
    let path = raw.path;
    if (root && path.startsWith(`${root}/`)) path = path.slice(root.length + 1);
    const skip = ignoredReason(path);
    if (skip) {
      skipped.push(`${path} (${skip})`);
      continue;
    }
    const key = path.toLowerCase();
    if (seen.has(key)) throw new Error(`The pack contains duplicate file paths that differ only by case: ${path}`);
    seen.add(key);
    const entry = makeEntry(path, raw.bytes, raw.mimeType);
    totalBytes += entry.size;
    if (totalBytes > PACK_LIMITS.totalBytes) throw new Error(`The unpacked pack is larger than the ${formatBytes(PACK_LIMITS.totalBytes)} total limit.`);
    if (entry.kind === "text") {
      totalTextBytes += entry.size;
      if (totalTextBytes > PACK_LIMITS.totalTextBytes) throw new Error(`Text and script files together must be ${formatBytes(PACK_LIMITS.totalTextBytes)} or smaller so the hub manifest stays usable.`);
    }
    entries.push(entry);
  }

  if (!entries.length) throw new Error("No usable files were found. The pack may contain only folders, generated files, or secrets.");
  const inferred = root && suggestedName.toLowerCase().includes("imported") ? root : suggestedName;
  return { name: cleanPackName(inferred), entries, skipped, totalBytes };
}

function cleanPackName(value: string) {
  return value.replace(/\\/g, "/").split("/").filter(Boolean).pop()?.replace(/\.zip$/i, "").replace(/[_-]+/g, " ").trim() || "Imported editing pack";
}

function inspectZip(bytes: Uint8Array): ZipDirectoryEntry[] {
  if (bytes.byteLength > PACK_LIMITS.archiveBytes) throw new Error(`ZIP files must be ${formatBytes(PACK_LIMITS.archiveBytes)} or smaller.`);
  if (bytes.byteLength < 22) throw new Error("That ZIP file looks incomplete.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minEnd = Math.max(0, bytes.byteLength - 22 - 0xffff);
  let endRecord = -1;
  for (let at = bytes.byteLength - 22; at >= minEnd; at -= 1) {
    if (view.getUint32(at, true) !== 0x06054b50) continue;
    const commentLength = view.getUint16(at + 20, true);
    if (at + 22 + commentLength === bytes.byteLength) { endRecord = at; break; }
  }
  if (endRecord < 0) throw new Error("This is not a supported ZIP archive, or its directory is damaged.");
  if (view.getUint16(endRecord + 4, true) !== 0 || view.getUint16(endRecord + 6, true) !== 0) throw new Error("Multi-disk ZIP archives are not supported.");

  const entryCount = view.getUint16(endRecord + 10, true);
  const directoryBytes = view.getUint32(endRecord + 12, true);
  const directoryOffset = view.getUint32(endRecord + 16, true);
  if (entryCount === 0xffff || directoryBytes === 0xffffffff || directoryOffset === 0xffffffff) throw new Error("ZIP64 archives are not supported yet. Please create a standard ZIP file.");
  if (entryCount > PACK_LIMITS.files) throw new Error(`This pack has more than ${PACK_LIMITS.files} files. Split it into smaller packs.`);
  if (directoryOffset + directoryBytes > endRecord) throw new Error("The ZIP directory is invalid.");

  const result: ZipDirectoryEntry[] = [];
  let cursor = directoryOffset;
  let totalBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.byteLength || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("The ZIP directory is damaged.");
    const compressedBytes = view.getUint32(cursor + 20, true);
    const uncompressedBytes = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const disk = view.getUint16(cursor + 34, true);
    if (disk !== 0) throw new Error("Multi-disk ZIP archives are not supported.");
    if (compressedBytes === 0xffffffff || uncompressedBytes === 0xffffffff) throw new Error("ZIP64 archives are not supported yet. Please create a standard ZIP file.");
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > directoryOffset + directoryBytes) throw new Error("The ZIP directory is damaged.");
    const rawName = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const path = normalizePath(rawName.replace(/\/$/, "") || rawName);
    const directory = rawName.endsWith("/");
    if (!directory) {
      if (uncompressedBytes > PACK_LIMITS.fileBytes) throw new Error(`${path} is larger than the ${formatBytes(PACK_LIMITS.fileBytes)} per-file limit.`);
      totalBytes += uncompressedBytes;
      if (totalBytes > PACK_LIMITS.totalBytes) throw new Error(`The unpacked pack is larger than the ${formatBytes(PACK_LIMITS.totalBytes)} total limit.`);
    }
    result.push({ path, compressedBytes, uncompressedBytes, directory });
    cursor = recordEnd;
  }
  if (cursor > directoryOffset + directoryBytes) throw new Error("The ZIP directory is damaged.");
  return result;
}

export function parseZipBytes(bytes: Uint8Array, archiveName: string): ParsedPack {
  const expected = inspectZip(bytes);
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("ShortDingus could not unpack this ZIP. Try creating a standard, unencrypted ZIP file.");
  }
  const rawEntries: RawEntry[] = [];
  let actualTotal = 0;
  for (const [rawPath, fileBytes] of Object.entries(files)) {
    if (rawPath.endsWith("/")) continue;
    const path = normalizePath(rawPath);
    const listed = expected.find((entry) => entry.path === path && !entry.directory);
    if (!listed) throw new Error(`The ZIP contains an unexpected entry: ${path}`);
    if (fileBytes.byteLength !== listed.uncompressedBytes) throw new Error(`The ZIP size information does not match for ${path}.`);
    actualTotal += fileBytes.byteLength;
    if (actualTotal > PACK_LIMITS.totalBytes) throw new Error(`The unpacked pack is larger than the ${formatBytes(PACK_LIMITS.totalBytes)} total limit.`);
    rawEntries.push({ path, bytes: fileBytes, mimeType: MIME_BY_EXTENSION[extensionOf(path)] });
  }
  const archiveLabel = cleanPackName(archiveName);
  return makeParsedPack(rawEntries, archiveLabel);
}

export async function parsePackFiles(files: File[]): Promise<ParsedPack> {
  if (!files.length) throw new Error("Choose a ZIP, a folder, or one or more files first.");
  const archives = files.filter((file) => file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed");
  if (archives.length) {
    if (archives.length !== 1 || files.length !== 1) throw new Error("Choose one ZIP at a time, or select a folder/files instead.");
    const archive = archives[0];
    if (archive.size > PACK_LIMITS.archiveBytes) throw new Error(`ZIP files must be ${formatBytes(PACK_LIMITS.archiveBytes)} or smaller.`);
    return parseZipBytes(new Uint8Array(await archive.arrayBuffer()), archive.name);
  }

  if (files.length > PACK_LIMITS.files) throw new Error(`This pack has more than ${PACK_LIMITS.files} files. Split it into smaller packs.`);
  const sourceSize = files.reduce((sum, file) => sum + file.size, 0);
  if (sourceSize > PACK_LIMITS.totalBytes) throw new Error(`The selected folder is larger than the ${formatBytes(PACK_LIMITS.totalBytes)} total limit.`);
  const rawEntries: RawEntry[] = [];
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    if (file.size > PACK_LIMITS.fileBytes) throw new Error(`${path} is larger than the ${formatBytes(PACK_LIMITS.fileBytes)} per-file limit.`);
    rawEntries.push({ path, bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type || undefined });
  }
  const root = commonRoot(rawEntries.map((entry) => normalizePath(entry.path)));
  const label = root || "Imported editing pack";
  return makeParsedPack(rawEntries, label);
}

export function slugForPackFile(packSlug: string, path: string) {
  const withoutExtension = path.replace(/\.[^/.]+$/, "");
  const base = slugify(`pack-${packSlug}-${withoutExtension}`).slice(0, 51).replace(/-+$/g, "") || "pack-file";
  return `${base}-${stableHash(path)}`.slice(0, 60).replace(/-+$/g, "");
}

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "pack";
}

export function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 7);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function importedSkillDescription(packName: string, path: string) {
  const base = path.split("/").pop()?.toLowerCase() || path.toLowerCase();
  if (base === "skill.md") return `Primary editing workflow from the ${packName} pack. Read this before planning or building a video in this hub.`;
  if (base === "blacklist.md") return `Hard no-go list from the ${packName} pack. Check this before proposing or building.`;
  if (["style.md", "brand.md", "brand.json", "tokens.css", "type-roles.md", "persa-roles.css"].includes(base)) return `Style, brand, or type reference from the ${packName} pack (${path}). Load it when art-directing this hub.`;
  if (base === "sound.md") return `Sound-design rules from the ${packName} pack (${path}). Load before placing or mixing SFX.`;
  if (base === "grade.md" || base === "cutout.md") return `Finishing rules from the ${packName} pack (${path}). Load when color grading or using subject cut-outs.`;
  if (base === "sourcing.md") return `Asset sourcing rules from the ${packName} pack (${path}). Load before searching for external visuals.`;
  if (base === "how-we-edit.md" || base === "setup-prompt.txt" || base === "start-here.md") return `Workflow/setup reference from the ${packName} pack (${path}). Load before planning an edit.`;
  return `Imported source file from the ${packName} pack (${path}). Full original contents are preserved; use read_skill when relevant. Scripts are reference material and are never run automatically.`;
}

export function buildPackStyleNote(packName: string, primarySkillSlug: string | null, slugs: string[]) {
  const primary = primarySkillSlug ? `Primary editing rules: load the full skill \`${primarySkillSlug}\` before proposing or building videos for this hub.` : "No SKILL.md was found; ask the user which imported rule file should lead the workflow.";
  const references = slugs.filter((slug) => slug !== primarySkillSlug);
  const listedReferences = references.slice(0, 15).join(", ");
  const additional = references.length > 15 ? `, plus ${references.length - 15} more in the hub Skills tab` : "";
  return [
    `Imported editing pack: ${packName}.`,
    primary,
    references.length ? `Original text, style-token, and script files are preserved as hub skills. Use read_skill for relevant references (${listedReferences}${additional}); do not execute imported scripts.` : "All original text files are preserved as hub skills; do not execute imported scripts.",
    "Use these as the user's rules and references, not as a fixed video template. If a pack rule conflicts with an explicit request in this chat, surface the conflict and ask before proceeding.",
  ].join("\n");
}

export function mergePackStyleGuide(current: string, packSlug: string, note: string) {
  const start = `--- BEGIN IMPORTED PACK ${packSlug} ---`;
  const end = `--- END IMPORTED PACK ${packSlug} ---`;
  const block = `${start}\n${note}\n${end}`;
  const startAt = current.indexOf(start);
  const endAt = startAt >= 0 ? current.indexOf(end, startAt + start.length) : -1;
  if (startAt >= 0 && endAt >= 0) return `${current.slice(0, startAt)}${block}${current.slice(endAt + end.length)}`.trim();
  return [block, current.trim()].filter(Boolean).join("\n\n");
}
