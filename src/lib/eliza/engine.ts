import { normalizeWord, tokenize } from "./normalize";
import { reflectClause, summarizeReflection, type ReflectionResult } from "./reflection";
import { DOCTOR_ES } from "./script-doctor";
import { isPronounMi, looksLikeClause } from "./spanish";
import type {
  CaptureTrace,
  ElizaReply,
  ElizaTrace,
  KeywordHighlight,
  KeywordSpec,
  KeywordTrace,
  ReflectedToken,
  ScriptSpec,
  Template,
  TemplateNeed,
  Token,
} from "./types";

/* ------------------------------------------------------------------ */
/* Compilación del guion                                              */
/* ------------------------------------------------------------------ */

type PatternElement =
  | { kind: "wildcard" }
  | { kind: "class"; name: string; words: ReadonlySet<string> }
  | { kind: "literal"; word: string };

interface CompiledTemplate {
  text: string;
  needs?: TemplateNeed;
  /** Huecos que usa la plantilla: «(2)» → [2]. */
  refs: number[];
}

interface CompiledDecomposition {
  pattern: string;
  elements: PatternElement[];
  templates: CompiledTemplate[];
}

interface CompiledKeyword {
  id: number;
  spec: KeywordSpec;
  decompositions: CompiledDecomposition[];
}

interface CompiledScript {
  spec: ScriptSpec;
  /** Primera palabra normalizada → variantes de palabra clave que empiezan por ella. */
  byFirstWord: Map<string, Array<{ keyword: CompiledKeyword; words: string[] }>>;
}

const SLOT_RE = /\((\d+)\)/g;

function compileTemplate(template: Template): CompiledTemplate {
  const spec = typeof template === "string" ? { text: template } : template;
  const refs = [...spec.text.matchAll(SLOT_RE)].map((m) => Number(m[1]));
  return { text: spec.text, needs: spec.needs, refs };
}

function compilePattern(pattern: string, classes: Record<string, ReadonlySet<string>>): PatternElement[] {
  return pattern.split(/\s+/).map((part): PatternElement => {
    if (part === "*") return { kind: "wildcard" };
    if (part.startsWith("@")) {
      const name = part.slice(1);
      const words = classes[name];
      if (!words) throw new Error(`Clase desconocida en el patrón «${pattern}»: @${name}`);
      return { kind: "class", name, words };
    }
    return { kind: "literal", word: normalizeWord(part) };
  });
}

function compileScript(spec: ScriptSpec): CompiledScript {
  const classes = Object.fromEntries(
    Object.entries(spec.classes).map(([name, words]) => [name, new Set(words.map(normalizeWord))]),
  );
  const byFirstWord: CompiledScript["byFirstWord"] = new Map();

  spec.keywords.forEach((keywordSpec, id) => {
    const keyword: CompiledKeyword = {
      id,
      spec: keywordSpec,
      decompositions: keywordSpec.decompositions.map((d) => ({
        pattern: d.pattern,
        elements: compilePattern(d.pattern, classes),
        templates: d.templates.map(compileTemplate),
      })),
    };
    const variants = new Set(keywordSpec.words.map((w) => normalizeWord(w)));
    for (const variant of variants) {
      const words = variant.split(/\s+/);
      const first = words[0]!;
      const list = byFirstWord.get(first) ?? [];
      list.push({ keyword, words });
      byFirstWord.set(first, list);
    }
  });

  return { spec, byFirstWord };
}

/* ------------------------------------------------------------------ */
/* Emparejamiento de patrones                                         */
/* ------------------------------------------------------------------ */

interface Group {
  kind: "wildcard" | "class";
  start: number;
  end: number;
}

/**
 * Empareja un patrón con las palabras de una cláusula. Los comodines son
 * perezosos (prueban primero el tramo más corto), así que «* mi *» se
 * ancla en el primer «mi».
 */
