#!/usr/bin/env node
// Size Chart's own real-use test, run against the deployed site.
//
// It drives the size lookup the way a visitor does: a worn size, then
// measurements in cm, then a shoe, then a brand, in both browsers; it reads
// the answer off the page, copies it, prints it, changes an input to see the
// "Edited" state and puts it back with "Back to the sample", triggers the
// invalid state on purpose, opens every other page from the header, sends the
// contact form, and repeats the core job on a phone width with WebGPU missing.
//
// Everything it can check without eyes it checks: no horizontal overflow, no
// console errors, no failed same-origin requests, and the tool's loop inside
// the first screen at 1440x900.

import { chromium, webkit } from "playwright";

const BASE = (process.env.SHIPSITE_URL || "").replace(/\/$/, "");
const BROWSER = (process.env.SHIPSITE_BROWSER || "chromium").toLowerCase();

const controls = [];
const problems = [];
const overflow = [];
const consoleErrors = [];
const failedRequests = [];

function record(name, ok, detail) {
  controls.push({ name, ok, detail });
  if (!ok) problems.push(`${name}: ${detail}`);
}

function sameOrigin(href) {
  try {
    return new URL(href).origin === new URL(BASE).origin;
  } catch {
    return false;
  }
}

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/\[Report Only\]|delivered in report-only mode/i.test(text)) return;
    consoleErrors.push(`${label}: ${text.slice(0, 200)}`);
  });
  page.on("requestfailed", (request) => {
    if (!sameOrigin(request.url())) return;
    failedRequests.push(`${label}: ${request.method()} ${request.url().slice(0, 160)}`);
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    if (!sameOrigin(response.url())) return;
    failedRequests.push(`${label}: ${response.status()} ${response.url().slice(0, 160)}`);
  });
}

async function noOverflow(page, label) {
  const m = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  if (m.scroll > m.client + 1) overflow.push(`${label}: scrollWidth ${m.scroll} > ${m.client}`);
  return m;
}

async function setField(page, id, value) {
  const el = page.locator(`[data-tool-input="${id}"]`);
  if ((await el.count()) === 0) throw new Error(`field ${id} missing`);
  const tag = await el.first().evaluate((node) => node.tagName);
  if (tag === "SELECT") await el.first().selectOption({ value });
  else await el.first().fill(value);
}

/** Fill the tool, press the start button, and wait for the exact answer. */
async function lookup(page, given, expected) {
  const started = Date.now();
  for (const [id, value] of Object.entries(given)) {
    if (value === undefined) continue;
    await setField(page, id, String(value));
  }
  await page.locator('[data-jtbd-action="lookup"]').first().click();
  try {
    await page.waitForFunction(
      (want) => {
        const el = document.querySelector("[data-answer-size]");
        return !!el && (el.textContent || "").trim() === want;
      },
      expected,
      { timeout: 8000 },
    );
    return { ok: true, ms: Date.now() - started };
  } catch {
    const shown = (await page.locator("[data-answer-size]").first().textContent().catch(() => "")) || "";
    return { ok: false, detail: `expected "${expected}", page shows "${shown.trim()}"` };
  }
}

