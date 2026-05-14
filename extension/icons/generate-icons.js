/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Run with Node.js to generate PNG icons from SVG.
 * Requires: npm install -g sharp  OR  use the Canvas API approach below.
 *
 * Quick alternative: open generate-icons.html in a browser and
 * right-click → Save Image for each size.
 *
 * Or paste the SVG into https://favicon.io/favicon-converter/ to export PNGs.
 */

// The SVG source (NextRole N-stack logo in brand accent color)
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#c84a1f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1" y="1" width="22" height="22" rx="6" fill="#f7f3ec" stroke="none"/>
  <path d="M12 4L4 8.5l8 4.5 8-4.5L12 4z" stroke="#c84a1f" stroke-width="1.8"/>
  <path d="M4 15.5l8 4.5 8-4.5" stroke="#c84a1f" stroke-width="1.8"/>
  <path d="M4 11l8 4.5 8-4.5" stroke="#c84a1f" stroke-width="1.8"/>
</svg>`;

console.log("SVG source ready. To generate PNGs:");
console.log("1. Open generate-icons.html in a browser");
console.log("2. Or use: npx svgo + any PNG converter");
console.log("3. Or use https://favicon.io/favicon-converter/");
console.log("\nExpected files: icon16.png, icon48.png, icon128.png");

// Write the SVG to a file so it can be converted
const fs = require("fs");
fs.writeFileSync(__dirname + "/icon.svg", SVG);
console.log("\nWrote icon.svg — convert to PNG at the sizes above.");