function matchPattern(elements: readonly PatternElement[], tokens: readonly Token[]): Group[] | null {
  const groups: Group[] = [];

  const step = (ei: number, ti: number): boolean => {
    const element = elements[ei];
    if (!element) return ti === tokens.length;

    if (element.kind === "wildcard") {
      for (let end = ti; end <= tokens.length; end++) {
        groups.push({ kind: "wildcard", start: ti, end });
        if (step(ei + 1, end)) return true;
        groups.pop();
      }
      return false;
    }

    const token = tokens[ti];
    if (!token) return false;

    if (element.kind === "class") {
      if (!element.words.has(token.norm)) return false;
      groups.push({ kind: "class", start: ti, end: ti + 1 });
      if (step(ei + 1, ti + 1)) return true;
      groups.pop();
      return false;
    }

    return token.norm === element.word && step(ei + 1, ti + 1);
  };

  return step(0, 0) ? groups : null;
}

/* ------------------------------------------------------------------ */
/* Utilidades de texto                                                */
/* ------------------------------------------------------------------ */

/** Limpia espacios, contrae «de el» → «del» y pone la mayúscula inicial. */
function finalize(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([?.!,;:])/g, "$1")
    .replace(/([¿¡])\s+/g, "$1")
    .replace(/(^|\s)de el(?=\s|[?.!,;:]|$)/g, "$1del")
    .replace(/(^|\s)a el(?=\s|[?.!,;:]|$)/g, "$1al")
    .trim()
    .replace(/^([¿¡]?)(\p{Ll})/u, (_, mark: string, letter: string) => mark + letter.toLocaleUpperCase("es"));
}

function fillTemplate(text: string, slots: ReadonlyMap<number, string>): string {
  return finalize(text.replace(SLOT_RE, (_, n: string) => slots.get(Number(n)) ?? ""));
}

/* ------------------------------------------------------------------ */
/* Motor                                                              */
/* ------------------------------------------------------------------ */

interface Hit {
  keyword: CompiledKeyword;
  clauseIndex: number;
  tokens: Token[];
  /** Posición en el texto original, para desempatar por orden de aparición. */
  start: number;
  end: number;
}

interface Capture {
  index: number;
  kind: Group["kind"];
  tokens: Token[];
  reflection: ReflectionResult;
}

interface MemoryItem {
  plural: boolean;
  reflection: ReflectionResult;
  sourceInput: string;
}

type TemplateStatus = "ok" | "empty" | "mismatch" | "unsafe";

function templateStatus(template: CompiledTemplate, captures: readonly Capture[]): TemplateStatus {
  let unsafe = false;
  for (const ref of template.refs) {
    const capture = captures[ref - 1];
    if (!capture || capture.tokens.length === 0) return "empty";
    if (template.needs) {
      const isClause = looksLikeClause(capture.tokens);
      if ((template.needs === "clause") !== isClause) return "mismatch";
    }
    if (!capture.reflection.safe) unsafe = true;
  }
  return unsafe ? "unsafe" : "ok";
}

function toCaptureTrace(capture: Capture, used: boolean): CaptureTrace {
  return {
    index: capture.index,
    kind: capture.kind,
    before: capture.reflection.before,
    after: capture.reflection.after,
    tokens: capture.reflection.tokens,
    used,
    safe: capture.reflection.safe,
  };
}

function keywordTrace(hit: Hit): KeywordTrace {
  return {
    key: hit.keyword.spec.key,
    matched: hit.tokens.map((t) => t.text).join(" "),
    rank: hit.keyword.spec.rank,
  };
}

const MEMORY_LIMIT = 5;

/**
 * Palabras que pueden ir delante de «mi» al guardar en memoria. Así se
 * guarda «Y mi jefe me odia» pero no «Quiero que mi jefe me escuche»
 * (subjuntivo: «Antes dijiste que tu jefe te escuche» sonaría mal).
 */
