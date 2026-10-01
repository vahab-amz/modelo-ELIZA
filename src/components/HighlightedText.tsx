import type { ReactNode } from "react";
import type { KeywordHighlight } from "@/lib/eliza";

interface HighlightedTextProps {
  text: string;
  highlights: readonly KeywordHighlight[];
}

/** Mensaje del usuario con sus palabras clave marcadas en naranja. */
export function HighlightedText({ text, highlights }: HighlightedTextProps) {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const h of highlights) {
    if (h.start < cursor) continue;
    if (h.start > cursor) parts.push(text.slice(cursor, h.start));
    parts.push(
      <mark
        key={h.start}
        title={`Palabra clave «${h.key}» · rango ${h.rank}${h.selected ? " · elegida" : ""}`}
        className={
          h.selected
            ? "rounded-[0.2em] bg-orange px-[0.1em] font-semibold text-ink box-decoration-clone"
            : "bg-transparent text-ink underline decoration-orange decoration-[0.14em] underline-offset-[0.22em]"
        }
      >
        {text.slice(h.start, h.end)}
      </mark>,
    );
    cursor = h.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}
