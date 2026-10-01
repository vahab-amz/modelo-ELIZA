/**
 * Tipos del motor ELIZA.
 *
 * Arquitectura clásica (Weizenbaum, 1966):
 *   palabra clave (con rango) → patrón de descomposición → plantilla de
 *   reensamblado → reflexión de pronombres y verbos.
 */

/** Una palabra de la entrada, con su posición en el texto original. */
export interface Token {
  /** Tal como la escribió el usuario. */
  text: string;
  /** En minúsculas, conservando tildes (sirve para distinguir «tú» de «tu»). */
  lower: string;
  /** En minúsculas y sin tildes: es la forma que se usa para comparar. */
  norm: string;
  /** Posición [start, end) en el texto original (para resaltar en la UI). */
  start: number;
  end: number;
  /** Primera palabra de una frase (su mayúscula inicial no es significativa). */
  sentenceStart: boolean;
}

/** Condición que debe cumplir el fragmento que usa una plantilla. */
export type TemplateNeed = "clause" | "phrase";

export interface TemplateSpec {
  /** Texto con huecos numerados: «¿Por qué crees que tu (2)?». */
  text: string;
  /**
   * "clause": el fragmento debe parecer una oración (tener verbo).
   * "phrase": el fragmento debe ser un sintagma nominal (sin verbo).
   */
  needs?: TemplateNeed;
}

export type Template = string | TemplateSpec;

export interface DecompositionSpec {
  /**
   * Patrón separado por espacios. Elementos:
   *  - `*`       comodín: cero o más palabras (se numera)
   *  - `@clase`  exactamente una palabra de esa clase (se numera)
   *  - literal   una palabra concreta (no se numera)
   */
  pattern: string;
  templates: Template[];
}

/** Contexto que recibe la condición opcional de una palabra clave. */
export interface KeywordContext {
  /** Palabras de la cláusula donde aparece la palabra clave. */
  tokens: readonly Token[];
  /** Índice de la primera palabra de la coincidencia dentro de `tokens`. */
  index: number;
  /** La entrada contiene «¿» o «?». */
  isQuestion: boolean;
}

export interface KeywordSpec {
  /** Nombre que se muestra en el panel: «mi», «siempre», «familia»… */
  key: string;
  /** Variantes que activan la regla; pueden ser de varias palabras («lo siento»). */
  words: string[];
  /** Cuanto mayor, más prioridad. */
  rank: number;
  decompositions: DecompositionSpec[];
  /** Filtro opcional para desambiguar (p. ej. «sí» frente a «si»). */
  when?: (ctx: KeywordContext) => boolean;
}

export interface ScriptSpec {
  name: string;
  greeting: string;
  keywords: KeywordSpec[];
  /** Clases de palabras usadas en patrones con `@clase`. */
  classes: Record<string, string[]>;
  /** Respuestas cuando no hay ninguna palabra clave. */
  fallbacks: string[];
  /** Respuestas que no reflejan nada (se usan si la reflexión no es segura). */
  safeTemplates: string[];
  /** Plantillas de memoria para «mi …» / «mis …». */
  memoryTemplates: { singular: string[]; plural: string[] };
}

/* ------------------------------------------------------------------ */
/* Traza: lo que el panel «Bajo el capó» enseña de cada respuesta.     */
/* ------------------------------------------------------------------ */

export type ReflectionRule = "word" | "phrase" | "enclitic";

export interface ReflectedToken {
  before: string;
  after: string;
  changed: boolean;
  /** Forma verbal en 1.ª/2.ª persona que el mapa no conoce. */
  unknown: boolean;
  rule?: ReflectionRule;
}

export interface CaptureTrace {
  /** Número del hueco: el (2) de la plantilla. */
  index: number;
  kind: "wildcard" | "class";
  before: string;
  after: string;
  tokens: ReflectedToken[];
  /** La plantilla elegida usa este hueco. */
  used: boolean;
  /** Todas las palabras en 1.ª/2.ª persona están en el mapa. */
  safe: boolean;
}

export interface KeywordTrace {
  key: string;
  /** Palabra(s) exactas que se encontraron en la entrada. */
  matched: string;
  rank: number;
}

export type ReplySource = "rule" | "memory" | "fallback" | "safe";

export interface ElizaTrace {
  input: string;
  /** Entrada tras normalizar: minúsculas, sin tildes, sin puntuación. */
  normalized: string;
  /** Palabra clave ganadora (null si no hubo ninguna). */
  keyword: KeywordTrace | null;
  /** Todas las palabras clave encontradas, ordenadas por rango. */
  candidates: KeywordTrace[];
  /** Patrón de descomposición aplicado, p. ej. «* mi *». */
  pattern: string | null;
  captures: CaptureTrace[];
  /** El fragmento principal antes/después de reflejar pronombres. */
  reflection: CaptureTrace | null;
  /** Palabras que impidieron reflejar con seguridad. */
  unknownWords: string[];
  /** Plantilla tal cual, con sus huecos: «¿Por qué crees que tu (2)?». */
  template: string;
  /** Posición de la plantilla en su lista (las plantillas rotan). */
  templateIndex: number | null;
  templateCount: number | null;
  source: ReplySource;
  usedFallback: boolean;
  usedMemory: boolean;
  /** Se descartó una plantilla que reflejaba porque el fragmento no era seguro. */
  safeReflection: boolean;
  /** Frase que se guardó en memoria en este turno («tu jefe nunca te escucha»). */
  memoryStored: string | null;
  /** Si la respuesta sale de la memoria: la entrada original de la que vino. */
  memorySource: string | null;
}

/** Tramo de la entrada del usuario que contiene una palabra clave. */
export interface KeywordHighlight {
  start: number;
  end: number;
  key: string;
  rank: number;
  /** Es la palabra clave que ganó. */
  selected: boolean;
}

export interface ElizaReply {
  text: string;
  trace: ElizaTrace;
  highlights: KeywordHighlight[];
}
