// The words the site's own code writes, in every language the site serves.
//
// Page copy lives in content/*.json. Everything else a visitor reads comes
// from here: a tool's labels, buttons, placeholders, progress and result
// states, error messages and their fixes, aria-labels, the header's and the
// footer's own words. A component never writes a sentence inline.
//
// How a page uses it: the page (a server component) knows its language
// (the resolved locale's code, or siteConfig.language) and passes
// `uiStringsFor(language)` to its "use client" tool as a prop; the tool
// renders `t.someKey`. This module imports nothing, so a client component
// that does import it ships only these strings, never lib/site-config.json.
//
// The site's to write and extend: the starter ships it empty.

/** Every string the site's code uses, in the primary language. */
const primary = {
  // Page chrome
  skipToContent: "Skip to the size chart",
  signIn: "Sign in",
  menu: "Menu",
  closeMenu: "Close menu",
  primaryNav: "Primary",
  previewNotice: "Preview build: this is the version being checked, not the live site.",
  pageUpdated: "Last updated",
  faqHeading: "Questions people ask first",
  homeFaqHeading: "Questions about the lookup",
  mirrorCaption:
    "The mirror is where the size question starts: one shirt that fits, and no label to read.",
  askAboutData: "Ask about your data",

  // Data tables and their reading notes
  tableChecked: "Checked",
  tableSource: "Source:",
  tableRecheck: "Sizes are re-checked every 90 days; the label on the garment wins.",
  tableRowsFrom: "Rows read from",
  tableLastChecked: "last checked",

  // The tool: what it is
  toolTitle: "Find my size",
  toolLede: "Give a size you already wear, or a bust and waist. One answer comes back, with the rule behind it.",
  toolCategory: "What are you buying",
  toolShopping: "Shopping from",
  toolStart: "Starting with",
  toolStartWorn: "A size I wear",
  toolStartMeasure: "My measurements",
  toolStartFlat: "A garment that fits me",
  toolFlatBust: "Chest width, laid flat",
  toolFlatWaist: "Waist width, laid flat",
  toolFlatHip: "Hip width, laid flat",
  toolFlatHint:
    "Lay the garment flat, measure straight across seam to seam, and we double it: flat × 2 = the body around it.",
  toolWornSize: "Worn size, e.g. US 8 or M",
  toolUnits: "Measurements in",
  toolBust: "Bust (under the arms)",
  toolWaist: "Waist (narrowest)",
  toolHip: "Hip (widest)",
  toolFoot: "Foot length",
  toolUnderband: "Underband",
  toolHeight: "Height",
  toolRingDiameter: "Inside diameter of a ring that fits (mm)",
  toolChildAge: "Child age (years)",
  toolFinger: "Finger circumference (mm)",
  toolMeasureHint: "Measure over underwear, tape level, and leave a finger under the tape.",
  toolStartAction: "Find my size",
  toolStartWaits: "Add a size or a measurement",
  toolWorking: "Finding your size…",

  // The tool: result
  toolResultEmpty: "Your size lands here: one label, the same size in eight regions, and the chart rows it came from.",
  toolSampleChip: "Sample",
  toolEditedChip: "Edited",
  toolBackToSample: "Back to the sample",
  toolLoadSample: "Load the sample",
  toolSampleCredit:
    "Sample: an example body (95 cm bust, 74 cm waist, 101 cm hip). The charts it is read against come from the published guides listed on the About page.",
  toolYourSize: "Your size",
  toolRegions: "The same size where you shop",
  toolBrand: "Brand direction",
  toolChart: "The rows around your size",
  toolMethod: "How this number was reached",
  toolCopy: "Copy result",
  toolCopied: "Copied",
  toolPrint: "Print",
  toolPdf: "Save as PDF",
  toolSave: "Save this size",
  toolStickyCopy: "Copy this size",
  toolStickySize: "Your size",

  // The tool: errors
  toolErrorCategory: "Pick what you are buying, then find the size.",
  toolErrorNoInput: "Add the size you already wear, or one measurement in centimetres.",
  toolErrorRange: "That measurement is outside the chart this site carries. Check the number and the units.",
  toolErrorNumber: "Use a number for the measurement, for example 95.",
  toolFixIt: "Fix it above and press Find my size again.",

  // Contact form
  contactName: "Your name",
  contactEmail: "Your email",
  contactMessage: "Your message",
  contactSend: "Send the message",
  contactSending: "Sending…",
  contactSent: "Thank you — your message is stored and a real person reads it.",
  contactFailed: "That did not send. Your message is not stored yet — try again, or write to hello@sizechartonline.com.",
  contactNeedsEmail: "Add an email address so a reply can reach you.",

  // Pricing
  billingMonthly: "Monthly",
  billingYearly: "Yearly",
  billingSave: "Save {percent}%",
  thenPerMonth: "then {price}/month",
  billedYearly: "billed {price} yearly",
  perMonth: "a month",
  mostPopular: "Most popular",
  choosePlan: "Choose {plan}",
  currentPlan: "Your plan",

  // Billing toggle and plan cards
  billingLabel: "Billing period",
  billingMonthlyWord: "monthly",
  billingYearlyWord: "yearly",
  twoMonthsFree: "2 months free",
  perMonthShort: "/month",
  firstMonth: "/first month",
  newCustomersOnly: "new customers only",
  planIncludes: "What it includes",
  checkoutResuming: "Signed in. Opening the checkout for {plan}…",
  checkoutSignedOut: "That sign-in did not finish, so nothing has been charged. Sign in again to go on to the {plan} checkout, or come back to it from this page when you are ready.",
  checkoutSignInAgain: "Sign in and go on to checkout",
  checkoutUnavailable: "The payment page did not open, so nothing has been charged.",
  checkoutUnavailablePlan:
    "The payment page for {plan} did not open, so nothing has been charged.",
  checkoutUnavailableFixBefore: "Write to us through the",
  checkoutUnavailableFixAfter: "and we will finish the order by hand.",

  // Contact form
  contactFormTitle: "Send a message",
  contactNeedsBoth: "Add a message and an email address so a reply can reach you.",
  contactRateLimited: "Too many messages from this connection just now — try again in a few minutes.",
  contactAsideTitle: "What to send",
  pricesInUsd: "Prices in US dollars",
  cancelAnytime: "Cancel any time from your billing portal",
  findYourSize: "Find your size",
  navAbout: "About",
  navContact: "Contact",
  footerBlurb: "An independent size lookup: one size back, with the rule behind it, in eight regions.",
};

export type UiStringKey = keyof typeof primary;
export type UiStrings = Record<UiStringKey, string>;

/** Each secondary language, keyed by its locale code ("es", "pt"). */
const translations: Record<string, Partial<UiStrings>> = {};

/** The strings of one language, the primary text filling any key it lacks. */
export function uiStringsFor(language: string): UiStrings {
  const code = (language || "").trim().toLowerCase();
  const own = translations[code] ?? translations[code.split("-")[0]] ?? {};
  return { ...primary, ...own } as UiStrings;
}

/** Fill "{name}" slots: formatMessage(t.toolErrorTooLarge, { limit: "50 MB" }). */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => (name in values ? String(values[name]) : slot));
}

/** A number as this language writes it (1,234.5 or 1.234,5). */
export function formatNumber(value: number, language: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(language || "en", options).format(value);
}

/** A price in its own currency, as this language writes it (R$ 29,90, 9,99 €). */
export function formatPrice(amount: number, currency: string, language: string): string {
  return new Intl.NumberFormat(language || "en", { style: "currency", currency }).format(amount);
}
