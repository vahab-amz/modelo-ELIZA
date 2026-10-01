"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const MS_PER_CHAR = 26;
const START_DELAY_MS = 260;

interface TypewriterProps {
  text: string;
  /** Escribir letra a letra (solo el último mensaje de ELIZA). */
  animate: boolean;
}

/**
 * Efecto de teletipo sin saltos de maquetación: el texto completo se pinta
 * desde el principio y lo que falta por «escribir» queda invisible, así que
 * la línea ocupa su sitio definitivo desde el primer fotograma.
 */
export function Typewriter({ text, animate }: TypewriterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const active = animate && !reducedMotion;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let startedAt: number | undefined;

    const tick = (now: number) => {
      startedAt ??= now;
      const elapsed = now - startedAt - START_DELAY_MS;
      const next = Math.min(text.length, Math.max(0, Math.floor(elapsed / MS_PER_CHAR)));
      setCount(next);
      if (next < text.length) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, text]);

  const shown = active ? count : text.length;
  const typing = shown < text.length;

  return (
    <>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        {typing && (
          // `key` nuevo en cada letra: el cursor es un elemento nuevo, no uno que
          // «se mueve», así que no cuenta como desplazamiento de diseño (CLS 0).
          <span key={shown} className="relative inline-block w-0">
            <span className="absolute -bottom-[0.22em] left-0 h-[1.12em] w-[0.6ch] animate-blink bg-orange motion-reduce:animate-none" />
          </span>
        )}
        <span className="invisible">{text.slice(shown)}</span>
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
