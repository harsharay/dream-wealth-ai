import type { ReactNode } from "react";

const MAX_BULLETS = 5;

/** Split dense insight strings into short, scannable bullets. */
export function splitInsightItems(items: string[] | undefined, max = MAX_BULLETS): string[] {
  if (!items?.length) return [];

  const sentences: string[] = [];
  for (const item of items) {
    const trimmed = item.replace(/\s+/g, " ").trim();
    if (!trimmed) continue;

    const parts = trimmed
      .split(/(?<=[.?!])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      sentences.push(...parts);
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences.slice(0, max);
}

export function renderBoldMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}