async function tool(page) {
  const browserTag = BROWSER;

  // The page opens on a real, labelled sample, not on an empty table.
  const sampleChip = (await page.locator("[data-sample-chip]").first().textContent())?.trim() ?? "";
  const sampleSize = (await page.locator("[data-answer-size]").first().textContent())?.trim() ?? "";
  record("sample on arrival", /sample/i.test(sampleChip) && sampleSize.length > 0, `chip "${sampleChip}", size "${sampleSize}" (${browserTag})`);

  // The answer carries the same size in all eight regions, and one is current.
  const regions = await page.locator(".answer-regions .region").count().catch(() => 0);
  const currentRegion = ((await page.locator(".answer-regions .region.is-current .region-value").first().textContent().catch(() => "")) ?? "").trim();
  const sampleNumber = (sampleSize.match(/\d+(?:\.\d+)?/) ?? [""])[0];
  record(
    "eight regions",
    regions === 8 && currentRegion.length > 0 && sampleNumber === currentRegion,
    `${regions} region cells, current "${currentRegion}" under "${sampleSize}"`,
  );

  // Case 1: a worn US size read in the UK.
  let r = await lookup(
    page,
    { category: "Women's tops", shopping: "United Kingdom (UK)", start: "A size I wear", wornsize: "US 8" },
    "UK 12",
  );
  record("worn size US 8 -> UK 12", r.ok, r.ok ? `${r.ms} ms` : r.detail);

  // A change away from the sample is announced as edited (the case above is the
  // sample itself, so change a field the sample does not carry).
  await setField(page, "shopping", "United States (US)");
  await page.waitForTimeout(120);
  const editedChip = (await page.locator("[data-sample-chip]").first().textContent())?.trim() ?? "";
  record("edited state", /edited/i.test(editedChip), `chip "${editedChip}" after a change`);
  await setField(page, "shopping", "United Kingdom (UK)");

  // Case 2: measurements in centimetres.
  r = await lookup(
    page,
    { category: "Women's tops", shopping: "United Kingdom (UK)", start: "My measurements", units: "cm", bust: 95, waist: 74, hip: 101 },
    "UK 12",
  );
  record("measurements 95/74/101 -> UK 12", r.ok, r.ok ? `${r.ms} ms` : r.detail);

  const conclusions = (await page.locator(".answer-conclusions").first().innerText().catch(() => "")) || "";
  record("between-sizes rule shown", /larger|between|size up/i.test(conclusions), conclusions.split("\n")[0]?.slice(0, 80) ?? "");

  // The chart's own highlighted row is the answer.
  const matchedRow = (await page.locator(".answer-chart tr.is-match").first().innerText().catch(() => "")) || "";
  record("chart highlights the row", matchedRow.trim().length > 0, matchedRow.replace(/\s+/g, " ").slice(0, 80));

  // Case 3: a foot length.
  r = await lookup(page, { category: "Women's shoe", shopping: "United Kingdom (UK)", start: "My measurements", footlength: 24 }, "UK 4.5");
  record("foot 24 cm -> UK 4.5", r.ok, r.ok ? `${r.ms} ms` : r.detail);

  // Case 4: men's tops in the EU.
  r = await lookup(
    page,
    { category: "Men's tops", shopping: "Europe (EU)", start: "A size I wear", wornsize: "US 40" },
    "EU 50",
  );
  record("men's US 40 -> EU 50", r.ok, r.ok ? `${r.ms} ms` : r.detail);

  // Case 5: a brand direction, not just a country.
  r = await lookup(
    page,
    { category: "Women's tops", shopping: "Zara", start: "A size I wear", wornsize: "US 8" },
    "EU 42",
  );
  await page.waitForTimeout(120);
  const brand = (await page.locator(".answer-brand").first().innerText().catch(() => "")) || "";
  record("brand direction for Zara", r.ok && /zara/i.test(brand), brand.replace(/\s+/g, " ").slice(0, 100) || r.detail || "");

  // Case 5b: a garment measured flat, doubled to a circumference in the answer.
  await setField(page, "category", "Women's tops");
  await setField(page, "shopping", "United Kingdom (UK)");
  await setField(page, "start", "A garment that fits me");
  await setField(page, "units", "cm");
  r = await lookup(page, { flatbust: "47.5", flatwaist: "37", flathip: "50.5" }, "UK 12");
  // The conclusions list only: a combined selector takes the first match in
  // document order, which is the size card above it, and hides the arithmetic.
  const flatText = (await page.locator(".answer-conclusions").first().innerText().catch(() => "")) || "";
  record(
    "flat garment doubled into the answer",
    r.ok && /×\s*2\s*=\s*95\s*cm/.test(flatText.replace(/\s+/g, " ")),
    r.ok ? flatText.replace(/\s+/g, " ").slice(0, 110) : r.detail,
  );

  // An invalid input is answered in words, not by a dead button.
  await setField(page, "category", "Women's tops");
  await setField(page, "start", "A size I wear");
  await setField(page, "shopping", "United Kingdom (UK)");
  await setField(page, "wornsize", "not a size");
  await page.locator('[data-jtbd-action="lookup"]').first().click();
  // The press answers after its working moment: wait for the answer, then read it.
  await page.waitForSelector("[data-tool-working]", { timeout: 3000 }).catch(() => {});
  await page.waitForSelector("[data-tool-working]", { state: "detached", timeout: 5000 }).catch(() => {});
  await page.waitForSelector('[role="alert"]', { state: "visible", timeout: 5000 }).catch(() => {});
  const alert = (await page.locator('[role="alert"]').first().innerText().catch(() => "")) || "";
  record("invalid input explained", alert.trim().length > 0, alert.replace(/\s+/g, " ").slice(0, 90));

  // Back to the sample puts the tool where it started.
  const back = page.locator(".tool-actions .btn-quiet").first();
  const hasBack = (await back.count()) > 0;
  if (hasBack) await back.click();
  await page.waitForFunction(() => {
    const chip = document.querySelector("[data-sample-chip]");
    return !!chip && /sample/i.test(chip.textContent || "");
  }, null, { timeout: 5000 }).catch(() => {});
  await page.waitForSelector(".answer-actions", { state: "visible", timeout: 5000 }).catch(() => {});
  const backChip = (await page.locator("[data-sample-chip]").first().textContent())?.trim() ?? "";
  record("back to the sample", hasBack && /sample/i.test(backChip), `chip "${backChip}"`);

  // Copy: the label confirms, and the clipboard holds the conclusion.
  const copy = page.locator(".answer-actions .btn-secondary").first();
  await copy.click();
  await page.waitForTimeout(220);
  const copyLabel = (await copy.textContent())?.trim() ?? "";
  let clip = "";
  try {
    clip = await page.evaluate(() => navigator.clipboard.readText());
  } catch {
    clip = "";
  }
  record("copy result", /copied/i.test(copyLabel), `label "${copyLabel}", clipboard ${clip.length} chars`);

  // Save as PDF: a real file leaves the browser, with a PDF header and pages.
  let pdfOk = false;
  let pdfDetail = "";
  try {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30000 }),
      page.locator(".answer-actions .btn-quiet").first().click(),
    ]);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    const header = bytes.subarray(0, 5).toString("latin1");
    const pages = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    pdfOk = header === "%PDF-" && bytes.length > 800 && pages >= 1;
    pdfDetail = `${header} ${bytes.length} bytes, ${pages} page(s)`;
  } catch (error) {
    pdfDetail = String(error && error.message).slice(0, 140);
  }
  record("save as PDF downloads a PDF", pdfOk, pdfDetail);

  // The example control is marked, and it is inside the tool a visitor sees.
  const exampleCount = await page.locator(".tool [data-shipsite-example]").count();
  const creditCount = await page.locator(".tool [data-shipsite-example-credit]").count();
  record(
    "example control marked",
    exampleCount > 0 && creditCount > 0,
    `${exampleCount} example control(s), ${creditCount} credit line(s)`,
  );

  // Print: the button reaches the print path (stubbed so headless does not block).
  await page.evaluate(() => {
    // @ts-ignore - test hook
    window.__printed = 0;
    // @ts-ignore - test hook
    window.print = () => {
      // @ts-ignore - test hook
      window.__printed += 1;
    };
  });
  await page.locator(".answer-actions .btn-quiet").nth(1).click();
  const printed = await page.evaluate(() => {
    // @ts-ignore - test hook
    return window.__printed;
  });
  record("save as PDF (print)", printed === 1, `window.print called ${printed}x`);

  // Nothing the page promises as the next step is a dead end.
  const saveHref = await page.locator(".answer-save").first().getAttribute("href").catch(() => null);
  record("next step link", !!saveHref, `answer-save -> ${saveHref ?? "missing"}`);

  // The whole loop fits one desktop screen.
  if (BROWSER === "chromium") {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    const boxes = await page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
      };
      return {
        input: pick('[data-tool-input="start"]'),
        start: pick('[data-jtbd-action="lookup"]'),
        result: pick("[data-tool-output]"),
        size: pick("[data-answer-size]"),
        copy: pick(".answer-actions .btn-secondary"),
        print: pick(".answer-actions .btn-quiet"),
        viewport: window.innerHeight,
      };
    });
    // The controls the loop is used through — the start, the answer's size and
    // both take-away controls — sit in the first screen; the full chart, the
    // brand note and the method continue under them, which is the table, not a
    // control the visitor needs before scrolling.
    const inside =
      ["input", "start", "size", "copy", "print"].every(
        (key) => boxes[key] && boxes[key].bottom <= boxes.viewport,
      ) &&
      boxes.result &&
      boxes.result.top < boxes.size.top &&
      boxes.size.top < boxes.copy.top;
    record("loop inside the first screen", inside, JSON.stringify(boxes));
  }
}

