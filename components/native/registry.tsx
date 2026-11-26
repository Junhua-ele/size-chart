import type { ComponentType } from "react";
import type { Route, SiteConfig } from "../../lib/site-config";
import type { PageContent } from "../../lib/content";

// The native authoring agent's route mount point — the one platform file that
// ships empty on purpose.
//
// PageRenderer (pinned platform code) statically imports this registry and,
// while rendering a primary-language route, looks up nativeRoutes by the
// route's engine-normalized path (trailing slash: "/", "/pricing/"). On a hit
// it renders the registered component as the whole page body inside the
// document shell (head metadata and SEO/schema). Everything visible and every
// script on the page (skip link, navigation, footer, sign-in, checkout,
// analytics, ads, the preview notice) is the registered component's own.
//
// Authoring contract:
// - Author route components as sibling files under components/native/ and
//   register them here; an unregistered component is dead code.
// - Read every word from the `content` prop (frozen copy) and style through
//   the design tokens; interactive tool surfaces must call the
//   capabilityRunners exported by ../../lib/capabilities and satisfy the
//   data-capability/data-operation attribute contract.
// - This module must always compile with `nativeRoutes` exported: the default
//   is an empty map, and an empty map renders the deterministic composition
//   for every route.

export type NativeRouteProps = {
  route: Route;
  content: PageContent;
  config: SiteConfig;
};

export const nativeRoutes: Record<string, ComponentType<NativeRouteProps>> = {};
