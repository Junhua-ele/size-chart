import type { SiteConfig } from "../../lib/site-config";
import type { PageContent } from "../../lib/content";
import type { Route } from "../../lib/site-config";
import { SiteHeader, SiteFooter } from "../site/SiteChrome";
import { RichText, itemTitle, itemBody, type CopyItem } from "./rich";

type Section = {
  id: string;
  title: string;
  body?: string;
  items?: CopyItem[];
};

type Props = { content: PageContent; config: SiteConfig; route: Route };

export function AboutPage({ content, config, route }: Props) {
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
            <div className="page-ctas">
              <a className="btn btn-primary" href="/#tool">
                Find your size
              </a>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            {sections.map((section) => (
              <article className="about-row" id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                <div className="about-body">
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
                </div>
              </article>
            ))}
          </div>
        </section>

        {faq.length > 0 ? (
          <section className="band band-surface">
            <div className="wrap">
              <div className="section-head">
                <h2>Questions people ask first</h2>
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
      </main>
      <SiteFooter config={config} />
    </>
  );
}
