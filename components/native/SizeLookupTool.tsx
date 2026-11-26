"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { UiStrings } from "../../lib/ui-strings";
import {
  BRANDS,
  CATEGORIES,
  FLAT_START,
  MARKET_OPTIONS,
  MARKETS,
  findCategory,
  lookupSize,
  type LookupAnswer,
} from "../../lib/size-lookup";

/** Categories whose chart is read from a circumference, so a flat width works. */
const FLAT_MEASURES = new Set(["bust", "waist", "hip"]);

const SAMPLE = {
  category: "Women's tops",
  shopping: "United Kingdom (UK)",
  start: "A size I wear",
  wornSize: "US 8",
  bust: "95",
  waist: "74",
  hip: "101",
  foot: "",
  underband: "",
  height: "",
  finger: "",
  flatBust: "",
  flatWaist: "",
  flatHip: "",
  units: "cm",
};

type Fields = typeof SAMPLE;

const MEASURE_FIELD: Record<string, { key: keyof Fields; label: keyof UiStrings }> = {
  underband: { key: "underband", label: "toolUnderband" },
  height: { key: "height", label: "toolHeight" },
  finger: { key: "finger", label: "toolFinger" },
};

export function SizeLookupTool({ t }: { t: UiStrings }) {
  const [fields, setFields] = useState<Fields>(SAMPLE);
  const [answer, setAnswer] = useState<LookupAnswer | null>(() =>
    lookupSize(SAMPLE, { cm: "cm", in: "in" }) as LookupAnswer,
  );
  const [error, setError] = useState<keyof UiStrings | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<"success" | "error">("success");
  // The lookup is quick, but the press still answers with a working moment:
  // the visitor sees the job named and a bar before the answer lands.
  const [working, setWorking] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 520px)");
    const sync = () => setPhone(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const category = findCategory(fields.category) ?? CATEGORIES[0];
  const extraField = category.measure in MEASURE_FIELD ? MEASURE_FIELD[category.measure] : null;
  const edited = JSON.stringify(fields) !== JSON.stringify(SAMPLE);

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function resetToSample() {
    setFields(SAMPLE);
    const result = lookupSize(SAMPLE, { cm: "cm", in: "in" });
    setAnswer(result.ok ? result : null);
    setError(null);
    setState("success");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setError(null);
    window.setTimeout(() => {
      finishLookup();
    }, 320);
  }

  function finishLookup() {
    const result = lookupSize(fields, { cm: "cm", in: "in" });
    setWorking(false);
    if (result.ok) {
      setAnswer(result);
      setError(null);
      setState("success");
      if (window.matchMedia("(max-width: 520px)").matches) {
        window.requestAnimationFrame(() => {
          outputRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }
    } else {
      setError(
        result.error === "category"
          ? "toolErrorCategory"
          : result.error === "out-of-range"
            ? "toolErrorRange"
            : "toolErrorNoInput",
      );
      // A failed press leaves no stale answer behind it.
      setAnswer(null);
      setState("error");
    }
  }

  async function copyResult() {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer.plain);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      const area = document.createElement("textarea");
      area.value = answer.plain;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }

  async function savePdf() {
    if (!answer) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const clean = (value: string) =>
      value
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[\u2013\u2014\u00b7]/g, "-")
        .replace(/[^\x00-\xff]/g, "")
        .trim();
    const margin = 48;
    let y = 64;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Size Chart", margin, y);
    y += 32;
    doc.setFontSize(26);
    doc.text(clean(answer.size), margin, y);
    y += 30;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    for (const raw of answer.plain.split("\n")) {
      const lines = doc.splitTextToSize(clean(raw).length > 0 ? clean(raw) : " ", 500);
      for (const line of lines) {
        if (y > 780) {
          doc.addPage();
          y = 64;
        }
        doc.text(line, margin, y);
        y += 16;
      }
      y += 4;
    }
    doc.save(`size-chart-${clean(answer.size).replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  const regionCells = useMemo(() => {
    if (!answer) return [];
    const row = answer.regions;
    return MARKETS.map((market) => {
      const entry = row.find((r) => r.market === market);
      return { market, label: entry ? entry.label : "—", current: market === answer.market };
    });
  }, [answer]);

  return (
    <div className="tool-wrap">
    <section
      className="tool"
      data-capability="size-lookup"
      data-operation="lookup"
      data-state={working ? "working" : state}
      aria-busy={working}
      aria-labelledby="tool-title"
    >
      <div className="tool-head">
        <h2 id="tool-title">{t.toolTitle}</h2>
      </div>

      <div className="tool-body">
        <form className="tool-form" onSubmit={submit} noValidate>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">{t.toolCategory}</span>
              <span className="select-wrap">
                <select
                  name="category"
                  data-tool-input="category"
                  value={fields.category}
                  onChange={(e) => {
                    const next = e.target.value;
                    set("category", next);
                    // A flat garment only reads against a circumference chart:
                    // shoes and rings fall back to the body measurement.
                    const nextCategory = findCategory(next);
                    if (fields.start === FLAT_START && nextCategory && !FLAT_MEASURES.has(nextCategory.measure)) {
                      set("start", "My measurements");
                    }
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <label className="field">
              <span className="field-label">{t.toolShopping}</span>
              <span className="select-wrap">
                <select
                  name="shopping"
                  data-tool-input="shopping"
                  value={fields.shopping}
                  onChange={(e) => set("shopping", e.target.value)}
                >
                  <optgroup label="Countries">
                    {MARKET_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Brands">
                    {BRANDS.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </span>
            </label>

            <label className="field">
              <span className="field-label">{t.toolStart}</span>
              <span className="select-wrap">
                <select
                  name="start"
                  data-tool-input="start"
                  value={fields.start}
                  onChange={(e) => set("start", e.target.value)}
                >
                  <option value="A size I wear">{t.toolStartWorn}</option>
                  <option value="My measurements">{t.toolStartMeasure}</option>
                  {FLAT_MEASURES.has(category.measure) ? (
                    <option value={FLAT_START}>{t.toolStartFlat}</option>
                  ) : null}
                </select>
              </span>
            </label>

            <label className="field">
              <span className="field-label">{t.toolUnits}</span>
              <span className="select-wrap">
                <select
                  name="units"
                  data-tool-input="units"
                  value={fields.units}
                  onChange={(e) => set("units", e.target.value)}
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </span>
            </label>

            {fields.start === "A size I wear" ? (
            <label className="field">
                <span className="field-label">{t.toolWornSize}</span>
                <input
                  name="wornsize"
                  data-tool-input="wornsize"
                  type="text"
                  inputMode="text"
                  placeholder="US 8"
                  value={fields.wornSize}
                  onChange={(e) => set("wornSize", e.target.value)}
                />
              </label>
            ) : null}


            {fields.start === FLAT_START ? (
              <>
                <label className="field">
                  <span className="field-label">{t.toolFlatBust}</span>
                  <input
                    name="flatbust"
                    data-tool-input="flatbust"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={fields.flatBust}
                    onChange={(e) => set("flatBust", e.target.value)}
                  />
                </label>
                {category.extras.includes("waist") || category.measure === "waist" ? (
                  <label className="field">
                    <span className="field-label">{t.toolFlatWaist}</span>
                    <input
                      name="flatwaist"
                      data-tool-input="flatwaist"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      value={fields.flatWaist}
                      onChange={(e) => set("flatWaist", e.target.value)}
                    />
                  </label>
                ) : null}
                {category.extras.includes("hip") ? (
                  <label className="field">
                    <span className="field-label">{t.toolFlatHip}</span>
                    <input
                      name="flathip"
                      data-tool-input="flathip"
                      type="number"
                      inputMode="decimal"
                      min={1}
                      value={fields.flatHip}
                      onChange={(e) => set("flatHip", e.target.value)}
                    />
                  </label>
                ) : null}
                <p className="tool-hint">{t.toolFlatHint}</p>
              </>
            ) : null}

            {fields.start === "My measurements" ? (
              <>
            {category.measure === "bust" || category.measure === "underband" || category.measure === "waist" ? (
              <label className="field">
                <span className="field-label">{t.toolBust}</span>
                <input
                  name="bust"
                  data-tool-input="bust"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={fields.bust}
                  onChange={(e) => set("bust", e.target.value)}
                />
              </label>
            ) : null}

            {category.measure === "waist" || category.extras.includes("waist") ? (
              <label className="field">
                <span className="field-label">{t.toolWaist}</span>
                <input
                  name="waist"
                  data-tool-input="waist"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={fields.waist}
                  onChange={(e) => set("waist", e.target.value)}
                />
              </label>
            ) : null}

            {category.extras.includes("hip") ? (
              <label className="field">
                <span className="field-label">{t.toolHip}</span>
                <input
                  name="hip"
                  data-tool-input="hip"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={fields.hip}
                  onChange={(e) => set("hip", e.target.value)}
                />
              </label>
            ) : null}

            {category.measure === "foot" ? (
              <label className="field">
                <span className="field-label">{t.toolFoot}</span>
                <input
                  name="footlength"
                  data-tool-input="footlength"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={fields.foot}
                  onChange={(e) => set("foot", e.target.value)}
                />
              </label>
            ) : null}

            {extraField ? (
              <label className="field">
                <span className="field-label">{t[extraField.label]}</span>
                <input
                  name={extraField.key}
                  data-tool-input={extraField.key}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={fields[extraField.key]}
                  onChange={(e) => set(extraField.key, e.target.value)}
                />
              </label>
            ) : null}
              </>
            ) : null}
          </div>

          <div className="tool-actions">
            <button
              disabled={working}
              aria-busy={working} type="submit" className="btn btn-primary" data-jtbd-action="lookup">
              {working ? t.toolWorking : t.toolStartAction}
            </button>
            <button
              type="button"
              className="btn-quiet"
              data-shipsite-example
              onClick={resetToSample}
            >
              {edited ? t.toolBackToSample : t.toolLoadSample}
            </button>
          </div>

          <p className="tool-credit" data-shipsite-example-credit>
            {t.toolSampleCredit}
          </p>
        </form>

        {working ? (
          <div
            className="tool-working"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.toolWorking}
            aria-valuetext={t.toolWorking}
            data-tool-working
          >
            <p className="tool-working-text">{t.toolWorking}</p>
            <span className="tool-working-bar" />
          </div>
        ) : null}

        <div className="tool-answer" data-tool-output ref={outputRef}>
          {error ? (
            <div className="answer-error" role="alert">
              <p className="answer-error-text">{t[error]}</p>
              <p className="answer-error-fix">{t.toolFixIt}</p>
            </div>
          ) : null}

          {answer ? (
            <>
              <div className="answer-top">
                <p className="answer-eyebrow">{t.toolYourSize}</p>
                <p className="answer-size" data-answer-size>
                  {answer.size}
                </p>
                <p className="answer-chips">
                  {answer.sizeLabel ? <span className="answer-label">{answer.sizeLabel}</span> : null}
                  <span className="chip chip-sample" data-sample-chip={edited ? "edited" : "sample"}>
                    {edited ? t.toolEditedChip : t.toolSampleChip}
                  </span>
                </p>
              </div>

              <ul className="answer-conclusions">
                {answer.conclusions.map((c) => (
                  <li key={c.label} className={c.emphasis ? "is-emphasis" : undefined}>
                    {c.text}
                  </li>
                ))}
              </ul>

              <div className="answer-regions" aria-label={t.toolRegions}>
                {regionCells.map((cell) => (
                  <div key={cell.market} className={cell.current ? "region is-current" : "region"}>
                    <span className="region-market">{cell.market}</span>
                    <span className="region-value">{cell.label}</span>
                  </div>
                ))}
              </div>

              <table className="answer-chart">
                <caption>{answer.chart.heading}</caption>
                <thead>
                  <tr>
                    {answer.chart.columns.map((c) => (
                      <th key={c} scope="col">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {answer.chart.rows.map((row, index) => (
                    <tr key={index} className={row.match ? "is-match" : undefined}>
                      {row.cells.map((cell, i) =>
                        i === 0 ? (
                          <th key={i} scope="row">
                            {cell}
                          </th>
                        ) : (
                          <td key={i}>{cell}</td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {answer.brand ? (
                <div className="answer-brand">
                  <p className="answer-brand-title">{t.toolBrand}</p>
                  <p>{answer.brand.note}</p>
                  <p className="answer-source">
                    <a href={answer.brand.sourceUrl} rel="noopener noreferrer">
                      {answer.brand.sourceLabel}
                    </a>
                    , read {answer.brand.checkedAt}
                  </p>
                </div>
              ) : null}

              <div className="answer-method">
                <p className="answer-brand-title">{t.toolMethod}</p>
                <ul>
                  {answer.method.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="answer-actions">
                <button type="button" className="btn btn-secondary" onClick={copyResult}>
                  {copied ? t.toolCopied : t.toolCopy}
                </button>
                <button type="button" className="btn-quiet" onClick={savePdf}>
                  {t.toolPdf}
                </button>
                <button type="button" className="btn-quiet" onClick={() => window.print()}>
                  {t.toolPrint}
                </button>
                <a className="answer-save" href="/pricing/">
                  {t.toolSave}
                </a>
              </div>
            </>
          ) : (
            <p className="answer-empty">{t.toolResultEmpty}</p>
          )}
        </div>
      </div>

    </section>
    <p className="tool-note">
      {t.toolLede} {t.toolMeasureHint}
    </p>
    </div>
  );
}

export default SizeLookupTool;
