// CSP script-src (CSP_SCRIPT_SRC wrangler var):
//   unset / anything else -> no script-src of either kind (the default). The
//                            enforced header still carries base-uri,
//                            object-src, frame-src, frame-ancestors and
//                            form-action on every response.
//   "enforce"             -> script-src joins the enforced header, by an
//                            explicit per-site decision.
// Enforcing by default is not safe yet: the sites' ad and analytics tags load
// scripts the allowlist cannot foresee, and a blocked script is a broken tool
// or lost revenue that nothing on the page reports.
// The enforce allowlist comes from dist/__shipsite/csp.json (written by the
// postbuild generate-csp-manifest.mjs). A missing manifest or an unmapped
// route fails open: no script-src is sent for that response.
const cspManifestCache = new WeakMap();

function loadCspManifest(env, requestUrl) {
  let cached = cspManifestCache.get(env.ASSETS);
  if (!cached) {
    cached = env.ASSETS.fetch(new URL("/__shipsite/csp.json", requestUrl))
      .then(async (response) => {
        if (!response.ok) throw new Error(`status_${response.status}`);
        const manifest = await response.json();
        if (!manifest || typeof manifest !== "object" || typeof manifest.routes !== "object" || manifest.routes === null) {
          throw new Error("malformed_manifest");
        }
        return manifest;
      })
      .catch((error) => {
        console.warn(`csp-manifest-unavailable: withholding script-src (fail-open): ${error?.message ?? error}`);
        return null;
      });
    cspManifestCache.set(env.ASSETS, cached);
  }
  return cached;
}