const MEMORY_LEAD_WORDS = new Set([
  "y", "pues", "bueno", "ademas", "ahora", "hoy", "ayer", "es", "que", "creo", "mira", "oye",
]);

export class Eliza {
  private readonly script: CompiledScript;
  /** Siguiente plantilla de cada descomposición (las plantillas rotan). */
  private cursors = new Map<string, number>();
  private memory: MemoryItem[] = [];
  private memoryCursor = 0;
  private fallbackCursor = 0;
  private safeCursor = 0;
  /** Turnos sin palabra clave con algo en memoria: la memoria se usa uno sí, uno no. */
  private turnsWithMemory = 0;

  constructor(spec: ScriptSpec = DOCTOR_ES) {
    this.script = compileScript(spec);
  }

  get greeting(): string {
    return this.script.spec.greeting;
  }

  reset(): void {
    this.cursors = new Map();
    this.memory = [];
    this.memoryCursor = 0;
    this.fallbackCursor = 0;
    this.safeCursor = 0;
    this.turnsWithMemory = 0;
  }

  reply(input: string): ElizaReply {
    const { words, clauses, isQuestion } = tokenize(input);
    const hits = this.findHits(clauses, isQuestion);
    const ranked = [...hits].sort(
      (a, b) => b.keyword.spec.rank - a.keyword.spec.rank || a.start - b.start,
    );

    const base = {
      input,
      normalized: words.map((t) => t.norm).join(" "),
      candidates: this.uniqueCandidates(ranked),
    };

    const reflectedClauses = new Map<number, ReflectedToken[]>();
    const reflectedClause = (index: number) => {
      let cached = reflectedClauses.get(index);
      if (!cached) {
        cached = reflectClause(clauses[index] ?? []);
        reflectedClauses.set(index, cached);
      }
      return cached;
    };

    let result: { text: string; trace: Omit<ElizaTrace, "memoryStored"> } | null = null;
    let winner: Hit | null = null;
    const tried = new Set<number>();

    for (const hit of ranked) {
      if (tried.has(hit.keyword.id)) continue;
      tried.add(hit.keyword.id);
      result = this.applyKeyword(hit, clauses[hit.clauseIndex] ?? [], reflectedClause(hit.clauseIndex), base);
      if (result) {
        winner = hit;
        break;
      }
    }

    result ??= this.noKeywordReply(base);
    const memoryStored = this.storeMemory(clauses, reflectedClause, input);

    return {
      text: result.text,
      trace: { ...result.trace, memoryStored },
      highlights: this.highlights(hits, winner),
    };
  }

  /* ---------------- palabras clave ---------------- */

  private findHits(clauses: readonly Token[][], isQuestion: boolean): Hit[] {
    const hits: Hit[] = [];
    clauses.forEach((tokens, clauseIndex) => {
      tokens.forEach((token, index) => {
        for (const { keyword, words } of this.script.byFirstWord.get(token.norm) ?? []) {
          const matched = tokens.slice(index, index + words.length);
          if (matched.length !== words.length || !matched.every((t, k) => t.norm === words[k])) continue;
          if (keyword.spec.when && !keyword.spec.when({ tokens, index, isQuestion })) continue;
          hits.push({
            keyword,
            clauseIndex,
            tokens: matched,
            start: matched[0]!.start,
            end: matched[matched.length - 1]!.end,
          });
        }
      });
    });
    return hits;
  }

  private uniqueCandidates(ranked: readonly Hit[]): KeywordTrace[] {
    const seen = new Set<number>();
    const out: KeywordTrace[] = [];
    for (const hit of ranked) {
      if (seen.has(hit.keyword.id)) continue;
      seen.add(hit.keyword.id);
      out.push(keywordTrace(hit));
    }
    return out;
  }

