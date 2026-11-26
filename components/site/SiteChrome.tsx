import { isPreviewDeployment } from "../../lib/site-config";
import type { SiteConfig } from "../../lib/site-config";
import { uiStringsFor } from "../../lib/ui-strings";

// The site's own header and footer. Every page renders both, so the bar, the
// links and the small print are written once. The link set is the config's
// nav plus the two pages a visitor looks for at the top of a reference site
// (About, Contact); the footer carries every page the site publishes.

type ChromeProps = {
  config: SiteConfig;
  currentPath?: string;
};

type ChromeLink = { label: string; href: string };

export function headerLinks(config: SiteConfig): ChromeLink[] {
  const t = uiStringsFor(config.language ?? "en");
  const base = (config.nav ?? []).map((item) => ({ label: item.label, href: item.href }));
  const extra: ChromeLink[] = [
    { label: t.navAbout, href: "/about/" },
    { label: t.navContact, href: "/contact/" },
  ];
  const seen = new Set<string>();
  const out: ChromeLink[] = [];
  for (const link of [...base, ...extra]) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    out.push(link);
  }
  return out;
}

function isCurrent(href: string, currentPath: string): boolean {
  if (href === "/") return currentPath === "/" || currentPath === "";
  return currentPath === href || currentPath === href.replace(/\/$/, "");
}

export function SiteHeader({ config, currentPath = "/" }: ChromeProps) {
  const t = uiStringsFor(config.language ?? "en");
  const links = headerLinks(config);
  return (
    <header className="site-head" data-site-header>
      {isPreviewDeployment() ? (
        <p className="preview-note" data-shipsite-preview>
          {t.previewNotice}
        </p>
      ) : null}
      <div className="head-inner">
        <a className="brand" href="/" aria-label={`${config.brandName} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src={config.brandLogo ?? ""} alt="" width={30} height={30} />
          <span className="brand-wordmark">{config.brandName}</span>
        </a>
        <nav className="head-links" aria-label={t.primaryNav}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href, currentPath) ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="head-act">
          <a className="head-signin" href="/api/auth/google" data-shipsite-google-login>
            {t.signIn}
          </a>
          <a className="head-cta" href="/#tool">
            {t.findYourSize}
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ config }: ChromeProps) {
  const groups = config.footerGroups ?? [];
  return (
    <footer className="site-foot">
      <div className="foot-inner">
        <div className="foot-top">
          <div className="foot-brand">
            <a className="brand" href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="brand-logo" src={config.brandLogo ?? ""} alt="" width={30} height={30} />
              <span className="brand-wordmark">{config.brandName}</span>
            </a>
            <p>{uiStringsFor(config.language ?? "en").footerBlurb}</p>
          </div>
          {groups.map((group) => (
            <div className="foot-grid" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="foot-note">{config.footerNote}</p>
      </div>
    </footer>
  );
}
