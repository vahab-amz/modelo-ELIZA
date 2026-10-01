import type { ReactNode } from "react";
import { normalizeWord, type CaptureTrace, type ElizaTrace, type ReflectedToken } from "@/lib/eliza";

export interface LastReply {
  text: string;
  trace: ElizaTrace;
}

interface TracePanelProps {
  id: string;
  open: boolean;
  reply: LastReply | null;
}

const STEPS = [
  {
    title: "Palabra clave",
    hint: "Busca palabras clave y se queda con la de mayor rango.",
    badge: "bg-orange",
  },
  {
    title: "Patrón",
    hint: "Descompone la frase con un patrón con comodines (*).",
    badge: "bg-teal",
  },
  {
    title: "Cambio de pronombres",
    hint: "Da la vuelta al fragmento: yo → tú, mi → tu, me → te…",
    badge: "bg-mustard",
  },
  {
    title: "Plantilla",
    hint: "Rellena una plantilla de respuesta con el fragmento.",
    badge: "bg-cream",
  },
] as const;

export function TracePanel({ id, open, reply }: TracePanelProps) {
  const trace = reply?.trace ?? null;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      hidden={!open}
      className="relative flex min-h-0 flex-col gap-3 overflow-y-auto rounded-[1.75rem] border-[3px] border-ink bg-ink p-5 text-panel text-cream shadow-flat lg:px-7 lg:py-5"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`${id}-title`} className="text-3xl leading-tight font-bold tracking-tight">
            Bajo el capó
          </h2>
          <p className="text-mist">Qué ha hecho ELIZA con tu último mensaje.</p>
        </div>
        <Cog />
      </header>

      {trace ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-mist">Entrada normalizada</span>
          <code className="rounded-lg bg-ink-deep px-3 py-1 font-mono break-words">
            {trace.normalized || "∅"}
          </code>
          <Badges trace={trace} />
        </div>
      ) : (
        <p className="rounded-xl border-2 border-dashed border-white/25 px-4 py-3 text-mist">
          Envía un mensaje (o pulsa una frase de la diapositiva) y aquí verás los cuatro pasos.
        </p>
      )}

      <ol className="flex flex-col gap-2.5">
        <Step n={1}>{trace && <KeywordStep trace={trace} />}</Step>
        <Step n={2}>{trace && <PatternStep trace={trace} />}</Step>
        <Step n={3}>{trace && <ReflectionStep trace={trace} />}</Step>
        <Step n={4}>{trace && reply && <TemplateStep trace={trace} text={reply.text} />}</Step>
      </ol>

      {trace?.memoryStored && (
        <p className="rounded-xl bg-ink-deep px-4 py-3 text-mist">
          <span className="font-semibold text-mustard">Guardado en memoria: </span>
          <span className="font-mono text-cream">«{trace.memoryStored}»</span>
        </p>
      )}
    </section>
  );
}

function Step({ n, children }: { n: 1 | 2 | 3 | 4; children: ReactNode }) {
  const step = STEPS[n - 1] ?? STEPS[0];
  return (
    <li className="rounded-2xl border-2 border-white/10 bg-ink-deep px-4 py-2.5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`grid size-9 shrink-0 place-items-center rounded-full text-xl font-bold text-ink ${step.badge}`}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl leading-9 font-semibold">
            <span className="sr-only">Paso {n}: </span>
            {step.title}
          </h3>
          {/* La explicación solo hace falta antes del primer mensaje. */}
          {children ? (
            <div className="mt-1.5 flex flex-col gap-2">{children}</div>
          ) : (
            <p className="text-[0.9em] text-mist">{step.hint}</p>
          )}
        </div>
      </div>
    </li>
  );
}

function Badges({ trace }: { trace: ElizaTrace }) {
  const badges: Array<{ label: string; className: string }> = [];
  if (trace.usedFallback) badges.push({ label: "Respuesta genérica", className: "bg-cream text-ink" });
  if (trace.usedMemory) badges.push({ label: "Memoria", className: "bg-mustard text-ink" });
  if (trace.safeReflection) badges.push({ label: "Reflexión segura", className: "bg-orange text-ink" });
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <span key={b.label} className={`rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wider ${b.className}`}>
          {b.label}
        </span>
      ))}
    </span>
  );
}

/* ---------------- Paso 1 ---------------- */

function KeywordStep({ trace }: { trace: ElizaTrace }) {
  const { keyword, candidates } = trace;
  if (!keyword) {
    return (
      <p>
        <strong>Ninguna.</strong>{" "}
        <span className="text-mist">
          {trace.usedMemory
            ? "Sin palabra clave, ELIZA tira de su memoria."
            : "Sin palabra clave, ELIZA responde con una frase genérica."}
        </span>
      </p>
    );
  }
  const matched = keyword.matched.toLocaleLowerCase("es");
  const isGroup = normalizeWord(matched) !== normalizeWord(keyword.key);
  const others = candidates.filter((c) => c.key !== keyword.key);

  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="rounded-lg bg-orange px-3 py-0.5 font-mono text-[1.25em] font-semibold text-ink">{matched}</span>
        <span>
          rango <strong className="text-[1.15em]">{keyword.rank}</strong>
        </span>
        {isGroup && <span className="text-mist">(grupo «{keyword.key}»)</span>}
      </p>
      {others.length > 0 && (
        <p className="text-mist">
          También encontró:{" "}
          {others.map((c, i) => (
            <span key={c.key}>
              {i > 0 && " · "}
              <span className="font-mono text-cream line-through decoration-orange decoration-2">
                {c.matched.toLocaleLowerCase("es")}
              </span>{" "}
              ({c.rank})
            </span>
          ))}
          . Gana la de mayor rango.
        </p>
      )}
    </>
  );
}

