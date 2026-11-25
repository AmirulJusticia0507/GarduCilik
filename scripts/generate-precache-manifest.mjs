import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const staticDir = path.join(projectRoot, ".next", "static");
const outputFile = path.join(projectRoot, "public", "precache-manifest.json");
const cacheableExtensions = new Set([
  ".js",
  ".css",
  ".woff",
  ".woff2",
  ".png",
  ".svg",
  ".webp",
  ".avif",
]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && cacheableExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

let assets = [];

try {
  const files = await collectFiles(staticDir);

  assets = files
    .map((file) => {
      const relativePath = path
        .relative(staticDir, file)
        .split(path.sep)
        .join("/");
      return `/_next/static/${relativePath}`;
    })
    .sort();
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }

  console.warn(
    "Direktori .next/static tidak ditemukan; manifest precache dibuat kosong.",
  );
}

await writeFile(
  outputFile,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), assets }, null, 2)}\n`,
  "utf8",
);

console.log(`Manifest precache ditulis: ${assets.length} aset statis.`);