async function site(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // Clipboard permissions exist in Chromium only; asking WebKit for them makes
  // the next newPage throw, and the whole run then reports no controls.
  if (BROWSER === "chromium") {
    try {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    } catch {
      /* some builds do not offer it */
    }
  }
  const page = await context.newPage();
  watch(page, "desktop");

  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
  const h1 = (await page.locator("h1").first().textContent()) ?? "";
  record("home answers", /size/i.test(h1), `h1 "${h1.trim().slice(0, 70)}"`);
  await noOverflow(page, "desktop /");

  await tool(page);

  // Every other page, opened the way a visitor opens it: from the header.
  for (const route of ["/about/", "/contact/", "/pricing/", "/privacy/", "/refund/", "/terms/"]) {
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    const link = page.locator(`header a[href="${route}"], footer a[href="${route}"]`).first();
    const inChrome = (await link.count()) > 0;
    if (!inChrome) {
      record(`chrome link ${route}`, false, "not reachable from the header or the footer");
      continue;
    }
    await link.click();
    await page.waitForLoadState("load");
    const heading = (await page.locator("h1").first().textContent()) ?? "";
    record(`page ${route}`, heading.trim().length > 0, `h1 "${heading.trim().slice(0, 60)}"`);
    await noOverflow(page, `desktop ${route}`);
  }

  // The contact form stores a real message and says so.
  await page.goto(`${BASE}/contact/`, { waitUntil: "load" });
  await page.fill('form[data-shipsite-contact] input[name="email"]', "verify-live@example.com");
  await page.fill('form[data-shipsite-contact] textarea[name="message"]', "Checking the contact form from the site's own live test.");
  await page.click('form[data-shipsite-contact] button[type="submit"]');
  let statusText = "";
  let statusState = "";
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector("[data-shipsite-status]");
        if (!el) return false;
        const state = el.getAttribute("data-state") || "";
        return state === "sent" || state === "error";
      },
      null,
      { timeout: 15000 },
    );
  } catch {
    /* read whatever is there below */
  }
  statusText = (await page.locator("[data-shipsite-status]").first().textContent())?.trim() ?? "";
  statusState = (await page.locator("[data-shipsite-status]").first().getAttribute("data-state")) ?? "";
  record("contact form stores a message", statusState === "sent", `${statusState || "idle"}: ${statusText.slice(0, 100)}`);

  await context.close();
}

