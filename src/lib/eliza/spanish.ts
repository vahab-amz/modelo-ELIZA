/**
 * Heurísticas mínimas de español. ELIZA no «entiende» nada: estas reglas
 * solo sirven para no estropear las frases al darles la vuelta.
 */
import { MAPPED_VERB_NORMS, SECOND_PERSON_VERB_NORMS } from "./reflection-map";
import type { Token } from "./types";

const PREPOSITIONS = new Set([
  "a", "ante", "contra", "de", "desde", "en", "entre", "excepto", "hacia",
  "hasta", "para", "por", "salvo", "segun", "sin", "sobre", "tras",
]);

/** Palabras que suelen ir detrás de un pronombre tónico («para mí es…»). */
const AFTER_PRONOUN = new Set([
  "y", "o", "ni", "que", "no", "nunca", "tambien", "tampoco", "siempre", "ya",
  "solo", "mismo", "misma", "me", "te", "se", "lo", "la", "le", "es", "era",
  "fue", "esta", "estaba", "son", "parece", "importa", "gusta", "da", "pasa",
]);

/** Sustantivos frecuentes en -as/-es que no son verbos. */
const NOT_VERB_S = new Set([
  "lunes", "martes", "miercoles", "jueves", "viernes", "crisis", "interes",
  "pais", "ingles", "frances", "mes", "veces", "antes", "entonces", "ademas",
  "mientras", "quizas", "jamas", "detras", "atras", "cosas", "ganas", "horas",
  "personas", "clases", "noches", "tardes", "padres", "madres", "triste",
  "tristes", "chiste", "chistes",
]);

/** Palabras frecuentes en -o que no son verbos en 1.ª persona. */
const NOT_VERB_O = new Set([
  "algo", "alguno", "bueno", "caso", "centro", "cierto", "claro", "como",
  "cuando", "cuanto", "demasiado", "dinero", "ello", "eso", "esto", "luego",
  "malo", "medio", "mismo", "mucho", "ninguno", "nuevo", "otro", "pero", "poco",
  "pronto", "rato", "solo", "tampoco", "tanto", "tiempo", "todo", "uno", "lo",
  "no", "yo", "mio", "tuyo", "suyo", "nuestro", "vuestro", "despacio", "rapido",
  "seguro",
  // Pretéritos irregulares de 3.ª persona: «me lo dijo», «me dio»…
  "dijo", "hizo", "tuvo", "puso", "quiso", "pudo", "supo", "vino", "trajo",
  "estuvo", "anduvo", "condujo", "hubo", "dio", "vio",
]);

/** Adverbios que suelen ir justo delante del verbo. */
const ADVERBS = new Set([
  "no", "nunca", "siempre", "ya", "tambien", "tampoco", "casi", "solo",
  "apenas", "jamas", "todavia", "aun", "ahora", "hoy", "ayer", "manana",
]);

/** Pronombres átonos. («la», «lo», «las», «los» también son artículos.) */
const CLITICS = new Set(["me", "te", "se", "le", "les", "nos", "os"]);
const OBJECT_CLITICS = new Set(["lo", "la", "los", "las", "le", "les", "se"]);

/** Palabras con tilde final que no son verbos («café», «aquí»…). */
const ACCENT_FINAL_NOT_VERB = new Set([
  "café", "bebé", "aquí", "allí", "ahí", "así", "mí", "sí", "qué", "porqué",
  "comité", "puré", "cliché", "bisturí", "jabalí", "esquí", "rubí", "maniquí",
  "colibrí", "iraní", "israelí", "marroquí", "ají", "olé", "canapé", "consomé",
  "chalé", "bidé", "carné", "josé", "rené", "noé",
]);

/** Plurales en -mos que no son verbos en 1.ª persona del plural. */
const NOT_VERB_MOS = new Set([
  "primos", "mismos", "ramos", "animos", "ultimos", "proximos", "intimos",
  "extremos", "minimos", "maximos", "optimos", "legitimos", "supremos",
]);

/** Formas verbales frecuentes de 3.ª persona (sirven para detectar oraciones). */
const COMMON_VERBS = new Set([
  "es", "son", "era", "eran", "fue", "fueron", "esta", "estan", "estaba",
  "estaban", "estuvo", "tiene", "tienen", "tenia", "tuvo", "hace", "hacen",
  "hizo", "hacia", "dice", "dicen", "dijo", "decia", "va", "van", "iba",
  "puede", "pueden", "pudo", "podia", "quiere", "quieren", "queria", "quiso",
  "sabe", "saben", "sabia", "ha", "han", "habia", "hay", "parece", "parecen",
  "siente", "sienten", "odia", "odian", "ama", "aman", "trata", "tratan",
  "deja", "dejan", "escucha", "escuchan", "entiende", "entienden", "gusta",
  "gustan", "molesta", "molestan", "preocupa", "importa", "grita", "gritan",
  "pega", "critica", "ignora", "llama", "llaman", "trabaja", "vive", "cree",
  "piensa", "necesita", "debe", "sigue", "viene", "sale", "llega", "falta",
  "duele", "ayuda", "cuida", "controla", "manda", "exige", "obliga", "insulta",
  "miente", "engana", "habla", "hablan", "mira", "come", "duerme", "juega",
]);

const NEGATIONS = new Set(["no", "nunca", "jamas", "tampoco"]);