// Request pathname -> manifest route key. Must stay behavior-identical to
// routeKeyForDistPath in scripts/generate-csp-manifest.mjs.
export function cspRouteKey(pathname) {
  let path = pathname;
  if (path.endsWith("/index.html")) path = path.slice(0, -"/index.html".length);
  else if (path.endsWith(".html")) path = path.slice(0, -".html".length);
  while (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path === "" ? "/" : path;
}

// huggingface.co answers a model download whose Referer is a *.workers.dev
// page with a 404 and no CORS header, while the same request with no Referer
// gets its CDN redirect and Access-Control-Allow-Origin. A page on workers.dev
// therefore sends no Referer off its own origin; a site on its own domain
// keeps the default policy.
export function referrerPolicyFor(requestUrl) {
  let host = "";
  try { host = new URL(requestUrl).hostname.toLowerCase(); } catch { return "same-origin"; }
  return host === "workers.dev" || host.endsWith(".workers.dev") ? "same-origin" : "strict-origin-when-cross-origin";
}

// - A visitor or crawler on plain http is sent to https once, permanently.
//   Local hosts (wrangler dev, the local stack) keep http.
export function httpsRedirectFor(requestUrl) {
  let url;
  try { url = new URL(requestUrl); } catch { return null; }
  if (url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || /^[\d.]+$/.test(host) || host.startsWith("[")) return null;
  url.protocol = "https:";
  return url.toString();
}

// - A page or crawler request is moved with 301. Any other method (a webhook
//   or form POST sent to http) gets 308, because a 301 lets the client resend
//   it as a GET without its body.
export function httpsRedirectStatus(method) {
  return method === "GET" || method === "HEAD" ? 301 : 308;
}

// - The asset layer's trailing-slash redirect (/pricing -> /pricing/) is a
//   307, which says "temporary"; the slash URL is the canonical one for good.
export function permanentRedirectStatus(status) {
  return status === 307 ? 308 : status;
}

// - Hashed build output never changes under its name: cached for a year.
export function cacheControlFor(pathname, status) {
  return (status === 200 || status === 304) && (pathname.startsWith("/_next/static/") || pathname.startsWith("/__shipsite/static/")) ? "public, max-age=31536000, immutable" : null;
}

/* ------------------------------------------------------------------------ *
 * The site's backend: accounts, saved measurements, exports, checkout,
 * contact messages and the site's own event log. Everything is stored in the
 * site's own D1 database (binding DB); nothing is sent to Shipsite.
 * ------------------------------------------------------------------------ */

// The plans sold on /pricing/. Each tier's id is the id the page's checkout
// link carries; the entitlements are the numbers the pricing page prints.
const PLANS = {
  plus: { id: "plus", name: "Plus", amountCents: 799, currency: "USD", period: "month", months: 1, tier: "plus" },
  "plus-annual": { id: "plus-annual", name: "Plus (yearly)", amountCents: 7900, currency: "USD", period: "year", months: 12, tier: "plus" },
  pro: { id: "pro", name: "Pro", amountCents: 1499, currency: "USD", period: "month", months: 1, tier: "pro" },
  "pro-annual": { id: "pro-annual", name: "Pro (yearly)", amountCents: 14900, currency: "USD", period: "year", months: 12, tier: "pro" },
};

const ENTITLEMENTS = {
  free: {
    name: "Free",
    price: "$0",
    limits: { saved_profiles: 0, followed_brands: 0, comparison_pdf_exports_per_month: 0 },
    features: [
      "Every size chart in cm and inches, across women, men, shoes, bras, kids and rings, in US, UK, EU, IT, FR, AU, JP and CN sizing",
      "One size at a between-sizes boundary, with the rule that produced it",
      "A runs-small or runs-large note on every brand page",
      "Copy, print or screenshot the result with its source link and last-checked date",
      "No account, no card, and nothing metered",
    ],
  },
  plus: {
    name: "Plus",
    price: "$7.99 a month",
    introPrice: "$1 for the first month",
    limits: { saved_profiles: 5, followed_brands: 10, comparison_pdf_exports_per_month: 20 },
    features: [
      "Save 5 measurement profiles and reuse them on any chart",
      "Follow 10 brands, re-checked every 90 days and flagged when a chart changes",
      "20 printable comparison PDFs a month",
      "One sign-in that syncs your profiles and watchlist across devices",
    ],
  },
  pro: {
    name: "Pro",
    price: "$14.99 a month",
    introPrice: "$1 for the first month",
    limits: { saved_profiles: 20, followed_brands: 50, comparison_pdf_exports_per_month: 100 },
    features: [
      "Save 20 measurement profiles - you, a partner and the kids",
      "Follow 50 brands, re-checked every 90 days and flagged when a chart changes",
      "100 printable comparison PDFs a month",
      "One sign-in that syncs your profiles and watchlist across devices",
    ],
  },
};

// The tier a visitor holds, read from the subscription their sign-in owns.
async function planForUser(env, userId) {
  if (!env.DB || !userId) return "free";
  const row = await env.DB.prepare("SELECT plan_id, status, period_end FROM subscriptions WHERE user_id = ?").bind(userId).first();
  if (row && row.status === "active" && (!row.period_end || row.period_end > nowIso())) {
    return PLANS[row.plan_id]?.tier ?? "plus";
  }
  return "free";
}

function planLimitError(tier, key, limit) {
  const next = tier === "free" ? "Plus" : "Pro";
  return json(
    {
      ok: false,
      error: "plan_limit",
      limit,
      tier,
      upgrade: next,
      message: `Your plan keeps ${limit} ${key}. ${next} raises the cap - see ${next} on /pricing/.`,
    },
    402,
  );
}

const SESSION_COOKIE = "sc_session";
const SESSION_DAYS = 30;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });
}