  private highlights(hits: readonly Hit[], winner: Hit | null): KeywordHighlight[] {
    const byPosition = [...hits].sort((a, b) => a.start - b.start || b.end - a.end);
    const out: KeywordHighlight[] = [];
    for (const hit of byPosition) {
      const last = out[out.length - 1];
      if (last && hit.start < last.end) continue; // solapa con otra («buenas tardes» / «buenas»)
      out.push({
        start: hit.start,
        end: hit.end,
        key: hit.keyword.spec.key,
        rank: hit.keyword.spec.rank,
        selected: winner !== null && hit.keyword.id === winner.keyword.id && hit.start === winner.start,
      });
    }
    return out;
  }

  /* ---------------- descomposición y reensamblado ---------------- */

  private applyKeyword(
    hit: Hit,
    clause: readonly Token[],
    reflected: readonly ReflectedToken[],
    base: Pick<ElizaTrace, "input" | "normalized" | "candidates">,
  ): { text: string; trace: Omit<ElizaTrace, "memoryStored"> } | null {
    for (const [decompIndex, decomposition] of hit.keyword.decompositions.entries()) {
      const groups = matchPattern(decomposition.elements, clause);
      if (!groups) continue;

      const captures: Capture[] = groups.map((group, i) => ({
        index: i + 1,
        kind: group.kind,
        tokens: clause.slice(group.start, group.end),
        reflection: summarizeReflection(reflected.slice(group.start, group.end)),
      }));

      const cursorKey = `${hit.keyword.id}:${decompIndex}`;
      const first = this.cursors.get(cursorKey) ?? 0;
      const count = decomposition.templates.length;
      let blockedByUnsafe = false;
      let chosen: { template: CompiledTemplate; index: number } | null = null;

      for (let step = 0; step < count && !chosen; step++) {
        const index = (first + step) % count;
        const template = decomposition.templates[index]!;
        const status = templateStatus(template, captures);
        if (status === "ok") chosen = { template, index };
        else if (status === "unsafe") blockedByUnsafe = true;
      }

      if (!chosen && !blockedByUnsafe) continue; // ninguna plantilla encaja: siguiente patrón

      const unknownWords = [...new Set(captures.flatMap((c) => c.reflection.unknownWords))];
      const keyword = keywordTrace(hit);

      if (!chosen) {
        // El fragmento tiene formas en 1.ª/2.ª persona desconocidas: no se refleja.
        const safe = this.nextSafeTemplate();
        return {
          text: finalize(safe),
          trace: {
            ...base,
            keyword,
            pattern: decomposition.pattern,
            captures: captures.map((c) => toCaptureTrace(c, false)),
            reflection: this.primaryCapture(captures, []),
            unknownWords,
            template: safe,
            templateIndex: null,
            templateCount: null,
            source: "safe",
            usedFallback: false,
            usedMemory: false,
            safeReflection: true,
            memorySource: null,
          },
        };
      }

      this.cursors.set(cursorKey, chosen.index + 1);
      const slots = new Map(captures.map((c) => [c.index, c.reflection.after]));

      return {
        text: fillTemplate(chosen.template.text, slots),
        trace: {
          ...base,
          keyword,
          pattern: decomposition.pattern,
          captures: captures.map((c) => toCaptureTrace(c, chosen.template.refs.includes(c.index))),
          reflection: this.primaryCapture(captures, chosen.template.refs),
          unknownWords: blockedByUnsafe ? unknownWords : [],
          template: chosen.template.text,
          templateIndex: chosen.index,
          templateCount: count,
          source: "rule",
          usedFallback: false,
          usedMemory: false,
          safeReflection: blockedByUnsafe,
          memorySource: null,
        },
      };
    }
    return null;
  }

  /**
   * El fragmento que enseña el paso 3 del panel: el que usa la plantilla
   * (mejor un comodín que una clase) o, si no usa ninguno, el último no vacío.
   */
  private primaryCapture(captures: readonly Capture[], refs: readonly number[]): CaptureTrace | null {
    const used = captures.filter((c) => refs.includes(c.index) && c.tokens.length > 0);
    const pick =
      used.find((c) => c.kind === "wildcard") ??
      used[0] ??
      [...captures].reverse().find((c) => c.kind === "wildcard" && c.tokens.length > 0);
    return pick ? toCaptureTrace(pick, refs.includes(pick.index)) : null;
  }

