"use client";

import { useEffect, useState } from "react";
import type { SiteConfig, Route } from "../../lib/site-config";
import type { PageContent } from "../../lib/content";
import { SiteHeader, SiteFooter } from "../site/SiteChrome";
import { formatMessage, uiStringsFor } from "../../lib/ui-strings";
import { RichText, itemTitle, itemBody, type CopyItem } from "./rich";

type Section = {
  id: string;
  title: string;
  body?: string;
  items?: CopyItem[];
  table?: { caption?: string; columns: string[]; rows: { cells: string[] }[] };
};
type Props = { content: PageContent; config: SiteConfig; route: Route };
type Billing = "month" | "year";

const NUMBERS = {
  plus: { month: 7.99, first: 1, year: 79, annual: 6.58 },
  pro: { month: 14.99, year: 149, annual: 12.42 },
};

type ResumeState = "none" | "resuming" | "signedOut";

// A buy press travels through sign-in as /pricing/?plan=plus&resume=checkout,
// so the plan pressed has to be recognised again on the way back.
const PLAN_LABELS: Record<string, string> = {
  plus: "Plus monthly",
  "plus-annual": "Plus yearly",
  pro: "Pro monthly",
  "pro-annual": "Pro yearly",
};

// One resume per plan on a page load: a second attempt would push the visitor
// through sign-in again, which is the loop the guard prevents.
let resumeAttempt: string | null = null;