function page(title, body, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${noindexMeta()}  <title>${escapeHtml(title)} · Size Chart</title>
<style>
:root{color-scheme:dark}
body{margin:0;background:#113b38;color:#f4f1e6;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:620px;margin:0 auto;padding:64px 20px 80px}
h1{font-size:32px;line-height:1.15;margin:0 0 14px}
p{margin:0 0 14px;color:#cfdfda}
a{color:#f5c449}
.links{margin-top:28px;display:flex;gap:20px;flex-wrap:wrap}
</style></head><body><main><h1>${escapeHtml(title)}</h1>${body}<div class="links"><a href="/">Size chart</a><a href="/pricing/">Pricing</a><a href="/contact/">Contact</a></div></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function noindexMeta() {
  return `<meta name="robots" content="noindex, nofollow">
`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function redirect(location, status = 303) {
  return new Response(null, { status, headers: { Location: location, "Cache-Control": "no-store" } });
}

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

async function readBody(request) {
  const type = request.headers.get("Content-Type") ?? "";
  if (type.includes("application/json")) {
    try { return await request.json(); } catch { return {}; }
  }
  if (type.includes("form-urlencoded") || type.includes("multipart/form-data")) {
    try { return Object.fromEntries(await request.formData()); } catch { return {}; }
  }
  try { return await request.json(); } catch { return {}; }
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function sessionCookie(token, maxAge = SESSION_DAYS * 86400) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

async function currentUser(request, env) {
  if (!env.DB) return null;
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?").bind(token).first();
  if (!row) return null;
  if (row.expires_at < nowIso()) return null;
  const user = await env.DB.prepare("SELECT id, email, name FROM users WHERE id = ?").bind(row.user_id).first();
  return user ?? null;
}

async function createSession(env, userId) {
  const token = newId().replace(/-/g, "") + newId().replace(/-/g, "");
  const created = new Date();
  const expires = new Date(created.getTime() + SESSION_DAYS * 86400000);
  await env.DB.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(token, userId, created.toISOString(), expires.toISOString())
    .run();
  return token;
}

function providerConfig(env) {
  const preview = env.SHIPSITE_ENVIRONMENT === "preview";
  const merchant = preview ? env.PAYMENT_TEST_MERCHANT_ID || env.PAYMENT_MERCHANT_ID : env.PAYMENT_MERCHANT_ID;
  const key = preview ? env.PAYMENT_TEST_PRIVATE_KEY || env.PAYMENT_PRIVATE_KEY : env.PAYMENT_PRIVATE_KEY;
  const webhookKey = preview ? env.PAYMENT_TEST_WEBHOOK_PUBLIC_KEY || env.PAYMENT_WEBHOOK_PUBLIC_KEY : env.PAYMENT_WEBHOOK_PUBLIC_KEY;
  const sandbox = preview || String(env.PAYMENT_TEST_MERCHANT_ID ?? "") === String(merchant ?? "");
  return {
    merchant: merchant || "",
    key: key || "",
    webhookKey: webhookKey || "",
    apiBase: sandbox ? "https://api-sandbox.waffo.com" : "https://api.waffo.com",
  };
}

function pemToBuffer(pem) {
  const body = String(pem).replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// Waffo signs each request with the merchant's private key (SHA256withRSA);
// the webhook it sends back is signed with Waffo's own key and verified here
// with the public key the owner copied from the Merchant Portal.
async function rsaSign(privatePem, data) {
  const key = await crypto.subtle.importKey("pkcs8", pemToBuffer(privatePem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  return toBase64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(data)));
}

function tierBase(tier) {
  return String(tier || "").replace(/-annual$/, "");
}

async function rsaVerify(publicPem, data, signatureBase64) {
  const key = await crypto.subtle.importKey("spki", pemToBuffer(publicPem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signature = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, new TextEncoder().encode(data));
}

async function waffoCall(config, path, payload) {
  const body = JSON.stringify(payload);
  const signature = await rsaSign(config.key, body);
  const response = await fetch(`${config.apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": config.merchant,
      "X-SIGNATURE": signature,
      "X-API-VERSION": "1.0.0",
    },
    body,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  return { ok: response.ok && parsed?.code === "0", status: response.status, data: parsed?.data ?? null, code: parsed?.code ?? null, raw: text };
}

function siteBase(request, env) {
  return (env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method.toUpperCase();

  // The site's own event log (analytics the site keeps itself).
  if (path === "/api/_site/events" && method === "POST") {
    const body = await readBody(request);
    const name = String(body.name ?? body.event ?? "").slice(0, 80);
    if (!name) return json({ ok: false, error: "name_required" }, 400);
    if (env.DB) {
      await env.DB.prepare("INSERT INTO events (id, name, path, props, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(newId(), name, String(body.path ?? url.pathname).slice(0, 200), JSON.stringify(body.props ?? {}).slice(0, 2000), nowIso())
        .run();
    }
    return json({ ok: true });
  }

  // Contact form -> contact_messages, so a real person answers a real inbox.
  if (path === "/api/contact" && method === "POST") {
    const body = await readBody(request);
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "email_invalid" }, 400);
    if (message.length < 4) return json({ ok: false, error: "message_required" }, 400);
    if (!env.DB) return json({ ok: false, error: "storage_unavailable" }, 503);
    await env.DB.prepare("INSERT INTO contact_messages (id, name, email, message, page, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(newId(), String(body.name ?? "").slice(0, 120), email.slice(0, 200), message.slice(0, 4000), String(body.page ?? "/contact/").slice(0, 200), nowIso())
      .run();
    return json({ ok: true });
  }

  if (path === "/api/pay/plan" && method === "GET") {
    const plans = Object.values(PLANS).map((plan) => ({
      id: plan.id,
      tier: plan.tier,
      name: plan.name,
      amount: plan.amountCents / 100,
      amountCents: plan.amountCents,
      currency: plan.currency,
      period: plan.period,
      months: plan.months,
      entitlements: ENTITLEMENTS[tierBase(plan.tier)].features,
      limits: ENTITLEMENTS[tierBase(plan.tier)].limits,
    }));
    // Every caller learns their own plan's limits, the free one included.
    let tier = "free";
    if (env.DB) {
      const user = await currentUser(request, env);
      if (user) tier = await planForUser(env, user.id);
    }
    return json({
      currency: "USD",
      plans,
      free: ENTITLEMENTS.free,
      tier,
      entitlements: ENTITLEMENTS[tier].features,
      limits: ENTITLEMENTS[tier].limits,
    });
  }

  if (path === "/api/pay/checkout" && method === "GET") {
    const planId = String(url.searchParams.get("plan") ?? "");
    const plan = PLANS[planId];
    if (!plan) return redirect(`${siteBase(request, env)}/pricing/`, 303);
    const config = providerConfig(env);
    if (!config.merchant || !config.key) {
      // No key on this Worker yet: a page in people's words, never raw JSON.
      return page(
        "Checkout opens shortly",
        `<p>Card checkout is not connected on this copy of the site yet, so nothing has been charged. The free lookup — one size, the between-sizes rule and the brand direction — works without an account and without paying.</p>
         <p>Write to us through the contact form and we will tell you the day ${escapeHtml(plan.name)} can be bought.</p>`,
        503,
      );
    }
    const merchantOrderId = `sc_${plan.id}_${Date.now().toString(36)}`;
    const base = siteBase(request, env);
    const result = await waffoCall(config, "/api/v1/order/create", {
      paymentRequestId: merchantOrderId,
      merchantOrderId,
      orderCurrency: plan.currency,
      orderAmount: (plan.amountCents / 100).toFixed(2),
      orderDescription: `Size Chart ${plan.name}`,
      orderRequestedAt: nowIso(),
      successRedirectUrl: `${base}/api/pay/return?order=${merchantOrderId}&plan=${plan.id}`,
      failedRedirectUrl: `${base}/api/pay/return?order=${merchantOrderId}&plan=${plan.id}&status=failed`,
      cancelRedirectUrl: `${base}/api/pay/return?order=${merchantOrderId}&plan=${plan.id}&status=cancelled`,
      notifyUrl: `${base}/api/pay/webhook`,
    });
    if (env.DB) {
      const user = await currentUser(request, env);
      await env.DB.prepare("INSERT INTO orders (id, user_id, plan_id, status, amount_cents, currency, provider, provider_ref, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(newId(), user?.id ?? null, plan.id, result.ok ? "pending" : "create_failed", plan.amountCents, plan.currency, "waffo", merchantOrderId, user?.email ?? null, nowIso(), nowIso())
        .run();
    }
    const checkoutUrl = result.data?.checkoutUrl || result.data?.paymentUrl || result.data?.payUrl || result.data?.redirectUrl || result.data?.cashierUrl;
    if (!result.ok || !checkoutUrl) {
      console.warn(`checkout-create-failed:${result.status}:${result.code ?? "no_code"}`);
      return page(
        "Checkout could not start",
        `<p>The payment page did not open, so nothing has been charged. Please try again in a minute, or write to us through the contact form and we will finish the order by hand.</p>`,
        502,
      );
    }
    return redirect(checkoutUrl, 303);
  }

  if (path === "/api/pay/return" && method === "GET") {
    const status = String(url.searchParams.get("status") ?? "success");
    const title = status === "success" ? "Thank you — your plan is being confirmed" : "The payment did not complete";
    const body = status === "success"
      ? `<p>Your payment went through. The plan is active on the account you paid with as soon as the payment notice reaches us — usually within a minute.</p><p>Your saved measurements and brand follows are now kept for you.</p>`
      : `<p>Nothing was charged. The free lookup still works, and you can try the checkout again from the pricing page.</p>`;
    return page(title, body, 200);
  }

  if (path === "/api/pay/webhook" && method === "POST") {
    const raw = await request.text();
    const signature = request.headers.get("X-SIGNATURE") ?? "";
    const config = providerConfig(env);
    // With no signing key on this Worker no notice can be verified, so the
    // request is refused the way a bad signature is: a refusal, not a fault.
    if (!config.webhookKey) return json({ ok: false, error: "signature_invalid" }, 400);
    let valid = false;
    try { valid = await rsaVerify(config.webhookKey, raw, signature); } catch { valid = false; }
    if (!valid) {
      console.warn("webhook-signature-invalid");
      return json({ ok: false, error: "signature_invalid" }, 400);
    }
    let event = {};
    try { event = JSON.parse(raw); } catch { event = {}; }
    const type = String(event.eventType ?? event.type ?? event.event ?? "");
    const data = event.data ?? event;
    const orderRef = String(data.merchantOrderId ?? data.orderId ?? "");
    const planId = String(data.planId ?? data.reference ?? "").includes("plus-annual") ? "plus-annual" : "";
    const status = /success|paid|complete|succeed/i.test(String(data.status ?? data.orderStatus ?? type)) ? "paid" : "pending";
    if (env.DB && orderRef) {
      const existing = await env.DB.prepare("SELECT id, plan_id, user_id FROM orders WHERE provider_ref = ?").bind(orderRef).first();
      if (existing) {
        await env.DB.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").bind(status, nowIso(), existing.id).run();
        if (status === "paid" && existing.user_id) {
          const plan = PLANS[existing.plan_id];
          const periodEnd = new Date(Date.now() + (plan?.months ?? 1) * 30 * 86400000).toISOString();
          await env.DB.prepare("INSERT INTO subscriptions (user_id, plan_id, status, period_end, provider_ref, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET plan_id = excluded.plan_id, status = excluded.status, period_end = excluded.period_end, provider_ref = excluded.provider_ref, updated_at = excluded.updated_at")
            .bind(existing.user_id, existing.plan_id, "active", periodEnd, orderRef, nowIso())
            .run();
        }
      } else if (planId) {
        await env.DB.prepare("INSERT INTO orders (id, user_id, plan_id, status, currency, provider, provider_ref, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(newId(), data.userId ?? null, planId, status, "USD", "waffo", orderRef, nowIso(), nowIso())
          .run();
      }
    }
    return json({ code: "0", ok: true });
  }

  if (path === "/api/pay/portal" && method === "GET") {
    const user = await currentUser(request, env);
    const config = providerConfig(env);
    if (!user) return redirect(`${siteBase(request, env)}/pricing/`, 303);
    if (!config.merchant || !config.key) {
      return page("Manage your plan", `<p>Your plan is managed on the payment provider's own page. Open the link in the receipt email you were sent, or write to us through the contact form and we will cancel or change the plan for you.</p>`, 200);
    }
    const result = await waffoCall(config, "/api/v1/subscription/manage", { merchantUserId: user.id, subscriptionManagementUrl: `${siteBase(request, env)}/api/pay/portal` });
    const manageUrl = result.data?.managementUrl || result.data?.url || result.data?.redirectUrl;
    if (result.ok && manageUrl) return redirect(manageUrl, 303);
    return page("Manage your plan", `<p>We could not open the management page just now. Write to us through the contact form and we will cancel or change the plan for you.</p>`, 200);
  }

  // ---- accounts --------------------------------------------------------

  if ((path === "/api/auth/google" || path === "/api/auth/google/start") && method === "GET") {
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return page("Sign-in opens shortly", `<p>Google sign-in is not connected on this copy of the site yet. Everything the tool does works without an account: the lookup, the between-sizes rule, the brand direction, copying and printing.</p><p>An account only keeps saved measurements and the brands you follow, so nothing you came for waits on it.</p>`, 503);
    }
    const base = siteBase(request, env);
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", `${base}/api/auth/google/callback`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("access_type", "online");
    authUrl.searchParams.set("prompt", "select_account");
    return redirect(authUrl.toString(), 302);
  }

  if (path === "/api/auth/google/callback" && method === "GET") {
    const code = url.searchParams.get("code");
    const clientId = env.GOOGLE_CLIENT_ID;
    const clientSecret = env.GOOGLE_CLIENT_SECRET;
    if (!code || !clientId || !clientSecret) return page("Sign-in did not complete", `<p>The sign-in did not complete. Nothing changed on your account; the tool still works without one.</p>`, 400);
    const base = siteBase(request, env);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${base}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenResponse.json().catch(() => ({}));
    if (!tokens.access_token) return page("Sign-in did not complete", `<p>Google did not confirm the sign-in. Nothing changed on your account; the tool still works without one.</p>`, 400);
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileResponse.json().catch(() => ({}));
    const email = String(profile.email ?? "");
    if (!email || !env.DB) return page("Sign-in did not complete", `<p>We could not read the email address from Google. Nothing changed on your account.</p>`, 400);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    const userId = existing?.id ?? newId();
    if (!existing) {
      await env.DB.prepare("INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)").bind(userId, email, String(profile.name ?? "").slice(0, 120), nowIso()).run();
    }
    const token = await createSession(env, userId);
    return new Response(null, { status: 303, headers: { Location: `${base}/`, "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } });
  }

  if (path === "/api/auth/me" && method === "GET") {
    const user = await currentUser(request, env);
    if (!user) return json({ signedIn: false });
    let plan = "free";
    let periodEnd = null;
    if (env.DB) {
      const row = await env.DB.prepare("SELECT plan_id, status, period_end FROM subscriptions WHERE user_id = ?").bind(user.id).first();
      if (row && row.status === "active" && (!row.period_end || row.period_end > nowIso())) {
        plan = PLANS[row.plan_id]?.tier ?? "plus";
        periodEnd = row.period_end;
      }
    }
    return json({ signedIn: true, user: { email: user.email, name: user.name }, plan, periodEnd });
  }

  if (path === "/api/auth/signout" && method === "POST") {
    const token = getCookie(request, SESSION_COOKIE);
    if (token && env.DB) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
  }

  // ---- saved measurements, brands, exports -----------------------------

  const me = path.startsWith("/api/me/") ? await currentUser(request, env) : null;
  if (path.startsWith("/api/me/") && !me) return json({ ok: false, error: "sign_in_required" }, 401);

  if (path === "/api/me/profiles" && method === "GET") {
    const rows = await env.DB.prepare("SELECT id, label, category, market, worn_size, bust, waist, hip, foot, unit, created_at FROM saved_profiles WHERE user_id = ? ORDER BY created_at DESC").bind(me.id).all();
    return json({ ok: true, profiles: rows.results ?? [] });
  }

  if (path === "/api/me/profiles" && method === "POST") {
    const body = await readBody(request);
    const label = String(body.label ?? "").trim().slice(0, 60);
    const category = String(body.category ?? "").trim().slice(0, 60);
    if (!label || !category) return json({ ok: false, error: "label_and_category_required" }, 400);
    const tier = await planForUser(env, me.id);
    const cap = ENTITLEMENTS[tier].limits.saved_profiles;
    const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM saved_profiles WHERE user_id = ?").bind(me.id).first();
    if ((used?.n ?? 0) >= cap) return planLimitError(tier, "saved profiles", cap);
    const num = (value) => (value === undefined || value === null || value === "" ? null : Number(value));
    const id = newId();
    await env.DB.prepare("INSERT INTO saved_profiles (id, user_id, label, category, market, worn_size, bust, waist, hip, foot, unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, me.id, label, category, String(body.market ?? "").slice(0, 60), String(body.wornSize ?? "").slice(0, 30), num(body.bust), num(body.waist), num(body.hip), num(body.foot), String(body.unit ?? "cm").slice(0, 4), nowIso())
      .run();
    return json({ ok: true, id });
  }

  const profileMatch = path.match(/^\/api\/me\/profiles\/([A-Za-z0-9-]+)$/);
  if (profileMatch && method === "DELETE") {
    await env.DB.prepare("DELETE FROM saved_profiles WHERE id = ? AND user_id = ?").bind(profileMatch[1], me.id).run();
    return json({ ok: true });
  }

  if (path === "/api/me/brands" && method === "GET") {
    const rows = await env.DB.prepare("SELECT slug, created_at FROM saved_brands WHERE user_id = ? ORDER BY created_at DESC").bind(me.id).all();
    return json({ ok: true, brands: rows.results ?? [] });
  }

  if (path === "/api/me/brands" && method === "POST") {
    const body = await readBody(request);
    const slug = String(body.slug ?? "").trim().slice(0, 80);
    if (!slug) return json({ ok: false, error: "slug_required" }, 400);
    const tier = await planForUser(env, me.id);
    const cap = ENTITLEMENTS[tier].limits.followed_brands;
    const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM saved_brands WHERE user_id = ?").bind(me.id).first();
    const already = await env.DB.prepare("SELECT 1 AS n FROM saved_brands WHERE user_id = ? AND slug = ?").bind(me.id, slug).first();
    if (!already && (used?.n ?? 0) >= cap) return planLimitError(tier, "followed brands", cap);
    await env.DB.prepare("INSERT INTO saved_brands (user_id, slug, created_at) VALUES (?, ?, ?) ON CONFLICT(user_id, slug) DO NOTHING").bind(me.id, slug, nowIso()).run();
    return json({ ok: true });
  }

  const brandMatch = path.match(/^\/api\/me\/brands\/([A-Za-z0-9_-]+)$/);
  if (brandMatch && method === "DELETE") {
    await env.DB.prepare("DELETE FROM saved_brands WHERE user_id = ? AND slug = ?").bind(me.id, brandMatch[1]).run();
    return json({ ok: true });
  }

  if (path === "/api/me/exports" && method === "POST") {
    const body = await readBody(request);
    const kind = String(body.kind ?? "comparison").slice(0, 60);
    const format = String(body.format ?? "pdf").slice(0, 20);
    const tier = await planForUser(env, me.id);
    const cap = ENTITLEMENTS[tier].limits.comparison_pdf_exports_per_month;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM exports WHERE user_id = ? AND created_at >= ?").bind(me.id, monthStart.toISOString()).first();
    if ((used?.n ?? 0) >= cap) return planLimitError(tier, "comparison PDFs a month", cap);
    const id = newId();
    await env.DB.prepare("INSERT INTO exports (id, user_id, kind, format, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, me.id, kind, format, nowIso()).run();
    return json({ ok: true, id });
  }

  return null;
}

export default {
  async fetch(request, env) {
    const secureUrl = httpsRedirectFor(request.url);
    if (secureUrl) return new Response(null, { status: httpsRedirectStatus(request.method), headers: { Location: secureUrl, "Cache-Control": "public, max-age=3600" } });

    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      try {
        const apiResponse = await handleApi(request, env, url);
        if (apiResponse) {
          const apiHeaders = new Headers(apiResponse.headers);
          apiHeaders.set("X-Content-Type-Options", "nosniff");
          apiHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
          if (env.SHIPSITE_ENVIRONMENT !== "preview") apiHeaders.set("X-Frame-Options", "DENY");
          return new Response(apiResponse.body, { status: apiResponse.status, headers: apiHeaders });
        }
      } catch (error) {
        console.error(`api-error:${url.pathname}:${error?.message ?? error}`);
        return json({ ok: false, error: "server_error" }, 500);
      }
      return json({ ok: false, error: "not_found" }, 404);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    const cacheControl = cacheControlFor(url.pathname, response.status);
    if (cacheControl) headers.set("Cache-Control", cacheControl);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "text/plain; charset=utf-8");
    const preview = env.SHIPSITE_ENVIRONMENT === "preview";
    headers.set("Content-Security-Policy", `base-uri 'self'; object-src 'none'; frame-src 'self' https://www.youtube-nocookie.com; frame-ancestors ${preview ? "https://shipsite.ai https://www.shipsite.ai" : "'none'"}; form-action 'self' https://accounts.google.com https://connect.stripe.com`);
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    headers.set("X-Content-Type-Options", "nosniff");
    if (!preview) headers.set("X-Frame-Options", "DENY");
    else headers.delete("X-Frame-Options");
    headers.set("Referrer-Policy", referrerPolicyFor(request.url));
    headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
    if (env.CF_VERSION_METADATA?.id) headers.set("X-Shipsite-Worker-Version", env.CF_VERSION_METADATA.id);
    // A preview (any host that is not the site's production address) keeps
    // every page out of search.
    if (preview) headers.set("X-Robots-Tag", "noindex, nofollow");
    const enforceScriptSrc = String(env.CSP_SCRIPT_SRC ?? "").toLowerCase() === "enforce";
    if (enforceScriptSrc && (headers.get("Content-Type") ?? "").toLowerCase().includes("text/html")) {
      const manifest = await loadCspManifest(env, request.url);
      const routeKey = response.status === 404 ? "/404" : cspRouteKey(url.pathname);
      const hashes = manifest?.routes?.[routeKey];
      if (Array.isArray(hashes)) {
        const hosts = Array.isArray(manifest.hosts) ? manifest.hosts : [];
        const scriptSrc = ["script-src 'self' 'wasm-unsafe-eval' blob:", ...hosts, ...hashes.map((hash) => `'${hash}'`)].join(" ");
        headers.set("Content-Security-Policy", `${headers.get("Content-Security-Policy")}; ${scriptSrc}; worker-src 'self' blob:`);
      } else if (manifest) {
        console.warn(`csp-route-unmapped:${routeKey} — withholding script-src (fail-open)`);
      }
    }
    const status = permanentRedirectStatus(response.status);
    return new Response(response.body, { status, statusText: status === response.status ? response.statusText : "Permanent Redirect", headers });
  },
};
