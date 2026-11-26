import { Fragment } from "react";
import type { PageContent, Route, SiteConfig } from "../../lib/content";
import { SiteFooter, SiteHeader } from "../site/SiteChrome";
import { uiStringsFor } from "../../lib/ui-strings";
import { SizeLookupTool } from "./SizeLookupTool";
import { RichText } from "./rich";

type Item = string | { title?: string; body?: string; text?: string };
type Table = {
  caption?: string;
  columns?: string[];
  rows?: { cells?: string[]; sourceUrl?: string }[];
  lastCheckedAt?: string;
};
type Section = {
  id: string;
  title?: string;
  body?: string;
  items?: Item[];
  table?: Table;
};

type PageProps = {
  content: PageContent;
  config: SiteConfig;
  route: Route;
};

function itemTitle(item: Item): string | undefined {
  return typeof item === "string" ? undefined : item.title;
}
function itemBody(item: Item): string | undefined {
  return typeof item === "string" ? item : (item.body ?? item.text);
}

function DataTable({ table }: { table: Table }) {
  const caption = table.caption ?? "";
  const columns = table.columns ?? [];
  const rows = table.rows ?? [];
  const sourceUrl = rows.find((row) => row.sourceUrl)?.sourceUrl;
  const checked = table.lastCheckedAt;
  const sourceHost = sourceUrl ? sourceUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "";
  return (
    <div>
      <div className="tablewrap">
        <table className="data">
          {caption ? <caption>{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {(row.cells ?? []).map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {checked || sourceUrl ? (
        <p className="table-meta">
          {checked ? (
            <>
              Checked{" "}
              <time dateTime={checked}>
                {new Date(checked).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </>
          ) : null}
          {checked && sourceUrl ? " · " : null}
          {sourceUrl ? (
            <a href={sourceUrl} rel="nofollow noopener" target="_blank">
              Source: {sourceHost}
            </a>
          ) : null}
          {" · "}
          Sizes are re-checked every 90 days; the label on the garment wins.
        </p>
      ) : null}
    </div>
  );
}

function SectionBody({ section }: { section: Section }) {
  const items = section.items ?? [];
  const titled = items.filter((item) => itemTitle(item));
  return (
    <>
      {section.body ? (
        <p>
          <RichText text={section.body} />
        </p>
      ) : null}
      {titled.length >= 2 ? (
        <div className={`cards${titled.length === 4 ? " cards--2" : ""}`}>
          {titled.map((item, index) => (
            <div className="card" key={index}>
              <h3>{itemTitle(item)}</h3>
              {itemBody(item) ? (
                <p>
                  <RichText text={itemBody(item) ?? ""} />
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : items.length ? (
        <ul className="rule-list">
          {items.map((item, index) => (
            <li key={index}>
              {itemTitle(item) ? <h3>{itemTitle(item)}</h3> : null}
              {itemBody(item) ? (
                <p>
                  <RichText text={itemBody(item) ?? ""} />
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export function HomePage({ content, config, route }: PageProps) {
  const t = uiStringsFor(config.language ?? "en");
  const sections = (content.sections ?? []) as Section[];

  return (
    <>
      <a className="skip-link" href="#main">
        {t.skipToContent}
      </a>
      <SiteHeader config={config} currentPath={route.path} />
      <main id="main">
        {sections.map((section) => {
          if (section.id === "tool") {
            return (
              <Fragment key={section.id}>
                <section className="first-screen" id="tool">
                  <div className="wrap first-grid">
                    <div className="first-head">
                      <h1>{content.h1}</h1>
                      <p className="first-links">
                        {(content.ctas ?? []).map((cta) => (
                          <a key={cta.label} href={cta.href}>
                            {cta.label}
                          </a>
                        ))}
                      </p>
                    </div>
                    <div className="toolcol">
                      <SizeLookupTool t={t} />
                    </div>
                    <figure className="intro-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/tape-measure-waist.png"
                        alt="Hands holding a soft tape measure around a waist, the inch and centimetre scales both facing out"
                        width={900}
                        height={1200}
                      />
                    </figure>
                  </div>
                </section>
                <section className="standfirst">
                  <div className="wrap">
                    <p>{content.heroText}</p>
                  </div>
                </section>
              </Fragment>
            );
          }

          if (section.id === "between-sizes") {
            return (
              <section className="band band-surface" id={section.id} key={section.id}>
                <div className="wrap">
                  <div className="split">
                    <div>
                      <div className="section-head">
                        <h2>{section.title}</h2>
                        {section.body ? (
                        <p>
                          <RichText text={section.body} />
                        </p>
                      ) : null}
                      </div>
                      <SectionBody section={{ ...section, body: undefined }} />
                    </div>
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/fitting-room-mirror.png"
                        alt="A fitting room mirror with a rail of clothes beside it and one shirt held up in front"
                        width={900}
                        height={1200}
                        loading="lazy"
                      />
                      <figcaption>
                        The mirror is where the size question starts: one shirt that fits, and no
                        label to read.
                      </figcaption>
                    </figure>
                  </div>
                </div>
              </section>
            );
          }

          return (
            <section className="band" id={section.id} key={section.id}>
              <div className="wrap">
                <div className="section-head">
                  <h2>{section.title}</h2>
                  {section.body ? (
                    <p>
                      <RichText text={section.body} />
                    </p>
                  ) : null}
                </div>
                <SectionBody section={{ ...section, body: undefined }} />
                {section.table ? (
                  <div style={{ marginTop: 24 }}>
                    <DataTable table={section.table} />
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}

        {content.faq?.length ? (
          <section className="band band-surface" id="questions">
            <div className="wrap">
              <div className="section-head">
                <h2>Questions about the lookup</h2>
              </div>
              <dl className="faq">
                {content.faq.map((entry, index) => (
                  <div key={index}>
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