export function PricingPage({ content, config, route }: Props) {
  const t = uiStringsFor(config.language || "en");
  const [billing, setBilling] = useState<Billing>("month");
  // A checkout that could not open comes back here with ?checkout=unavailable
  // so the visitor reads what happened in the page, not on a bare error page.
  const [unavailable, setUnavailable] = useState(false);
  // The plan a buy press carried through sign-in, and how that resume stands.
  const [resumeState, setResumeState] = useState<ResumeState>("none");
  const [resumePlan, setResumePlan] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan") ?? "";
    const planKnown = plan in PLAN_LABELS;
    if (planKnown) setBilling(plan.endsWith("-annual") ? "year" : "month");
    setUnavailable(params.get("checkout") === "unavailable" || params.get("checkout") === "required");
    if (planKnown) setResumePlan(plan);
    if (!planKnown || params.get("resume") !== "checkout") return;
    if (resumeAttempt === plan) {
      // This plan was already resumed once on this load: stop at the honest
      // state instead of sending the visitor through sign-in a second time.
      setResumeState("signedOut");
      return;
    }
    resumeAttempt = plan;
    setResumeState("resuming");
    // The resume is spent the moment it starts: the address loses ?resume=checkout
    // so a trip back here (a cancelled sign-in, the Back button) never starts it
    // a second time and never loops through sign-in again.
    const spent = new URL(window.location.href);
    spent.searchParams.delete("resume");
    window.history.replaceState(null, "", `${spent.pathname}${spent.search}`);
    let live = true;
    fetch("/api/auth/me", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { signedIn?: boolean } | null) => {
        if (!live) return;
        if (data && data.signedIn) {
          // Signed in: the checkout route finishes the job for this plan, and
          // a signed-in visitor is never sent back through sign-in.
          window.location.replace(`/api/pay/checkout?plan=${encodeURIComponent(plan)}`);
          return;
        }
        resumeAttempt = null;
        setResumeState("signedOut");
      })
      .catch(() => {
        if (!live) return;
        resumeAttempt = null;
        setResumeState("signedOut");
      });
    return () => {
      live = false;
    };
  }, []);
  const sections =((content.sections ?? []) as unknown as Section[]);
  const faq = (content.faq ?? []) as { question: string; answer: string }[];

  // A sign-in that came back without a session lands here with the plan it
  // carried: say so in people's words, never a spinner and never a second trip
  // through Google unless the visitor presses the link themselves.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "signedout") return;
    const plan = params.get("plan") ?? "";
    if (!PLAN_LABELS[plan]) return;
    setResumePlan(plan);
    setResumeState("signedOut");
  }, []);

  const resumeLabel = PLAN_LABELS[resumePlan] ?? "";
  const resumeSignInHref = `/api/auth/google?return=${encodeURIComponent(
    `/pricing/?plan=${resumePlan}&resume=checkout`,
  )}`;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader config={config} currentPath={route.path} />
      <main id="main">
        <section className="page-hero">
          <div className="wrap">
            <h1>{content.h1}</h1>
            <p>{content.heroText}</p>
          </div>
        </section>

        <section className="band band-tight" id="pricing-plans">
          <div className="wrap">
            <div className="pricing-top">
              <div className="billing-toggle" role="group" aria-label={t.billingLabel}>
                <button
                  type="button"
                  aria-pressed={billing === "month"}
                  onClick={() => setBilling("month")}
                >
                  {t.billingMonthly}
                </button>
                <button
                  type="button"
                  aria-pressed={billing === "year"}
                  onClick={() => setBilling("year")}
                >
                  {t.billingYearly}
                </button>
              </div>
              <p className="billing-note">{t.twoMonthsFree}</p>
            </div>

              {resumeState === "resuming" ? (
                <p className="checkout-note" role="status" data-checkout-resume="resuming">
                  {formatMessage(t.checkoutResuming, { plan: resumeLabel })}
                </p>
              ) : null}
              {resumeState === "signedOut" ? (
                <p className="checkout-note" role="status" data-checkout-resume="signed-out">
                  {formatMessage(t.checkoutSignedOut, { plan: resumeLabel })}{" "}
                  <a href={resumeSignInHref}>{t.checkoutSignInAgain}</a>
                </p>
              ) : null}
              {unavailable ? (
                <p className="checkout-note" role="status" data-checkout-resume="unavailable">
                  {resumeLabel
                    ? formatMessage(t.checkoutUnavailablePlan, { plan: resumeLabel })
                    : t.checkoutUnavailable}{" "}
                  {t.checkoutUnavailableFixBefore} <a href="/contact/">contact form</a>{" "}
                  {t.checkoutUnavailableFixAfter}
                </p>
              ) : null}
      <div className="plans">
              <article className="plan">
                <h2 className="plan-name">Free</h2>
                <p className="plan-who">One look at a time, with no account and no card.</p>
                <p className="plan-price">
                  <span className="plan-figure">$0</span>
                  <span className="plan-period">/forever</span>
                </p>
                <ul className="plan-list">
                  <li>Every lookup in your browser, with no account</li>
                  <li>One size, the between-sizes rule and the brand direction</li>
                  <li>Copy, print and save a PDF of the answer</li>
                  <li>Nothing you measure leaves your device</li>
                </ul>
                <a className="plan-cta" href="/#tool">
                  Find my size
                </a>
              </article>

              <article className="plan is-popular">
                <span className="plan-flag">{t.mostPopular}</span>
                <h2 className="plan-name">Plus</h2>
                <p className="plan-who">For shopping a few brands a month.</p>
                {billing === "month" ? (
                  <p className="plan-price">
                    <span className="plan-figure">$1</span>
                    <span className="plan-was">$7.99</span>
                    <span className="plan-period">{t.firstMonth}</span>
                  </p>
                ) : (
                  <p className="plan-price">
                    <span className="plan-figure">$6.58</span>
                    <span className="plan-period">{t.perMonthShort}</span>
                    <span className="plan-save">{formatMessage(t.billingSave, { percent: "18" })}</span>
                  </p>
                )}
                {billing === "month" ? (
                  <p className="plan-then">
                    {formatMessage(t.thenPerMonth, { price: "$7.99" })} · {t.newCustomersOnly}
                  </p>
                ) : (
                  <p className="plan-then">
                    {formatMessage(t.billedYearly, { price: "$79" })} · {t.twoMonthsFree}
                  </p>
                )}
                <ul className="plan-list">
                  <li>5 saved measurement profiles</li>
                  <li>10 followed brands</li>
                  <li>20 comparison PDFs a month</li>
                  <li>Everything in Free</li>
                </ul>
                <a
                  className="plan-cta"
                  href={billing === "month" ? "/api/pay/checkout?plan=plus" : "/api/pay/checkout?plan=plus-annual"}
                  data-shipsite-checkout
                  data-product={billing === "month" ? "plus" : "plus-annual"}
                >
                  {formatMessage(t.choosePlan, { plan: "Plus" })} {billing === "month" ? t.billingMonthlyWord : t.billingYearlyWord}
                </a>
                <a
                  className="plan-cta"
                  href={billing === "month" ? "/api/pay/checkout?plan=plus-annual" : "/api/pay/checkout?plan=plus"}
                  data-shipsite-checkout
                  data-product={billing === "month" ? "plus-annual" : "plus"}
                  hidden
                >
                  {formatMessage(t.choosePlan, { plan: "Plus" })}
                </a>
              </article>

              <article className="plan">
                <h2 className="plan-name">Pro</h2>
                <p className="plan-who">For a whole wardrobe, a tailor or anyone buying often.</p>
                {billing === "month" ? (
                  <p className="plan-price">
                    <span className="plan-figure">${NUMBERS.pro.month}</span>
                    <span className="plan-period">{t.perMonthShort}</span>
                  </p>
                ) : (
                  <p className="plan-price">
                    <span className="plan-figure">${NUMBERS.pro.annual}</span>
                    <span className="plan-period">{t.perMonthShort}</span>
                    <span className="plan-save">{formatMessage(t.billingSave, { percent: "17" })}</span>
                  </p>
                )}
                {billing === "year" ? (
                  <p className="plan-then">
                    {formatMessage(t.billedYearly, { price: "$149" })} · {t.twoMonthsFree}
                  </p>
                ) : null}
                <ul className="plan-list">
                  <li>20 saved measurement profiles</li>
                  <li>50 followed brands</li>
                  <li>100 comparison PDFs a month</li>
                  <li>Everything in Plus</li>
                </ul>
                <a
                  className="plan-cta"
                  href={billing === "month" ? "/api/pay/checkout?plan=pro" : "/api/pay/checkout?plan=pro-annual"}
                  data-shipsite-checkout
                  data-product={billing === "month" ? "pro" : "pro-annual"}
                >
                  {formatMessage(t.choosePlan, { plan: "Pro" })} {billing === "month" ? t.billingMonthlyWord : t.billingYearlyWord}
                </a>
                <a
                  className="plan-cta"
                  href={billing === "month" ? "/api/pay/checkout?plan=pro-annual" : "/api/pay/checkout?plan=pro"}
                  data-shipsite-checkout
                  data-product={billing === "month" ? "pro-annual" : "pro"}
                  hidden
                >
                  {formatMessage(t.choosePlan, { plan: "Pro" })}
                </a>
              </article>
            </div>

            <p className="trust-line">
              <span>{t.pricesInUsd}</span>
              <span>{t.cancelAnytime}</span>
              <a
                className="text-link"
                href="/api/pay/portal"
                data-shipsite-billing-portal
              >
                Manage or cancel a plan
              </a>
            </p>
          </div>
        </section>

        <section className="band band-surface">
          <div className="wrap">
            {sections.map((section) => (
              <div className="prose" id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.body ? (
                  <p>
                    <RichText text={section.body} />
                  </p>
                ) : null}
                {section.items && section.items.length > 0 ? (
                  <ul>
                    {section.items.map((item, i) => {
                      const title = itemTitle(item);
                      return (
                        <li key={i}>
                          {title ? <strong>{title}. </strong> : null}
                          <RichText text={itemBody(item)} />
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {section.table ? (
                  <div className="tablewrap">
                    <table className="data">
                      {section.table.caption ? <caption>{section.table.caption}</caption> : null}
                      <thead>
                        <tr>
                          {section.table.columns.map((col) => (
                            <th key={col} scope="col">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row, i) => (
                          <tr key={i}>
                            {row.cells.map((cell, j) => (
                              <td key={j}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {faq.length > 0 ? (
          <section className="band">
            <div className="wrap">
              <div className="section-head">
                <h2>Questions about the plans</h2>
              </div>
              <dl className="faq">
                {faq.map((entry, i) => (
                  <div key={i}>
                    <dt>{entry.question}</dt>
                    <dd>
                      <RichText text={entry.answer} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter config={config} />
    </>
  );
}