/* ---------------- Paso 2 ---------------- */

function PatternStep({ trace }: { trace: ElizaTrace }) {
  if (!trace.pattern) {
    return <p className="text-mist">No se aplica ningún patrón.</p>;
  }
  if (trace.usedMemory) {
    return (
      <>
        <code className="font-mono text-[1.2em] font-semibold">{trace.pattern}</code>
        <p className="text-mist">
          Guardado de un mensaje anterior: <span className="text-cream">«{trace.memorySource}»</span>
        </p>
      </>
    );
  }

  let captureIndex = 0;
  const parts = trace.pattern.split(" ").map((part, i) => {
    if (part === "*" || part.startsWith("@")) {
      const capture = trace.captures[captureIndex++];
      return <Slot key={i} part={part} capture={capture} />;
    }
    return (
      <span key={i} className="self-end rounded-lg bg-orange px-2 py-1 font-mono font-semibold text-ink">
        {part}
      </span>
    );
  });

  return (
    <>
      <code className="font-mono text-[1.2em] font-semibold">{trace.pattern}</code>
      <div className="flex flex-wrap items-stretch gap-2">{parts}</div>
    </>
  );
}

function Slot({ part, capture }: { part: string; capture: CaptureTrace | undefined }) {
  const empty = !capture || capture.before === "";
  return (
    <span className="flex min-w-[3.5rem] flex-col rounded-lg border-2 border-dashed border-teal px-2 py-1">
      <span className="font-mono text-[0.75em] text-mist">
        ({capture?.index ?? "?"}) {part}
      </span>
      <span className={`font-mono ${empty ? "text-mist" : ""}`}>{empty ? "∅" : capture.before}</span>
    </span>
  );
}

/* ---------------- Paso 3 ---------------- */

function ReflectionStep({ trace }: { trace: ElizaTrace }) {
  const { reflection } = trace;
  if (!reflection) {
    return <p className="text-mist">No hay fragmento que reflejar.</p>;
  }
  if (!reflection.used && !trace.safeReflection) {
    return (
      <p className="text-mist">
        <strong className="text-cream">No hace falta.</strong> La plantilla elegida no usa ningún trozo de tu
        frase, así que no hay pronombres que cambiar.
      </p>
    );
  }
  const changes = reflection.tokens.filter((t) => t.changed).length;

  return (
    <>
      <WordRow label="Antes" tokens={reflection.tokens} side="before" />
      <WordRow label="Después" tokens={reflection.tokens} side="after" />
      <p className="text-mist">
        {trace.safeReflection ? (
          <>
            <strong className="text-orange">No es seguro darle la vuelta:</strong> «
            {trace.unknownWords.join("», «")}» no está en el mapa de reflexión, así que ELIZA usa una
            plantilla que no repite el fragmento.
          </>
        ) : changes === 0 ? (
          "No hay pronombres que cambiar."
        ) : (
          `${changes} ${changes === 1 ? "palabra cambiada" : "palabras cambiadas"}.`
        )}
      </p>
    </>
  );
}

function WordRow({ label, tokens, side }: { label: string; tokens: ReflectedToken[]; side: "before" | "after" }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      <span className="w-[5.5em] shrink-0 text-sm font-semibold uppercase tracking-wider text-mist">{label}</span>
      {tokens.map((t, i) => {
        const word = side === "before" ? t.before : t.after;
        let className = "";
        if (t.unknown) className = "rounded bg-orange px-1 text-ink";
        else if (t.changed) {
          className =
            side === "after"
              ? "rounded bg-mustard px-1 font-semibold text-ink"
              : "rounded px-1 underline decoration-mustard decoration-2 underline-offset-4";
        }
        return (
          <span key={i} className={`font-mono ${className}`}>
            {word}
          </span>
        );
      })}
    </p>
  );
}

/* ---------------- Paso 4 ---------------- */

function TemplateStep({ trace, text }: { trace: ElizaTrace; text: string }) {
  const pieces = trace.template.split(/(\(\d+\))/);
  const note =
    trace.source === "memory"
      ? "Plantilla de memoria"
      : trace.source === "fallback"
        ? "Respuesta genérica"
        : trace.source === "safe"
          ? "Plantilla sin reflexión"
          : "Plantilla";

  return (
    <>
      <p className="font-mono text-[1.1em]">
        {pieces.map((piece, i) =>
          /^\(\d+\)$/.test(piece) ? (
            <span key={i} className="rounded bg-mustard px-1 font-semibold text-ink">
              {piece}
            </span>
          ) : (
            <span key={i}>{piece}</span>
          ),
        )}
      </p>
      <p className="flex items-baseline gap-2">
        <span aria-hidden="true" className="text-orange">
          →
        </span>
        <span className="sr-only">Respuesta: </span>
        <span className="font-mono font-semibold text-[1.1em]">{text}</span>
      </p>
      {trace.templateIndex !== null && trace.templateCount !== null && (
        <p className="text-mist">
          {note} {trace.templateIndex + 1} de {trace.templateCount} · rotan para no repetirse.
        </p>
      )}
    </>
  );
}

/** Engranaje decorativo, plano y geométrico. */
function Cog() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="size-14 shrink-0 lg:size-16">
      <g className="fill-teal">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="28" y="2" width="8" height="14" rx="2" transform={`rotate(${i * 45} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="20" className="fill-teal" />
      <circle cx="32" cy="32" r="9" className="fill-mustard" />
      <circle cx="32" cy="32" r="4" className="fill-ink" />
    </svg>
  );
}
