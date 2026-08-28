import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDirectory = resolve('dist');
const manifestPath = resolve(distDirectory, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const referencedFiles = [
  manifest.action?.default_popup,
  manifest.options_page,
  manifest.background?.service_worker,
  ...manifest.content_scripts.flatMap((entry) => entry.js ?? [])
].filter(Boolean);

for (const relativePath of referencedFiles) {
  if (!existsSync(resolve(distDirectory, relativePath))) {
    throw new Error(`Manifest references a missing file: ${relativePath}`);
  }
}

for (const contentScript of manifest.content_scripts.flatMap((entry) => entry.js ?? [])) {
  const source = readFileSync(resolve(distDirectory, contentScript), 'utf8');
  if (/^\s*import\s/m.test(source) || /^\s*export\s/m.test(source)) {
    throw new Error(
      `Content script ${contentScript} contains ES-module syntax and will not execute in Chrome.`
    );
  }
}

console.log(`Validated ${referencedFiles.length} manifest assets and classic content-script syntax.`);
