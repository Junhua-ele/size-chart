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
- 2026-11-27 · Maker chose build: A signed-out visitor who presses a plan's buy button on /pricing/ keeps the plan all the way through sign-in: the buy control sends them to sign-in with the cho — why: The one blocker is built-code wiring, not plan, copy or design: done-criteria D84 asks exactly for "buy pressed signed out goes to sign-in … and on to checkout for the same plan once signed in", and the tester recorded that all four checkou (from run_1410fe8c-73c)
- 2026-11-27 · The buy sign-in path must carry the plan: a signed-out buy on /pricing/ goes to sign-in with the plan in the return address and one automatic resume of that plan's checkout on return; a plain header sign-in returns to /p — why: done-criteria D84; QA run run_1410fe8c-73c blocked on site-outcome:checkout-sign-in-return after all four checkout links began answering /pricing/?checkout=unavailable — the plan was dropped at the redirect. Maker called build (2026-11-27) so the flow is corre (from run_1410fe8c-73c)
- 2026-11-26 · The size lookup never shows a result before the visitor acts: the result area stays empty and the sample arrives only from "Load the sample", marked as a sample (parity T9 read against the platform's plain-tool rule P21, — why: T9 asks for a prefilled example; P21 (blocking) forbids a result shown before input. The press-to-load sample satisfies T9's evidence without breaking P21, and QA's tool-state review measured it that way. (from run_7467ba84-b81)

## Open issues
- 2026-11-27 · Waffo refuses to create an order because the owner's credential set has no API key (the "Api secret key" sent as X-API-KEY): only the owner can add PAYMENT_API_KEY on both Workers and PAYMENT_TEST_API_KEY on the preview  — why: source-patch-agent probes 2026-11-26T23:02 (run run_0eeae147-49e): api.waffo.com and api-sandbox both 401 A0001 "Invalid Api secret key"; the @waffo/waffo-node 3.4.0 SDK needs apiKey + privateKey + waffoPublicKey + merchantId; $SHIPSITE_SECRET_NAMES has no PAY (from run_1410fe8c-73c)
- 2026-11-26 · Right after a fresh deploy, the preview can serve HTML from the previous build for a few seconds while the old /_next/static chunks are already gone; the symptom is a Chromium console "Refused to apply style from …/_next — why: Turn 30: the first verify_live after deploying the same tree reported both failures in Chromium only; the rebuilt chunk list has no such file and a second run on the same deployment passed every step. (from run_7467ba84-b81)

## Lessons
- 2026-11-26 · On this site's dark teal cards, any control edge must be #7FA9A1 (3.8:1 against #1B4B47); #2C5F5A measures 1.3:1 and fails. The yellow accent's label ink is #16211F, and a bordered button sitting on the yellow panel need — why: The home draft render measured both: the rest-state select/input edges at 1.3:1 and the Copy result ghost border at 2.5:1 were flagged as blocking. (from run_df3e3a34-d4b-design)
