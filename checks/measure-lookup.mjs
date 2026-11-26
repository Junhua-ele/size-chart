#!/usr/bin/env node
// What I cannot see, measured on the deployed tool: that the answer is stable,
// that centimetres and inches agree, that a larger body gives a larger size,
// and that the chart and the region grid carry the same number as the headline.
//
// Each measurement is independent of the engine's own code: it compares what
// the page renders against the relationship the printed chart must satisfy.

import { chromium } from "playwright";

const BASE = (process.env.SHIPSITE_URL || "").replace(/\/$/, "");
const results = [];

function measure(name, ok, value, unit, detail) {
  results.push({ name, ok, value, unit, detail });
}

async function fill(page, id, value) {
  const el = page.locator(`[data-tool-input="${id}"]`).first();
  if ((await el.count()) === 0) return false;
  const tag = await el.evaluate((node) => node.tagName);
  if (tag === "SELECT") await el.selectOption({ value: String(value) });
  else await el.fill(String(value));
  return true;
}

async function run(page, given) {
  for (const [id, value] of Object.entries(given)) {
    if (value === undefined) continue;
    await fill(page, id, value);
  }
  const started = Date.now();
  await page.locator('[data-jtbd-action="lookup"]').first().click();
  // The tool names the job for a moment before the answer lands: wait for the
  // working state to appear and clear, then read the answer it left behind.
  const busy = await page.waitForSelector("[data-tool-working]", { timeout: 3000 }).catch(() => null);
  if (busy) await page.waitForSelector("[data-tool-working]", { state: "detached", timeout: 5000 });
  const ms = Date.now() - started;
  return {
    ms,
    size: ((await page.locator("[data-answer-size]").first().textContent()) ?? "").trim(),
    regions: await page.locator(".answer-regions .region").count(),
    currentRegion: ((await page.locator(".answer-regions .region.is-current .region-value").first().textContent()) ?? "").trim(),
    row: ((await page.locator(".answer-chart tr.is-match").first().innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim(),
  };
}

const numeric = (label) => {
  const m = label.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : NaN;
};

async function main() {
  if (!BASE) {
    console.error("SHIPSITE_URL is not set");
    process.exit(2);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });

  const base = { category: "Women's tops", shopping: "United Kingdom (UK)", start: "My measurements", units: "cm" };

  // 1. Determinism: the same body size gives the same answer twice.
  const a = await run(page, { ...base, bust: 95, waist: 74, hip: 101 });
  const b = await run(page, { ...base, bust: 95, waist: 74, hip: 101 });
  measure("determinism", a.size === b.size && a.size.length > 0, a.size, "label", `twice: "${a.size}" / "${b.size}"`);

  // 2. Centimetres and inches agree (95 cm = 37.4 in).
  const inches = await run(page, { ...base, units: "in", bust: 37.4, waist: 29.1, hip: 39.8 });
  measure("cm and inches agree", inches.size === a.size, inches.size, "label", `37.4 in -> "${inches.size}" vs 95 cm -> "${a.size}"`);

  // 3. A larger bust gives a larger size (the chart is not scrambled).
  const small = await run(page, { ...base, bust: 84, waist: 66, hip: 90 });
  const large = await run(page, { ...base, bust: 108, waist: 88, hip: 116 });
  measure(
    "size grows with the body",
    numeric(large.size) > numeric(small.size),
    `${numeric(small.size)} -> ${numeric(large.size)}`,
    "size step",
    `bust 84 -> "${small.size}", bust 108 -> "${large.size}"`,
  );

  // 4. The region grid holds eight regions and names the answer once.
  measure("eight regions", a.regions === 8, a.regions, "cells", "US/UK/EU/IT/FR/AU/JP/CN");
  measure(
    "current region matches the answer",
    a.currentRegion.length > 0 && numeric(a.size) === numeric(a.currentRegion),
    a.currentRegion,
    "label",
    `cell "${a.currentRegion}" vs answer "${a.size}"`,
  );

  // 5. The highlighted chart row carries the same numbers as the headline.
  const rowNumbers = (a.row.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  measure(
    "chart row carries the answer",
    rowNumbers.includes(numeric(a.size)),
    numeric(a.size),
    "label number",
    `row "${a.row}"`,
  );

  // 6. A shoe reads from a foot length, in the same eight regions.
  const shoe = await run(page, { category: "Women's shoe", shopping: "United Kingdom (UK)", start: "My measurements", footlength: 24 });
  measure("shoe region grid", shoe.regions === 8 && shoe.size.length > 0, shoe.regions, "cells", `foot 24 cm -> "${shoe.size}"`);

  // 7. The job answers within the 1–2 seconds the page promises.
  const times = [a.ms, b.ms, shoe.ms];
  const worst = Math.max(...times);
  measure("answer time", worst < 2000, worst, "ms", `worst of ${times.length} runs, bound 2000 ms`);

  await browser.close();

  for (const r of results) console.log(`MEASURE ${JSON.stringify(r)}`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((error) => {
  console.log(`MEASURE ${JSON.stringify({ name: "measure script", ok: false, detail: String(error).slice(0, 300) })}`);
  process.exit(1);
});
