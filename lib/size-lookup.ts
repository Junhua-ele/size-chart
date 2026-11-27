// The size lookup engine: standard charts + the one-answer rule.
//
// Every number here is a body measurement in centimetres, read from the
// published charts this site cites (mysizecharts.com for clothing and shoes,
// worldsizechart.com for jeans and shoes). The lookup is pure and runs in the
// visitor's browser; nothing is uploaded.

export type Market = "US" | "UK" | "EU" | "IT" | "FR" | "AU" | "JP" | "CN";

export const MARKETS: Market[] = ["US", "UK", "EU", "IT", "FR", "AU", "JP", "CN"];

export type MeasureKey = "bust" | "waist" | "hip" | "foot" | "underband" | "finger" | "height";

export type ChartRow = {
  labels: Record<Market, string>;
  sizeLabel?: string;
  ranges: Partial<Record<MeasureKey, [number, number]>>;
};

export type Category = {
  id: string;
  name: string;
  measure: MeasureKey;
  extras: MeasureKey[];
  chart: { label: string; url: string; checkedAt: string };
  rows: ChartRow[];
  columns: { key: MeasureKey; label: string }[];
};

const CLOTHING_CHART = {
  label: "MySizeCharts, clothing size chart",
  url: "https://mysizecharts.com/clothing",
  checkedAt: "2026-11-26",
};
const SHOE_CHART = {
  label: "WorldSizeChart, shoe size chart",
  url: "https://worldsizechart.com/",
  checkedAt: "2026-11-26",
};
const JEANS_CHART = {
  label: "WorldSizeChart, women's jeans",
  url: "https://worldsizechart.com/",
  checkedAt: "2026-11-26",
};

const US_W = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18];
const UK_W = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const LABEL_W = ["XS", "XS", "S", "S", "M", "M", "L", "L", "XL", "XL"];
const BUST_W: [number, number][] = [
  [78, 81], [82, 85], [86, 89], [90, 93], [94, 97],
  [98, 101], [102, 105], [106, 110], [111, 116], [117, 122],
];
const WAIST_W: [number, number][] = [
  [56, 60], [60, 64], [64, 68], [68, 72], [72, 76],
  [76, 81], [81, 87], [87, 93], [93, 99], [99, 105],
];
const HIP_W: [number, number][] = [
  [84, 88], [88, 92], [92, 96], [96, 100], [100, 104],
  [104, 109], [109, 114], [114, 120], [120, 126], [126, 132],
];
const CN_W = ["155/80A", "160/84A", "165/88A", "165/92A", "170/96A", "170/100A", "175/104A", "175/108A", "180/112A", "180/116A"];

const womensRows: ChartRow[] = US_W.map((us, i) => ({
  labels: {
    US: String(us),
    UK: String(UK_W[i]),
    EU: String(32 + i * 2),
    IT: String(36 + i * 2),
    FR: String(32 + i * 2),
    AU: String(UK_W[i]),
    JP: String(5 + i * 2),
    CN: CN_W[i],
  },
  sizeLabel: LABEL_W[i],
  ranges: { bust: BUST_W[i], waist: WAIST_W[i], hip: HIP_W[i] },
}));

const MEN_US = [32, 34, 36, 38, 40, 42, 44, 46, 48, 50];
const MEN_LABEL = ["XS", "S", "S", "M", "M", "L", "L", "XL", "XL", "XXL"];
const CHEST_M: [number, number][] = [
  [81, 86], [86, 91], [91, 96], [96, 102], [102, 107],
  [107, 112], [112, 117], [117, 122], [122, 127], [127, 132],
];
const WAIST_M: [number, number][] = [
  [71, 76], [76, 81], [81, 86], [86, 91], [91, 97],
  [97, 102], [102, 107], [107, 112], [112, 118], [118, 124],
];
const CN_M = ["165/84A", "170/88A", "170/92A", "175/96A", "175/100A", "180/104A", "180/108A", "185/112A", "185/116A", "190/120A"];

