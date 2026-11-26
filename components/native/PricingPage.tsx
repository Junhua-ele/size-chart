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

export function PricingPage({ content, config, route }: Props) {
  const t = uiStringsFor(config.language || "en");
  const [billing, setBilling] = useState<Billing>("month");
  // A checkout that could not open comes back here with ?checkout=unavailable
  // so the visitor reads what happened in the page, not on a bare error page.
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setUnavailable(params.get("checkout") === "unavailable" || params.get("checkout") === "required");
  }, []);
  const sections =((content.sections ?? []) as unknown as Section[]);
  const faq = (content.faq ?? []) as { question: string; answer: string }[];

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

              {unavailable ? (
          <p className="checkout-note" role="status">
            The payment page did not open, so nothing has been charged. Write to us through the{" "}
            <a href="/contact/">contact form</a> and we will finish the order by hand.
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
