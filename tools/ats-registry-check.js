#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * NextRole — ATS registry validator.
 *
 * Reads extension/registry/ats.js, validates every entry has the required
 * shape, and flags any entries that look incomplete (missing hosts, no
 * fields, no formMarker). Run via `node tools/ats-registry-check.js`.
 *
 * Exits 0 on success, 1 if any entry is invalid.
 */

const fs   = require("fs");
const path = require("path");

const REGISTRY_PATH = path.join(__dirname, "..", "extension", "registry", "ats.js");

// Required fields for every entry.
const REQUIRED = ["label", "family", "framework", "hosts"];
// At least one of these so the entry can actually do something:
const NEEDS_ONE_OF = ["formMarker", "fields", "fileUpload"];

function loadRegistry() {
  const src = fs.readFileSync(REGISTRY_PATH, "utf8");
  // Strip the window.NR_ATS_REGISTRY = … bit so we can eval the const definition.
  // Simple but works for our controlled module.
  const sandbox = { window: {} };
  const fn = new Function("window", `${src}; return NR_ATS_REGISTRY;`);
  return fn(sandbox.window);
}

function check(reg) {
  const errors = [];
  const warnings = [];

  for (const [key, e] of Object.entries(reg)) {
    for (const f of REQUIRED) {
      if (!e[f]) errors.push(`[${key}] missing required field "${f}"`);
    }
    if (!Array.isArray(e.hosts) || e.hosts.length === 0) {
      errors.push(`[${key}] hosts must be a non-empty array of RegExp`);
    } else {
      e.hosts.forEach((h, i) => {
        if (!(h instanceof RegExp)) errors.push(`[${key}] hosts[${i}] is not a RegExp`);
      });
    }
    if (!NEEDS_ONE_OF.some((f) => e[f])) {
      warnings.push(`[${key}] has no formMarker / fields / fileUpload — registry entry won't do anything`);
    }
    if (e.multiStep && !e.stepIndicator) {
      warnings.push(`[${key}] is multiStep but has no stepIndicator selector`);
    }
    if (e.fields && typeof e.fields !== "object") {
      errors.push(`[${key}] fields must be an object`);
    }
  }

  return { errors, warnings, count: Object.keys(reg).length };
}

(function main() {
  const reg = loadRegistry();
  const { errors, warnings, count } = check(reg);

  console.log(`NextRole ATS registry: ${count} entries`);
  for (const k of Object.keys(reg)) {
    const e = reg[k];
    const hosts = e.hosts?.map((r) => r.toString()).join(", ");
    const ver   = e.verified?.length ? ` ✓ verified on ${e.verified.length}` : "";
    console.log(`  - ${k.padEnd(16)} ${e.label?.padEnd(28)} ${hosts}${ver}`);
  }

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }
  if (errors.length > 0) {
    console.error("\nErrors:");
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    process.exit(1);
  }
  console.log("\nOK");
})();
