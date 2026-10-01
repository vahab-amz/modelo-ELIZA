import { hasAccent, stripAccents, tokenize } from "./normalize";
import { PHRASE_PAIRS, PRONOUN_PAIRS, VERB_PAIRS } from "./reflection-map";
import { findUnknownPersonForms, isPronounMi, isPronounTu } from "./spanish";
import type { ReflectedToken, ReflectionRule, Token } from "./types";

/** Forma exacta (minúsculas, con tilde) → forma reflejada. */
const EXACT = new Map<string, string>();
for (const [first, second] of [...PRONOUN_PAIRS, ...VERB_PAIRS]) {
  EXACT.set(first, second);
  EXACT.set(second, first);
}

/**
 * Formas escritas sin tilde («estais», «mio»). Se excluyen las que, sin tilde,
 * son otra palabra: «estas» (demostrativo), «se» (pronombre), «mi», «tu».
 */
const AMBIGUOUS_WITHOUT_ACCENT = new Set(["se", "estas"]);
const LOOSE = new Map<string, string>();
for (const [form, reflected] of EXACT) {
  const bare = stripAccents(form);
  if (bare === form || EXACT.has(bare) || AMBIGUOUS_WITHOUT_ACCENT.has(bare)) continue;
  LOOSE.set(bare, reflected);
}

/** «me siento» → ["te", "sientes"] y viceversa (claves normalizadas). */
const PHRASES = new Map<string, readonly string[]>();
for (const [first, second] of PHRASE_PAIRS) {
  PHRASES.set(stripAccents(first), second.split(" "));
  PHRASES.set(stripAccents(second), first.split(" "));
}

/** Infinitivo + pronombre enclítico: «ayudarme» ↔ «ayudarte». */
const ENCLITIC_RE = /^(.+(?:ar|er|ir|ír))(me|te)$/;
const NOT_ENCLITIC_RE = /(?:ierte|uerte|parte|corte|norte|porte|marte)$/;

function reflectEnclitic(lower: string): string | undefined {
  if (NOT_ENCLITIC_RE.test(lower)) return undefined;
  const match = ENCLITIC_RE.exec(lower);
  const stem = match?.[1];
  if (!match || !stem || stem.length < 3) return undefined;
  return stem + (match[2] === "me" ? "te" : "me");
}

interface WordReflection {
  out: string;
  rule: ReflectionRule;
}

function reflectWordAt(tokens: readonly Token[], i: number): WordReflection | undefined {
  const token = tokens[i];
  if (!token) return undefined;

  // Sin tilde, «mi» y «tu» pueden ser posesivos o pronombres: decide el contexto.
  if (token.lower === "mi") return { out: isPronounMi(tokens, i) ? "ti" : "tu", rule: "word" };
  if (token.lower === "tu") return { out: isPronounTu(tokens, i) ? "yo" : "mi", rule: "word" };

  const exact = EXACT.get(token.lower);
  if (exact) return { out: exact, rule: "word" };

  if (!hasAccent(token.lower)) {
    const loose = LOOSE.get(token.norm);
    if (loose) return { out: loose, rule: "word" };
  }

  const enclitic = reflectEnclitic(token.lower);
  if (enclitic) return { out: enclitic, rule: "enclitic" };

  return undefined;
}

/**
 * Cómo se escribe una palabra del usuario dentro de la respuesta: se respeta
 * su ortografía, salvo la mayúscula de inicio de frase y el texto en MAYÚSCULAS.
 */
export function displayForm(token: Token): string {
  const isAllCaps =
    token.text.length > 1 &&
    token.text !== token.lower &&
    token.text === token.text.toLocaleUpperCase("es");
  return token.sentenceStart || isAllCaps ? token.lower : token.text;
}

/**
 * Refleja una cláusula completa. Se calcula sobre toda la cláusula (y no
 * solo sobre el fragmento capturado) porque el contexto importa: «a mí»,
 * «yo cocino»…
 */
export function reflectClause(tokens: readonly Token[]): ReflectedToken[] {
  const outputs: Array<WordReflection | undefined> = [];

  for (let i = 0; i < tokens.length; i++) {
    const current = tokens[i]!;
    const next = tokens[i + 1];
    const phrase = next ? PHRASES.get(`${current.norm} ${next.norm}`) : undefined;
    if (phrase) {
      outputs[i] = { out: phrase[0]!, rule: "phrase" };
      outputs[i + 1] = { out: phrase[1]!, rule: "phrase" };
      i++;
      continue;
    }
    outputs[i] = reflectWordAt(tokens, i);
  }

  const unknown = findUnknownPersonForms(
    tokens,
    tokens.map((_, i) => outputs[i] !== undefined),
  );

  return tokens.map((token, i) => {
    const reflection = outputs[i];
    const before = displayForm(token);
    const after = reflection ? reflection.out : before;
    return {
      before,
      after,
      changed: reflection !== undefined && reflection.out !== token.lower,
      unknown: unknown[i] ?? false,
      rule: reflection?.rule,
    };
  });
}

export interface ReflectionResult {
  tokens: ReflectedToken[];
  before: string;
  after: string;
  /** Todas las formas en 1.ª/2.ª persona del fragmento están en el mapa. */
  safe: boolean;
  unknownWords: string[];
}

export function summarizeReflection(tokens: ReflectedToken[]): ReflectionResult {
  const unknownWords = tokens.filter((t) => t.unknown).map((t) => t.before);
  return {
    tokens,
    before: tokens.map((t) => t.before).join(" "),
    after: tokens.map((t) => t.after).join(" "),
    safe: unknownWords.length === 0,
    unknownWords,
  };
}

/** Refleja una frase suelta: «yo estoy cansado» → «tú estás cansado». */
export function reflect(text: string): ReflectionResult {
  return summarizeReflection(reflectClause(tokenize(text).words));
}
