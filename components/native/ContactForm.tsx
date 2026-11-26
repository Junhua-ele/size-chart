"use client";

import { useState } from "react";
import type { UiStrings } from "../../lib/ui-strings";
import { formatMessage } from "../../lib/ui-strings";

type Status = { state: "idle" | "sending" | "sent" | "error"; text: string };

export function ContactForm({ t }: { t: UiStrings }) {
  const [status, setStatus] = useState<Status>({ state: "idle", text: "" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!email || !message) {
      setStatus({ state: "error", text: t.contactNeedsBoth });
      return;
    }
    setStatus({ state: "sending", text: t.contactSending });
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          message,
          name: String(data.get("name") ?? "").trim(),
          page: typeof window !== "undefined" ? window.location.pathname : "/contact/",
        }),
      });
      if (response.status === 429) {
        setStatus({ state: "error", text: t.contactRateLimited });
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      setStatus({ state: "sent", text: t.contactSent });
      form.reset();
    } catch {
      setStatus({ state: "error", text: t.contactFailed });
    }
  }

  return (
    <form className="contact-card" onSubmit={onSubmit} data-shipsite-contact>
      <label className="field">
        <span className="field-label">{t.contactName}</span>
        <input type="text" name="name" autoComplete="name" />
      </label>
      <label className="field">
        <span className="field-label">{t.contactEmail}</span>
        <input type="email" name="email" required autoComplete="email" />
      </label>
      <label className="field">
        <span className="field-label">{t.contactMessage}</span>
        <textarea name="message" required rows={7} />
      </label>
      <p
        className="contact-status"
        data-shipsite-status
        role="status"
        aria-live="polite"
        data-state={status.state === "sent" ? "sent" : status.state === "error" ? "error" : "idle"}
      >
        {status.text}
      </p>
      <button className="btn btn-primary" type="submit" disabled={status.state === "sending"}>
        {status.state === "sending" ? t.contactSending : t.contactSend}
      </button>
    </form>
  );
}
