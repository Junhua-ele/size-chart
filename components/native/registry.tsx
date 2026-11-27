import type { ComponentType } from "react";

import type { Route, SiteConfig } from "../../lib/site-config";

import type { PageContent } from "../../lib/content";

import { HomePage } from "./HomePage";
import { AboutPage } from "./AboutPage";
import { ContactPage } from "./ContactPage";
import { PricingPage } from "./PricingPage";
import { PrivacyPage } from "./PrivacyPage";
import { RefundPage } from "./RefundPage";
import { TermsPage } from "./TermsPage";

// AUTO-COMPOSED by the per-route native authoring pass — entries are
// merged per route from each accepted patch; hand edits are overwritten.
// An unregistered route renders the deterministic composition.

export type NativeRouteProps = {
  route: Route;
  content: PageContent;
  config: SiteConfig;
};

export const nativeRoutes: Record<string, ComponentType<NativeRouteProps>> = {
  "/": HomePage,
  "/about/": AboutPage,
  "/contact/": ContactPage,
  "/pricing/": PricingPage,
  "/privacy/": PrivacyPage,
  "/refund/": RefundPage,
  "/terms/": TermsPage,
};