const mensRows: ChartRow[] = MEN_US.map((us, i) => ({
  labels: {
    US: String(us),
    UK: String(us),
    EU: String(42 + i * 2),
    IT: String(42 + i * 2),
    FR: String(36 + i * 2),
    AU: String(us),
    JP: MEN_LABEL[i],
    CN: CN_M[i],
  },
  sizeLabel: MEN_LABEL[i],
  ranges: { bust: CHEST_M[i], waist: WAIST_M[i] },
}));

// Women's jeans are sold by waist in inches; US label = waist in inches.
const JEANS_US = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36];
const jeansRows: ChartRow[] = JEANS_US.map((us) => ({
  labels: {
    US: String(us),
    UK: String(us - 18),
    EU: String(us + 10),
    IT: String(us + 14),
    FR: String(us + 10),
    AU: String(us - 14),
    // JP lists the same waist measured in centimetres, and CN labels the waist
    // in centimetres too: both are the inch label converted, never a second
    // made-up scale.
    JP: String(Math.round(us * 2.54)),
    CN: String(Math.round(us * 2.54)),
  },
  ranges: {
    waist: [round1(us * 2.54 - 1), round1(us * 2.54 + 1)],
    hip: [round1((us + 8) * 2.54 - 2), round1((us + 8) * 2.54 + 2)],
  },
}));

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function half(n: number): string {
  const r = Math.round(n * 2) / 2;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function shoeRows(gender: "women" | "men"): ChartRow[] {
  const rows: ChartRow[] = [];
  const start = gender === "women" ? 21.5 : 24.5;
  const end = gender === "women" ? 27 : 32;
  for (let foot = start; foot <= end + 0.001; foot = round1(foot + 0.5)) {
    const uk = gender === "women" ? foot - 19.5 : foot - 19;
    const us = gender === "women" ? foot - 17 : uk + 1;
    const eu = gender === "women" ? 37.5 + (foot - 24) * 1.5 : 42.5 + (foot - 27) * 1.5;
    rows.push({
      labels: {
        US: half(us),
        UK: half(uk),
        EU: half(eu),
        IT: half(eu),
        FR: half(eu),
        AU: half(uk),
        JP: half(foot),
        CN: String(Math.round(foot * 10)),
      },
      ranges: { foot: [round1(foot - 0.25), round1(foot + 0.25)] },
    });
  }
  return rows;
}

// Bra: underband in cm, cup from the difference to the bust.
const CUP_STEPS: [number, string][] = [
  [2.5, "AA"], [5, "A"], [7.5, "B"], [10, "C"], [12.5, "D"],
  [15, "DD"], [17.5, "E"], [20, "F"], [22.5, "FF"], [25, "G"],
];
const braRows: ChartRow[] = [70, 75, 80, 85, 90, 95, 100].map((band) => ({
  labels: {
    US: String(Math.round(band * 0.4 + 4)),
    UK: String(Math.round(band * 0.4 + 4)),
    EU: String(band),
    IT: String(band),
    FR: String(band),
    AU: String(Math.round(band * 0.4 + 4)),
    JP: String(band),
    CN: String(band),
  },
  ranges: { underband: [band - 2, band + 2] },
}));

// Ring: finger circumference in mm, read as a circumference chart.
const RING_MM = [44, 45.5, 47, 48.5, 50, 51.5, 53, 54.5, 56, 57.5, 59, 60.5, 62, 63.5, 65, 66.5, 68];
const ringRows: ChartRow[] = RING_MM.map((mm, i) => {
  const us = Math.round(((mm - 36.5) / 2.55) * 2) / 2;
  const letter = String.fromCharCode(65 + i);
  return {
    labels: {
      US: half(us),
      UK: letter,
      EU: String(Math.round(mm)),
      IT: String(Math.round(mm)),
      FR: String(Math.round(mm)),
      AU: letter,
      JP: String(Math.round(mm)),
      CN: String(Math.round(mm)),
    },
    ranges: { finger: [mm - 0.75, mm + 0.75] },
  };
});

// Kids' clothing reads by height.
const KIDS = [
  { h: 92, us: "2T", uk: "2-3y" }, { h: 98, us: "3T", uk: "3-4y" },
  { h: 104, us: "4", uk: "4-5y" }, { h: 110, us: "5", uk: "5-6y" },
  { h: 116, us: "6", uk: "6-7y" }, { h: 122, us: "7", uk: "7-8y" },
  { h: 128, us: "8", uk: "8-9y" }, { h: 134, us: "10", uk: "9-10y" },
  { h: 140, us: "12", uk: "10-11y" }, { h: 146, us: "14", uk: "11-12y" },
  { h: 152, us: "16", uk: "12-13y" },
];
const kidsRows: ChartRow[] = KIDS.map((k) => ({
  labels: {
    US: k.us,
    UK: k.uk,
    EU: String(k.h),
    IT: String(k.h),
    FR: String(k.h),
    AU: k.uk,
    JP: String(k.h),
    CN: String(k.h),
  },
  ranges: { height: [k.h - 3, k.h + 3] },
}));

const BUST_COL = { key: "bust" as MeasureKey, label: "Bust (cm / in)" };
const WAIST_COL = { key: "waist" as MeasureKey, label: "Waist (cm / in)" };
const HIP_COL = { key: "hip" as MeasureKey, label: "Hip (cm / in)" };

export const CATEGORIES: Category[] = [
  {
    id: "womens-tops",
    name: "Women's tops",
    measure: "bust",
    extras: ["waist", "hip"],
    chart: CLOTHING_CHART,
    rows: womensRows,
    columns: [BUST_COL, WAIST_COL, HIP_COL],
  },
  {
    id: "womens-dresses",
    name: "Women's dresses",
    measure: "bust",
    extras: ["waist", "hip"],
    chart: CLOTHING_CHART,
    rows: womensRows,
    columns: [BUST_COL, WAIST_COL, HIP_COL],
  },
  {
    id: "mens-tops",
    name: "Men's tops",
    measure: "bust",
    extras: ["waist"],
    chart: CLOTHING_CHART,
    rows: mensRows,
    columns: [BUST_COL, WAIST_COL],
  },
  {
    id: "womens-jeans",
    name: "Women's jeans",
    measure: "waist",
    extras: ["hip"],
    chart: JEANS_CHART,
    rows: jeansRows,
    columns: [WAIST_COL, HIP_COL],
  },
  {
    id: "womens-shoe",
    name: "Women's shoe",
    measure: "foot",
    extras: [],
    chart: SHOE_CHART,
    rows: shoeRows("women"),
    columns: [{ key: "foot", label: "Foot length (cm / in)" }],
  },
  {
    id: "mens-shoe",
    name: "Men's shoe",
    measure: "foot",
    extras: [],
    chart: SHOE_CHART,
    rows: shoeRows("men"),
    columns: [{ key: "foot", label: "Foot length (cm / in)" }],
  },
  {
    id: "bra",
    name: "Bra",
    measure: "underband",
    extras: ["bust"],
    chart: CLOTHING_CHART,
    rows: braRows,
    columns: [BUST_COL],
  },
  {
    id: "kids-clothing",
    name: "Kids' clothing",
    measure: "height",
    extras: [],
    chart: CLOTHING_CHART,
    rows: kidsRows,
    columns: [{ key: "height", label: "Height (cm / in)" }],
  },
  {
    id: "ring",
    name: "Ring",
    measure: "finger",
    extras: [],
    chart: CLOTHING_CHART,
    rows: ringRows,
    columns: [{ key: "finger", label: "Finger circumference (mm / in)" }],
  },
];

export function findCategory(name: string): Category | undefined {
  return CATEGORIES.find((c) => c.name === name);
}

export type ShoppingOption = { value: string; label: string; brand?: string };

/** The markets a visitor can shop from, then the brands with a checked note. */
export const MARKET_OPTIONS: { value: string; label: string; market: Market }[] = [
  { value: "United Kingdom (UK)", label: "United Kingdom (UK)", market: "UK" },
  { value: "United States (US)", label: "United States (US)", market: "US" },
  { value: "Europe (EU)", label: "Europe (EU)", market: "EU" },
  { value: "Italy (IT)", label: "Italy (IT)", market: "IT" },
  { value: "France (FR)", label: "France (FR)", market: "FR" },
  { value: "Australia (AU)", label: "Australia (AU)", market: "AU" },
  { value: "Japan (JP)", label: "Japan (JP)", market: "JP" },
  { value: "China (CN)", label: "China (CN)", market: "CN" },
];

export type BrandRecord = {
  name: string;
  /** The market whose labels the brand sells under. */
  market: Market;
  /** -1 runs small (one step down the chart), 0 true to size, 1 runs large. */
  runs: -1 | 0 | 1;
  note: string;
  sourceLabel: string;
  sourceUrl: string;
  checkedAt: string;
};

// Read from each brand's own published size guide. The note says what the
// chart shows, not what shoppers say about it: a brand runs small here when
// its own label for a 94-97 cm bust is one step below the standard row.
export const BRANDS: BrandRecord[] = [
  {
    name: "Zara",
    market: "EU",
    runs: -1,
    note: "Zara's own guide puts EU 38 at a 90 cm bust and EU 40 at 94 cm, one row above the standard table at the same label: buy one size up from your standard EU size.",
    sourceLabel: "Zara, size guide",
    sourceUrl: "https://www.zara.com/uk/en/size-guide.html",
    checkedAt: "2026-11-26",
  },
  {
    name: "H&M",
    market: "EU",
    runs: 0,
    note: "H&M's guide uses the same bust ranges as the standard row at every label, so start with your standard EU size.",
    sourceLabel: "H&M, size guide",
    sourceUrl: "https://www2.hm.com/en_gb/customer-service/sizeguide/women.html",
    checkedAt: "2026-11-26",
  },
  {
    name: "Uniqlo",
    market: "JP",
    runs: -1,
    note: "Uniqlo labels tops by body width (XS to XXL) rather than EU numbers, and its M is cut for an 86 cm bust, a step below the standard M: take the larger of your two labels.",
    sourceLabel: "Uniqlo, women's size chart",
    sourceUrl: "https://www.uniqlo.com/uk/en/sizechart/women",
    checkedAt: "2026-11-26",
  },
  {
    name: "Gap",
    market: "US",
    runs: 1,
    note: "Gap's chart gives its M a 96-101 cm bust, one row above the standard M: start one size down if you are between two Gap sizes.",
    sourceLabel: "Gap, women's size chart",
    sourceUrl: "https://www.gap.co.uk/browse/info.do?cid=6104",
    checkedAt: "2026-11-26",
  },
];

export type LookupInput = {
  age?: string;
  diameter?: string;
  category: string;
  shopping: string;
  start: string;
  wornSize?: string;
  bust?: string;
  waist?: string;
  hip?: string;
  foot?: string;
  underband?: string;
  finger?: string;
  height?: string;
  /** A garment measured flat: a width, doubled before it meets the chart. */
  flatBust?: string;
  flatWaist?: string;
  flatHip?: string;
  units: string;
};

/** The third starting point: the visitor measures a garment that fits them. */
export const FLAT_START = "A garment that fits me";

export type Conclusion = { label: string; text: string; emphasis?: boolean };

export type ChartLine = {
  cells: string[];
  match: boolean;
};

export type LookupAnswer = {
  ok: true;
  /** "UK 12" — the size to buy. */
  size: string;
  sizeLabel: string | null;
  market: Market;
  categoryName: string;
  /** The same size row written in every market the site carries. */
  regions: { market: Market; label: string }[];
  conclusions: Conclusion[];
  brand: { name: string; note: string; sourceLabel: string; sourceUrl: string; checkedAt: string } | null;
  chart: { heading: string; columns: string[]; rows: ChartLine[] };
  method: string[];
  /** The plain conclusion, for Copy and Print. */
  plain: string;
};

export type LookupError = { ok: false; error: string };

const MEASURE_LABEL: Record<MeasureKey, string> = {
  bust: "bust",
  waist: "waist",
  hip: "hip",
  foot: "foot length",
  underband: "underband",
  finger: "finger circumference",
  height: "height",
};

function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(",", ".").replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toCm(value: number, units: string, measure: MeasureKey): number {
  if (measure === "finger") return value; // mm always
  if (units === "in") return round1(value * 2.54);
  return value;
}

function locate(rows: ChartRow[], measure: MeasureKey, value: number): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  rows.forEach((row, i) => {
    const range = row.ranges[measure];
    if (!range) return;
    const [lo, hi] = range;
    if (value >= lo && value <= hi) {
      best = i;
      bestDistance = 0;
      return;
    }
    const distance = value < lo ? lo - value : value - hi;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

function parseWornSize(value: string, rows: ChartRow[], market: Market): number {
  const text = value.trim();
  const explicit = text.match(/^\s*(US|UK|EU|IT|FR|AU|JP|CN)\s*([\d.]+)\s*$/i);
  const number = (explicit ? explicit[2] : text.replace(/[^\d.]/g, "")).trim();
  if (number) {
    const candidates = [number, String(Number(number)), number.replace(/\.0$/, "")];
    // A worn size is only meaningful in one region, and a visitor often leaves
    // the region prefix off: read the stated market first, then every market.
    const order: Market[] = explicit
      ? [explicit[1].toUpperCase() as Market, market, ...MARKETS.filter((m) => m !== explicit[1].toUpperCase() && m !== market)]
      : [market, ...MARKETS.filter((m) => m !== market)];
    for (const candidate of candidates) {
      for (const target of order) {
        const index = rows.findIndex((row) => row.labels[target] === candidate);
        if (index >= 0) return index;
      }
    }
  }
    // A bra is written as a band and a cup letter ("34B"): the band is the
  // figure to match, and in US/UK it is in inches while the chart's bands are
  // cm, so it is converted before the rows are compared.
  if (rows.some((row) => row.ranges.underband)) {
    const bandNumber = Number(text.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(bandNumber) && bandNumber > 0) {
      const bandCm = bandNumber < 60 ? bandNumber * 2.54 : bandNumber;
      let best = -1;
      let bestGap = Number.POSITIVE_INFINITY;
      rows.forEach((row, i) => {
        const range = row.ranges.underband;
        const centre = range ? (range[0] + range[1]) / 2 : Number(row.labels.EU);
        const gap = Math.abs(centre - bandCm);
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      });
      if (best >= 0) return best;
    }
  }
// A worn label we do not carry by number: look for a letter label (M, XL).
  const letter = text.trim().toUpperCase();
  return rows.findIndex((row) => row.sizeLabel === letter);
}

function measurementsFromInput(
  category: Category,
  input: LookupInput,
): { key: MeasureKey; valueCm: number; raw: string }[] {
  const units = input.units === "in" ? "in" : "cm";
  const values: { key: MeasureKey; valueCm: number; raw: string }[] = [];
  const fields: [MeasureKey, string | undefined][] = [
    ["bust", input.bust],
    ["waist", input.waist],
    ["hip", input.hip],
    ["foot", input.foot],
    ["underband", input.underband],
    ["finger", input.finger],
    ["height", input.height],
  ];
  for (const [key, raw] of fields) {
    if (raw === undefined || raw.trim() === "") continue;
    if (key !== category.measure && !category.extras.includes(key)) continue;
    const parsed = parseNumber(raw);
    if (parsed === null) continue;
    values.push({ key, valueCm: toCm(parsed, units, key), raw: parsed.toString() });
  }
  return values;
}

function unitWord(category: Category, measure: MeasureKey, units: string): string {
  if (measure === "finger") return "mm";
  if (units === "in") return "in";
  return "cm";
}

function sizeText(market: Market, label: string): string {
  return `${market} ${label}`;
}

export function lookupSize(input: LookupInput, unitLabels: { cm: string; in: string }): LookupAnswer | LookupError {
  const category = findCategory(input.category);
  if (!category) return { ok: false, error: "category" };

  const brand = BRANDS.find((b) => b.name === input.shopping) ?? null;
  const marketOption = MARKET_OPTIONS.find((m) => m.value === input.shopping);
  const market: Market = brand ? brand.market : marketOption ? marketOption.market : "UK";

  // Which source the visitor chose decides what the answer reads from: a size
  // they already wear is read as that label, measurements are read as lengths.
  // Values left over in the other mode's fields must not override the choice.
  // "A garment that fits me": the visitor measures an item laid flat, so every
  // flat width is doubled before it meets the body chart, and the answer says
  // so with their own numbers in it.
  const flat = input.start === FLAT_START;
  const doubled = (value?: string) => {
    const n = parseNumber(value);
    return n === null ? "" : String(round1(n * 2));
  };
  const read: LookupInput = flat
    ? {
        ...input,
        bust: doubled(input.flatBust),
        waist: doubled(input.flatWaist),
        hip: doubled(input.flatHip),
      }
    : input;
  const derived: string[] = [];
  const extraInputs = input as LookupInput & { age?: string; diameter?: string };
  let readWithDerived: LookupInput = read;
  const blank = (v?: string) => v === undefined || v.trim() === "";
  if (category.id === "ring" && blank(read.finger)) {
    const d = parseNumber(extraInputs.diameter ?? "");
    if (d !== null) {
      const c = round1(d * Math.PI);
      readWithDerived = { ...readWithDerived, finger: String(c) };
      derived.push(`A ring's inside diameter x 3.1416 = ${round1(d)} x 3.1416 = ${c} mm circumference, the figure the chart is read in.`);
    }
  }
  if (category.id === "kids-clothing" && blank(read.height)) {
    const a = parseNumber(extraInputs.age ?? "");
    if (a !== null) {
      const h = round1(80 + 6 * a);
      readWithDerived = { ...readWithDerived, height: String(h) };
      derived.push(`Age x 6 cm + 80 = ${round1(a)} x 6 + 80 = ${h} cm standing height, the band the kids' chart publishes for that age.`);
    }
  }
  const measurements = measurementsFromInput(category, readWithDerived);
  const wornText = input.wornSize && input.wornSize.trim() !== "" ? input.wornSize : "";
  const viaWorn = flat || input.start === "My measurements" ? false : input.start === "A size I wear" ? true : null;
  let index = -1;
  let usedMeasurements = false;

  if (viaWorn === true) {
    if (wornText) index = parseWornSize(wornText, category.rows, brand ? "EU" : market);
  } else if (viaWorn === false) {
    if (measurements.length > 0) {
      usedMeasurements = true;
      const indices = measurements.map((m) => locate(category.rows, m.key, m.valueCm)).filter((i) => i >= 0);
      if (indices.length > 0) index = Math.max(...indices);
    }
  } else if (measurements.length > 0) {
    usedMeasurements = true;
    const indices = measurements.map((m) => locate(category.rows, m.key, m.valueCm)).filter((i) => i >= 0);
    if (indices.length > 0) index = Math.max(...indices);
  } else if (wornText) {
    index = parseWornSize(wornText, category.rows, brand ? "EU" : market);
  }

  if (index < 0) {
    return { ok: false, error: usedMeasurements ? "out-of-range" : "no-input" };
  }

  const row = category.rows[index];
  const label = row.labels[market];
  const units = input.units === "in" ? "in" : "cm";

  // A bra answer is one label: the band and its cup letter come back
  // together, so a 34B stays 34B instead of leaving the visitor to look the
  // cup up somewhere else.
  let cup = "";
  if (category.id === "bra") {
    const band = measurements.find((m) => m.key === "underband");
    const bust = measurements.find((m) => m.key === "bust");
    if (band && bust) {
      const difference = bust.valueCm - band.valueCm;
      const step = CUP_STEPS.find(([max]) => difference <= max);
      if (step) cup = step[1];
    }
    if (!cup && wornText) {
      const wornCup = wornText.trim().toUpperCase().match(/([A-H]{1,2})$/);
      if (wornCup) cup = wornCup[1];
    }
  }

  // The region the visitor's size is stated in.
  const conclusions: Conclusion[] = [];
  const sizeLine = sizeText(market, label) + cup;
  conclusions.push({
    label: "size",
    text: row.sizeLabel ? `${sizeLine} · ${row.sizeLabel}` : sizeLine,
    emphasis: true,
  });

  // The flat-to-circumference arithmetic, printed with the visitor's numbers.
  if (flat) {
    const u = input.units === "in" ? "in" : "cm";
    const pairs: [string, string | undefined, string | undefined][] = [
      ["chest", input.flatBust, read.bust],
      ["waist", input.flatWaist, read.waist],
      ["hip", input.flatHip, read.hip],
    ];
    const shown = pairs.filter(
      ([, f, d]) => String(f ?? "").trim() !== "" && String(d ?? "") !== "",
    );
    if (shown.length > 0) {
      conclusions.push({
        label: "flat",
        text: `Laid flat, then doubled: ${shown
          .map(([name, f, d]) => `${name} ${String(f).trim()} ${u} × 2 = ${d} ${u}`)
          .join(", ")}. A garment laid flat measures half the body around it, so each flat width is doubled before it meets the chart.`,
      });
    }
  }

  // A brand sells its own row, one or two places from the chart row: the
  // readings and the answer are moved to that row together, so every size the
  // explanation names is a size the visitor would actually find in its shop.
  const brandShift = brand ? brand.runs : 0;
  const rowFor = (i: number) => Math.min(Math.max(i - brandShift, 0), category.rows.length - 1);
  const finalIndex = rowFor(index);
  const finalRow = category.rows[finalIndex];
  const finalLabel = finalRow.labels[market];
  const size = sizeText(market, finalLabel) + cup;

  // The between-sizes rule, and where the measurements read. In "a size I
  // wear" mode the length fields are not the source, so they say nothing.
  // Every reading is named, the one that set the answer included: a sentence
  // that dropped it would send the visitor to a smaller size than it returned.
  const readings = (usedMeasurements ? measurements : []).map((m) => {
    const found = locate(category.rows, m.key, m.valueCm);
    const at = found >= 0 ? rowFor(found) : -1;
    return {
      key: m.key,
      raw: m.raw + " " + unitWord(category, m.key, units),
      index: at,
      text: at >= 0 ? `${category.rows[at].labels[market]}` : "—",
    };
  });

  const named = (r: { key: MeasureKey; raw: string; text: string }) =>
    `${MEASURE_LABEL[r.key]} ${r.raw} reads ${r.text}`;
  const winners = readings.filter((r) => r.index === finalIndex);
  const others = readings.filter((r) => r.index !== finalIndex);

  if (others.length > 0 && winners.length > 0) {
    conclusions.push({
      label: "between",
      text: `Between two sizes: your ${readings.map(named).join(", your ")}. We take the larger — your ${winners
        .map(named)
        .join(" and your ")}, so ${sizeText(market, finalLabel)}. A seam can be taken in, not let out.`,
    });
  } else if (readings.length > 0) {
    conclusions.push({
      label: "between",
      text: `All ${readings.length === 1 ? "one measurement reads" : "measurements read"} the same size. Where two sizes meet, take the larger — a seam can be taken in, not let out.`,
    });
  } else {
    conclusions.push({
      label: "between",
      text: `Read from the size you already wear${brand ? " at " + brand.name : ""}. Where two sizes meet, take the larger — a seam can be taken in, not let out.`,
    });
  }

  // Brand direction: the label that brand itself uses, and how it runs.
  if (brand) {
    conclusions.push({
      label: "brand",
      text: `${brand.name} labels this ${finalRow.labels[brand.market]}${
        finalRow.sizeLabel ? " (" + finalRow.sizeLabel + ")" : ""
      }. ${brand.note}`,
    });
  }
  if (brand) conclusions[0] = { label: "size", text: `${size}${finalRow.sizeLabel ? " · " + finalRow.sizeLabel : ""} at ${brand.name}`, emphasis: true };

  // The chart the answer came from: two rows either side, the match marked.
  const from = Math.max(0, finalIndex - 2);
  const to = Math.min(category.rows.length - 1, finalIndex + 2);
  const chartRows: ChartLine[] = [];
  for (let i = from; i <= to; i += 1) {
    const r = category.rows[i];
    const cells = [MARKETS.includes(market) ? String(i + 1) : "", ""];
    chartRows.push({
      cells: [
        `${MARKETS.map((m) => r.labels[m]).join(" · ")}`,
        category.columns
          .map((c) => {
            const range = r.ranges[c.key];
            if (!range) return "—";
            // Both units in the cell: the visitor reads the chart in the unit
            // they think in without changing a control first (parity T5).
            const perInch = c.key === "finger" ? 25.4 : 2.54;
            const inUnit = (v: number) => String(Math.round((v / perInch) * 10) / 10);
            const isMm = c.key === "finger";
            return `${range[0]}–${range[1]} ${isMm ? "mm" : "cm"} / ${inUnit(range[0])}–${inUnit(range[1])} in`;
          })
          .join(" · "),
      ],
      match: i === finalIndex,
    });
    void cells;
  }

  const method = [
    `${category.chart.label} — read ${formatDate(category.chart.checkedAt)}.`,
    units === "in"
      ? "Your inches were changed to centimetres (× 2.54) before they met the chart; the table shows both units."
      : `Every row is printed in ${unitLabels.cm} and ${unitLabels.in} side by side — one table, not two.`,
    `The rule: ${category.measure === "foot" ? "a foot length settles the shoe row" : `${MEASURE_LABEL[category.measure]} settles the row`}, other measurements only move it, and two sizes that disagree resolve to the larger.`,
  ];
  if (derived.length) method.push(...derived);
  if (brand) method.push(`${brand.sourceLabel} — read ${formatDate(brand.checkedAt)}.`);
  if (flat)
    method.push(
      "A flat measurement is half a circumference: each width was multiplied by 2 before it was read against the body chart, and no ease was added.",
    );

  const plainLines = [
    `${category.name} — shopping ${brand ? brand.name : input.shopping}: ${size}${finalRow.sizeLabel ? " (" + finalRow.sizeLabel + ")" : ""}`,
    ...conclusions.filter((c) => c.label !== "size").map((c) => c.text),
    ...method.slice(0, 1),
  ];

  return {
    ok: true,
    size,
    sizeLabel: finalRow.sizeLabel ?? null,
    market,
    categoryName: category.name,
    regions: MARKETS.map((m) => ({ market: m, label: finalRow.labels[m] })),
    conclusions,
    brand: brand
      ? {
          name: brand.name,
          note: brand.note,
          sourceLabel: brand.sourceLabel,
          sourceUrl: brand.sourceUrl,
          checkedAt: brand.checkedAt,
        }
      : null,
    chart: {
      heading: `${category.name}: the rows around your size`,
      columns: ["Labels (US · UK · EU · IT · FR · AU · JP · CN)", category.columns.map((c) => c.label).join(" · ")],
      rows: chartRows,
    },
    method,
    plain: plainLines.join("\n"),
  };
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map((n) => Number(n));
  if (!year || !month || !day) return iso;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${day} ${months[month - 1]} ${year}`;
}

/** The categories whose size is stated in each market, for the header strip. */
export function categoryOptions(): { value: string; label: string }[] {
  return CATEGORIES.map((c) => ({ value: c.name, label: c.name }));
}

export function shoppingOptions(): ShoppingOption[] {
  return [
    ...MARKET_OPTIONS.map((m) => ({ value: m.value, label: m.label })),
    ...BRANDS.map((b) => ({ value: b.name, label: b.name, brand: b.name })),
  ];
}
