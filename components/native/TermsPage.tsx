import type { SiteConfig, Route } from "../../lib/site-config";
import type { PageContent } from "../../lib/content";
import { SiteHeader, SiteFooter } from "../site/SiteChrome";
import { RichText, itemTitle, itemBody, type CopyItem } from "./rich";

type Section = {
  id: string;
  title: string;
  body?: string;
  items?: CopyItem[];
  table?: { caption?: string; columns: string[]; rows: { cells: string[] }[] };
};
type Props = { content: PageContent; config: SiteConfig; route: Route };

export function TermsPage({ content, config, route }: Props) {
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

        <section className="band band-tight">
          <div className="wrap">
            <div className="prose">
              {sections.map((section) => (
                <section id={section.id} key={section.id}>
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
                </section>
              ))}
            </div>
          </div>
        </section>

        {faq.length > 0 ? (
          <section className="band band-surface">
            <div className="wrap">
              <div className="section-head">
                <h2>Questions about these terms</h2>
              </div>
              <dl className="faq">
                {faq.map((entry, i) => (
                  <div key={i}>
                    <dt>{entry.question}</dt>
                    <dd>{entry.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ) : null}

        <section className="band band-tight">
          <div className="wrap">
            <div className="section-head">
              <h2>Find your size</h2>
            </div>
            <div className="page-ctas">
              <a className="btn btn-primary" href="/#tool">
                Find your size
              </a>
              <a className="text-link" href="/pricing/">
                See the plans
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter config={config} />
    </>
  );
}
