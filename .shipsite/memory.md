# Site memory

<!-- site-memory/1 -->

What this site's agents (the engineer, its repairs, the designer and the maker) decided and learned, so a mistake fixed once stays fixed.
Every build, repair and design run reads it first. It is your file: edit, add or delete any line, and add sections of your own.
One line per entry: `- date · what — why: reason (from where)`.
An owner decision that relays your words reads `- date · intent — owner's words: "…" — examples, not rules: … — why: …`: your words kept verbatim, the intent in one sentence, and what you named only as an example.

## Owner decisions
_(none yet)_

## Never do
_(none yet)_

## Product decisions
- 2026-11-26 · Maker chose build: Make the size lookup engine and the home result block true to what the page and the plan promise, in this priority order. 1. BRA BAND + CUP (blocking, first): c — why: The blocking tool finding is a built-code defect, not a plan or copy defect: the page's Bra sentence is what the PRD decided (band and cup together), and the engine errors on exactly that input while the rest of the lookup works (real-path: (from run_7467ba84-b81-infra-qa)
- 2026-11-26 · The size lookup never shows a result before the visitor acts: the result area stays empty and the sample arrives only from "Load the sample", marked as a sample (parity T9 read against the platform's plain-tool rule P21, — why: T9 asks for a prefilled example; P21 (blocking) forbids a result shown before input. The press-to-load sample satisfies T9's evidence without breaking P21, and QA's tool-state review measured it that way. (from run_7467ba84-b81)

## Open issues
- 2026-11-26 · lib/size-lookup.ts conversion traps: shoe CN is the foot length in mm (24.5 cm = CN 245, never 2450), the ring 50 mm diameter must read US 5, and jeans JP is the waist in cm. And a worn 34B on the Bra path must return ba — why: QA run run_7467ba84-b81-infra-qa: the bra claim probe failed on exactly 34B; the tester read shoeRows() multiplying cm→mm twice, the ring row stepping diameter as circumference (50 mm → US 16.5) and jeans JP as US×2.33. checks/measure-lookup.mjs read the answe (from run_7467ba84-b81-infra-qa)
- 2026-11-26 · The checkout 502s are the site's own handler failing to create a Waffo session — not a missing owner key. The Waffo keys are in the environment; do not stop for the owner over payment. — why: QA run run_7467ba84-b81-infra-qa: GET /api/pay/checkout answered 502 with this site's own "Checkout could not start" copy for all four plans, meaning the request reached backend/pay and died there; owner-accounts.md lists SHIPSITE_PAYMENT_PROVIDER and SHIPSITE (from run_7467ba84-b81-infra-qa)
- 2026-11-26 · Right after a fresh deploy, the preview can serve HTML from the previous build for a few seconds while the old /_next/static chunks are already gone; the symptom is a Chromium console "Refused to apply style from …/_next — why: Turn 30: the first verify_live after deploying the same tree reported both failures in Chromium only; the rebuilt chunk list has no such file and a second run on the same deployment passed every step. (from run_7467ba84-b81)

## Lessons
- 2026-11-26 · On this site's dark teal cards, any control edge must be #7FA9A1 (3.8:1 against #1B4B47); #2C5F5A measures 1.3:1 and fails. The yellow accent's label ink is #16211F, and a bordered button sitting on the yellow panel need — why: The home draft render measured both: the rest-state select/input edges at 1.3:1 and the Copy result ghost border at 2.5:1 were flagged as blocking. (from run_df3e3a34-d4b-design)