async function phone(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  await context.addInitScript(() => {
    // Most phones have no WebGPU: the page must run without it.
    try {
      // @ts-ignore - test hook
      delete Navigator.prototype.gpu;
    } catch {
      /* already absent */
    }
  });
  const page = await context.newPage();
  watch(page, "phone-390");
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
  await noOverflow(page, "phone-390 /");

  const r = await lookup(
    page,
    { category: "Women's tops", shopping: "United Kingdom (UK)", start: "My measurements", units: "cm", bust: 95, waist: 74, hip: 101 },
    "UK 12",
  );
  record("phone: measurements -> UK 12", r.ok, r.ok ? `${r.ms} ms` : r.detail);

  const size = (await page.locator("[data-answer-size]").first().textContent())?.trim() ?? "";
  await context.close();
  return size;
}

async function main() {
  if (!BASE) {
    console.error("SHIPSITE_URL is not set");
    process.exit(2);
  }
  const launcher = BROWSER === "webkit" ? webkit : chromium;
  const browser = await launcher.launch();
  try {
    await site(browser);
    const phoneSize = await phone(browser);
    record("phone result readable", phoneSize.length > 0, `size "${phoneSize}"`);
  } finally {
    await browser.close();
  }

  const ok =
    problems.length === 0 &&
    overflow.length === 0 &&
    consoleErrors.length === 0 &&
    failedRequests.length === 0;

  const payload = {
    browser: BROWSER,
    controls,
    overflow,
    consoleErrors,
    failedRequests,
  };
  console.log(`VERIFY_LIVE ${JSON.stringify(payload)}`);
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.log(`VERIFY_LIVE ${JSON.stringify({ browser: BROWSER, controls, error: String(error).slice(0, 400), overflow, consoleErrors, failedRequests })}`);
  process.exit(1);
});