  private nextSafeTemplate(): string {
    const list = this.script.spec.safeTemplates;
    const text = list[this.safeCursor % list.length]!;
    this.safeCursor++;
    return text;
  }

  /* ---------------- sin palabra clave: memoria o respuesta genérica ---------------- */

  private noKeywordReply(
    base: Pick<ElizaTrace, "input" | "normalized" | "candidates">,
  ): { text: string; trace: Omit<ElizaTrace, "memoryStored"> } {
    const empty = {
      ...base,
      keyword: null,
      captures: [],
      unknownWords: [],
      safeReflection: false,
    };

    if (this.memory.length > 0) {
      const useMemory = this.turnsWithMemory % 2 === 0;
      this.turnsWithMemory++;
      const item = useMemory ? this.memory.shift() : undefined;
      if (item) {
        const templates = item.plural
          ? this.script.spec.memoryTemplates.plural
          : this.script.spec.memoryTemplates.singular;
        const index = this.memoryCursor % templates.length;
        this.memoryCursor++;
        const template = templates[index]!;
        const capture: CaptureTrace = {
          index: 2,
          kind: "wildcard",
          before: item.reflection.before,
          after: item.reflection.after,
          tokens: item.reflection.tokens,
          used: true,
          safe: true,
        };
        return {
          text: fillTemplate(template, new Map([[2, item.reflection.after]])),
          trace: {
            ...empty,
            pattern: item.plural ? "* mis *" : "* mi *",
            captures: [capture],
            reflection: capture,
            template,
            templateIndex: index,
            templateCount: templates.length,
            source: "memory",
            usedFallback: false,
            usedMemory: true,
            memorySource: item.sourceInput,
          },
        };
      }
    }

    const list = this.script.spec.fallbacks;
    const index = this.fallbackCursor % list.length;
    this.fallbackCursor++;
    const template = list[index]!;
    return {
      text: finalize(template),
      trace: {
        ...empty,
        pattern: null,
        reflection: null,
        template,
        templateIndex: index,
        templateCount: list.length,
        source: "fallback",
        usedFallback: true,
        usedMemory: false,
        memorySource: null,
      },
    };
  }

  /**
   * MEMORIA: cuando el usuario dice «mi …» (y lo que sigue es una oración
   * que se puede reflejar con seguridad), ELIZA lo guarda para sacarlo más
   * tarde, cuando no encuentre ninguna palabra clave.
   */
  private storeMemory(
    clauses: readonly Token[][],
    reflectedClause: (index: number) => ReflectedToken[],
    input: string,
  ): string | null {
    for (const [clauseIndex, tokens] of clauses.entries()) {
      for (const [i, token] of tokens.entries()) {
        if (token.norm !== "mi" && token.norm !== "mis") continue;
        if (token.lower === "mí" || isPronounMi(tokens, i)) continue;
        if (!tokens.slice(0, i).every((t) => MEMORY_LEAD_WORDS.has(t.norm))) continue;
        const fragment = tokens.slice(i + 1);
        if (fragment.length < 2 || !looksLikeClause(fragment)) continue;
        const reflection = summarizeReflection(reflectedClause(clauseIndex).slice(i + 1));
        if (!reflection.safe) continue;

        const plural = token.norm === "mis";
        if (!this.memory.some((m) => m.reflection.after === reflection.after)) {
          this.memory.push({ plural, reflection, sourceInput: input });
          if (this.memory.length > MEMORY_LIMIT) this.memory.shift();
        }
        return `${plural ? "tus" : "tu"} ${reflection.after}`;
      }
    }
    return null;
  }
}

export function createEliza(spec: ScriptSpec = DOCTOR_ES): Eliza {
  return new Eliza(spec);
}
