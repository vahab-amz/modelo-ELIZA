"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { DOCTOR_ES, Eliza, type KeywordHighlight } from "@/lib/eliza";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { HighlightedText } from "./HighlightedText";
import { TracePanel, type LastReply } from "./TracePanel";
import { Typewriter } from "./Typewriter";

/** Las tres frases de las diapositivas, en orden. */
const SLIDE_LINES = [
  "Mi jefe nunca me escucha.",
  "Porque siempre está ocupado.",
  "Me recuerda a mi madre.",
] as const;

const PANEL_ID = "bajo-el-capo";

interface Message {
  id: number;
  role: "eliza" | "user";
  text: string;
  highlights?: KeywordHighlight[];
  animate: boolean;
}

const GREETING: Message = { id: 0, role: "eliza", text: DOCTOR_ES.greeting, animate: false };

export function ElizaDemo() {
  const engine = useRef<Eliza | null>(null);
  const nextId = useRef(1);
  const paper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [lastReply, setLastReply] = useState<LastReply | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [slideStep, setSlideStep] = useState(0);

  // Cada línea reserva su espacio al aparecer, así que basta con bajar una vez por mensaje.
  useEffect(() => {
    const el = paper.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages.length, reducedMotion]);

  function send(raw: string) {
    const text = raw.trim();
    if (!text) return;
    engine.current ??= new Eliza();
    const reply = engine.current.reply(text);
    const id = nextId.current;
    nextId.current += 2;

    setMessages((prev) => [
      ...prev,
      { id, role: "user", text, highlights: reply.highlights, animate: false },
      { id: id + 1, role: "eliza", text: reply.text, animate: true },
    ]);
    setLastReply({ text: reply.text, trace: reply.trace });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(draft);
    setDraft("");
  }

  function sendSlideLine(index: number) {
    const line = SLIDE_LINES[index];
    if (!line) return;
    send(line);
    setSlideStep(index + 1);
  }

  function reset() {
    engine.current?.reset();
    setMessages([GREETING]);
    setLastReply(null);
    setDraft("");
    setSlideStep(0);
    input.current?.focus();
  }

  const lastElizaId = messages.findLast((m) => m.role === "eliza")?.id;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip lg:h-dvh">
      <Decorations />

      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pt-4 pb-3 lg:px-8 lg:pt-6 lg:pb-5">
        <div className="flex items-center gap-4">
          <Starburst />
          <div>
            <h1 className="text-4xl leading-none font-bold tracking-tight lg:text-5xl">
              ELIZA <span className="font-medium text-ink-soft">1966</span>
            </h1>
            <p className="mt-1 text-base text-ink-soft lg:text-lg">
              Joseph Weizenbaum · MIT · guion DOCTOR en español.{" "}
              <strong className="font-semibold text-ink">Sin IA: solo reglas.</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full border-[3px] border-ink bg-paper px-5 py-2 text-lg font-semibold text-ink shadow-flat-sm transition-transform hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none"
          >
            <span aria-hidden="true">↺ </span>Reiniciar
          </button>
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls={PANEL_ID}
            onClick={() => setPanelOpen((open) => !open)}
            className="flex items-center gap-3 rounded-full border-[3px] border-ink bg-ink py-2 pr-5 pl-2.5 text-lg font-semibold text-cream shadow-flat-sm transition-transform hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none"
          >
            <span
              aria-hidden="true"
              className={`flex h-7 w-12 items-center rounded-full p-1 ${panelOpen ? "justify-end bg-teal" : "justify-start bg-ink-soft"}`}
            >
              <span className="size-5 rounded-full bg-cream" />
            </span>
            Bajo el capó
          </button>
        </div>
      </header>

      <main
        className={`grid flex-1 grid-cols-1 gap-5 px-4 pb-6 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] lg:gap-7 lg:px-8 lg:pb-8 ${
          panelOpen ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]" : "lg:grid-cols-1"
        }`}
      >
        <section
          aria-labelledby="teletipo-title"
          className={`flex min-h-0 flex-col gap-4 ${panelOpen ? "" : "lg:mx-auto lg:w-full lg:max-w-6xl"}`}
        >
          <h2 id="teletipo-title" className="sr-only">
            Conversación con ELIZA
          </h2>

          <div
            ref={paper}
            role="log"
            tabIndex={0}
            aria-label="Conversación con ELIZA"
            className="paper-perforated relative h-[58svh] min-h-80 overflow-y-auto rounded-[1.25rem] border-[3px] border-ink px-[calc(var(--strip)+0.75rem)] py-5 font-mono text-chat shadow-flat lg:h-auto lg:min-h-64 lg:flex-1 lg:px-[calc(var(--strip)+1rem)] lg:py-7"
          >
            <ol className="flex flex-col gap-3 lg:gap-4">
              {messages.map((m) => (
                <li key={m.id} className="flex items-start gap-3 lg:gap-4">
                  <span
                    className={`mt-[0.3em] w-[4.8em] shrink-0 rounded-md py-0.5 text-center font-sans text-[0.62em] font-bold tracking-[0.18em] ${
                      m.role === "eliza" ? "bg-mustard text-ink" : "border-2 border-ink text-ink"
                    }`}
                  >
                    {m.role === "eliza" ? "ELIZA" : "TÚ"}
                  </span>
                  <p className={`min-w-0 flex-1 break-words ${m.role === "eliza" ? "font-semibold" : ""}`}>
                    {m.role === "user" ? (
                      <HighlightedText text={m.text} highlights={m.highlights ?? []} />
                    ) : (
                      <Typewriter text={m.text} animate={m.animate && m.id === lastElizaId} />
                    )}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-bold tracking-wider text-ink-soft uppercase">Diapositiva</span>
            {SLIDE_LINES.map((line, i) => {
              const isNext = i === slideStep;
              const done = i < slideStep;
              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => sendSlideLine(i)}
                  className={`flex items-center gap-2 rounded-xl border-[3px] border-ink px-3 py-1.5 text-left font-medium shadow-flat-sm transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none ${
                    isNext ? "bg-orange text-ink" : done ? "bg-cream text-ink-soft" : "bg-paper text-ink"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      done ? "bg-teal text-ink" : "bg-ink text-cream"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span>
                    <span className="sr-only">Frase {i + 1}: </span>
                    {line}
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 lg:gap-3">
            <label htmlFor="mensaje" className="sr-only">
              Tu mensaje para ELIZA
            </label>
            <input
              ref={input}
              id="mensaje"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe aquí y pulsa Enter…"
              autoComplete="off"
              enterKeyHint="send"
              maxLength={300}
              className="min-w-0 flex-1 rounded-xl border-[3px] border-ink bg-paper px-4 py-2.5 font-mono text-chat text-ink shadow-flat-sm placeholder:text-ink-soft"
            />
            <button
              type="submit"
              className="rounded-xl border-[3px] border-ink bg-orange px-5 text-lg font-bold text-ink shadow-flat-sm transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none lg:px-7"
            >
              Enviar
            </button>
          </form>
        </section>

        <TracePanel id={PANEL_ID} open={panelOpen} reply={lastReply} />
      </main>
    </div>
  );
}

/** Estrella «atómica» de los años 50-60. */
function Starburst() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="size-12 shrink-0 text-ink lg:size-16">
      <circle cx="32" cy="32" r="30" className="fill-mustard" />
      <path
        d="M32 8 L36 28 L56 32 L36 36 L32 56 L28 36 L8 32 L28 28 Z"
        className="fill-orange"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="4" className="fill-ink" />
    </svg>
  );
}

/** Formas planas de fondo: puramente decorativas. */
function Decorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-24 size-[26rem] rounded-full bg-mustard/45" />
      <div className="absolute top-24 -right-10 size-28 rounded-full border-[6px] border-teal/40" />
      <div className="absolute -bottom-32 -left-24 size-80 rounded-full bg-teal/15" />
    </div>
  );
}
