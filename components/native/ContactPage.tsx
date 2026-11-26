import type { SiteConfig, Route } from "../../lib/site-config";
import type { PageContent } from "../../lib/content";
import { SiteHeader, SiteFooter } from "../site/SiteChrome";
import { ContactForm } from "./ContactForm";
import { RichText, itemTitle, itemBody, type CopyItem } from "./rich";
import { uiStringsFor } from "../../lib/ui-strings";
import { PageUpdated } from "./PageUpdated";

type Section = { id: string; title: string; body?: string; items?: CopyItem[] };
type Props = { content: PageContent; config: SiteConfig; route: Route };

export function ContactPage({ content, config, route }: Props) {
  const t = uiStringsFor(config.language || "en");
  const sections =((content.sections ?? []) as unknown as Section[]);
  const [aside, ...rest] = sections;

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
            <PageUpdated language={config.language ?? "en"} />
          </div>
        </section>

        <section className="band band-tight">
          <div className="wrap">
            <div className="section-head">
              <h2>{t.contactFormTitle}</h2>
            </div>
            <div className="contact-grid">
              <ContactForm t={t} />
              {aside ? (
                <aside className="contact-aside" id={aside.id}>
                  <h2>{aside.title}</h2>
                  {aside.body ? (
                    <p>
                      <RichText text={aside.body} />
                    </p>
                  ) : null}
                  {aside.items && aside.items.length > 0 ? (
                    <ul className="contact-facts">
                      {aside.items.map((item, i) => (
                        <li key={i}>
                          <strong>{itemTitle(item) ?? ""}</strong>
                          <span>
                            <RichText text={itemBody(item)} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            {rest.map((section) => (
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
      </main>
      <SiteFooter config={config} />
    </>
  );
}
