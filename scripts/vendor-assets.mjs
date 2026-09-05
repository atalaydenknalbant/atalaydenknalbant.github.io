import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const copies = [
  ["three/build/three.module.min.js", "vendor/three.module.min.js"],
  ["three/build/three.core.min.js", "vendor/three.core.min.js"],
  ["three/LICENSE", "vendor/THREE-LICENSE.txt"],
  ["lucide-static/LICENSE", "icons/LUCIDE-LICENSE.txt"],
  [
    "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
    "fonts/bricolage-latin.woff2",
  ],
  [
    "@fontsource-variable/bricolage-grotesque/LICENSE",
    "fonts/BRICOLAGE-LICENSE.txt",
  ],
  [
    "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2",
    "fonts/atkinson-latin-400.woff2",
  ],
  [
    "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2",
    "fonts/atkinson-latin-700.woff2",
  ],
  ["@fontsource/atkinson-hyperlegible/LICENSE", "fonts/ATKINSON-LICENSE.txt"],
];
for (const icon of [
  "arrow-right",
  "arrow-up-right",
  "chevron-down",
  "menu",
  "x",
  "pause",
  "play",
]) {
  copies.push([`lucide-static/icons/${icon}.svg`, `icons/${icon}.svg`]);
}
for (const [source, destination] of copies) {
  const target = join(root, "assets", destination);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, "node_modules", source), target);
}
console.log(
  `Prepared ${copies.length} local assets. GitHub Pages needs no build step.`,
);