/**
 * ¿«mi» sin tilde es en realidad el pronombre «mí»?
 * «para mi es difícil» → sí · «de mi madre» → no.
 */
export function isPronounMi(tokens: readonly Token[], i: number): boolean {
  const prev = tokens[i - 1];
  const next = tokens[i + 1];
  if (!prev || !PREPOSITIONS.has(prev.norm)) return false;
  return next === undefined || AFTER_PRONOUN.has(next.norm);
}

/**
 * ¿«tu» es el pronombre «tú» (y no el posesivo)?
 * «tú no me entiendes», «tu eres» → sí · «tu libro» → no.
 */
export function isPronounTu(tokens: readonly Token[], i: number): boolean {
  const token = tokens[i];
  if (!token) return false;
  if (token.lower === "tú") return true;
  if (token.norm !== "tu") return false;
  const next = tokens[i + 1];
  if (next === undefined) return true;
  return (
    SECOND_PERSON_VERB_NORMS.has(next.norm) ||
    AFTER_PRONOUN.has(next.norm) ||
    looksLikeSecondPersonVerb(next)
  );
}

function looksLikeSecondPersonVerb(token: Token): boolean {
  return (
    /(as|es|ste)$/.test(token.norm) &&
    token.norm.length >= 4 &&
    !NOT_VERB_S.has(token.norm)
  );
}

function looksLikeFirstPersonVerb(token: Token): boolean {
  if (NOT_VERB_O.has(token.norm)) return false;
  return (
    /[oéí]$/.test(token.lower) ||
    /(aba|ia|oy)$/.test(token.norm) ||
    token.norm === "era"
  );
}

/**
 * Señala las formas verbales en 1.ª o 2.ª persona que el mapa de reflexión
 * no conoce. Si un fragmento contiene alguna, darle la vuelta produciría
 * algo como «tú cocino», así que ELIZA usa una plantilla que no refleja.
 *
 * `reflected[i]` indica si la palabra i ya tiene reflexión conocida.
 */
export function findUnknownPersonForms(
  tokens: readonly Token[],
  reflected: readonly boolean[],
): boolean[] {
  const unknown = tokens.map(() => false);
  const isFree = (j: number) => j < tokens.length && !reflected[j];

  tokens.forEach((token, i) => {
    // A) Sujeto explícito: «yo cocino», «tú cocinas».
    const subjectYo = token.norm === "yo";
    const subjectTu = isPronounTu(tokens, i);
    if (subjectYo || subjectTu) {
      let j = i + 1;
      while (j < tokens.length && (ADVERBS.has(tokens[j]!.norm) || CLITICS.has(tokens[j]!.norm))) j++;
      const verb = tokens[j];
      if (verb && isFree(j)) {
        if (subjectYo && looksLikeFirstPersonVerb(verb)) unknown[j] = true;
        if (subjectTu && looksLikeSecondPersonVerb(verb)) unknown[j] = true;
      }
    }

    // B) Pronombre átono + verbo conjugado: «me levanto», «me escuchas».
    if (token.norm === "me" || token.norm === "te") {
      let j = i + 1;
      if (tokens[j] && OBJECT_CLITICS.has(tokens[j]!.norm)) j++;
      const verb = tokens[j];
      if (verb && isFree(j)) {
        const first = /[oéí]$/.test(verb.lower) && verb.norm.length >= 3 && !NOT_VERB_O.has(verb.norm);
        if (first || looksLikeSecondPersonVerb(verb)) unknown[j] = true;
      }
    }

    // C) Adverbio + verbo en -o: «nunca duermo», «no trabajo».
    if (ADVERBS.has(token.norm)) {
      const verb = tokens[i + 1];
      if (verb && isFree(i + 1) && /o$/.test(verb.norm) && verb.norm.length >= 3 && !NOT_VERB_O.has(verb.norm)) {
        unknown[i + 1] = true;
      }
    }

    if (!isFree(i)) return;

    // D) Pretérito o futuro con tilde final: «comí», «hablé», «iré».
    if (/[éí]$/.test(token.lower) && token.lower.length >= 3 && !ACCENT_FINAL_NOT_VERB.has(token.lower)) {
      unknown[i] = true;
    }
    // E) Terminación -oy: «doy», «estoy»… (las conocidas ya están en el mapa).
    if (/oy$/.test(token.norm) && token.norm !== "hoy" && token.norm.length >= 3) {
      unknown[i] = true;
    }
    // F) 1.ª persona del plural: «trabajamos», «comemos», «vivimos».
    if (
      token.norm.length >= 6 &&
      /(amos|emos|imos)$/.test(token.norm) &&
      !/isimos$/.test(token.norm) &&
      !NOT_VERB_MOS.has(token.norm)
    ) {
      unknown[i] = true;
    }
  });

  return unknown;
}

function isVerbish(token: Token): boolean {
  return (
    COMMON_VERBS.has(token.norm) ||
    MAPPED_VERB_NORMS.has(token.norm) ||
    CLITICS.has(token.norm) ||
    NEGATIONS.has(token.norm) ||
    /ó$/.test(token.lower) ||
    /(aba|aban|aron|ieron)$/.test(token.norm)
  );
}

/**
 * ¿El fragmento parece una oración («jefe nunca me escucha») o solo un
 * sintagma nominal («coche nuevo»)? Decide qué plantillas encajan.
 */
export function looksLikeClause(tokens: readonly Token[]): boolean {
  return tokens.length >= 2 && tokens.some(isVerbish);
}
