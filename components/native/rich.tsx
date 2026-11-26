import type { ReactNode } from "react";

/** Approved copy keeps its inline links in markdown; render them as real anchors. */
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

export function RichText({ text }: { text: string }) {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  LINK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const label = match[1];
    const href = match[2];
    nodes.push(
      <a key={`lnk-${key++}`} href={href}>
        {label}
      </a>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export type CopyItem = string | { title?: string; body?: string; text?: string };

export function itemTitle(item: CopyItem): string | null {
  return typeof item === "string" ? null : item.title ?? null;
}

export function itemBody(item: CopyItem): string {
  if (typeof item === "string") return item;
  return item.body ?? item.text ?? "";
}
