import { stripAccents } from "./normalize";

/**
 * Mapa de reflexión: [lo que dice el usuario, lo que responde ELIZA].
 * Se aplica en los dos sentidos: «yo» → «tú» y «tú» → «yo».
 * Las formas van con su tilde correcta: son las que se escriben en la respuesta.
 */
export const PRONOUN_PAIRS = [
  ["yo", "tú"],
  ["mi", "tu"],
  ["mis", "tus"],
  ["mí", "ti"],
  ["me", "te"],
  ["conmigo", "contigo"],
  ["mío", "tuyo"],
  ["mía", "tuya"],
  ["míos", "tuyos"],
  ["mías", "tuyas"],
  ["nosotros", "vosotros"],
  ["nosotras", "vosotras"],
  ["nuestro", "vuestro"],
  ["nuestra", "vuestra"],
  ["nuestros", "vuestros"],
  ["nuestras", "vuestras"],
  ["nos", "os"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/**
 * Verbos: 1.ª persona ↔ 2.ª persona (tuteo). Se excluyen a propósito las
 * formas que también son sustantivos frecuentes («trabajo», «recuerdo»,
 * «sueño», «deseo»…), porque reflejarlas estropearía frases como «mi trabajo».
 */
export const VERB_PAIRS = [
  ["estoy", "estás"],
  ["soy", "eres"],
  ["tengo", "tienes"],
  ["quiero", "quieres"],
  ["puedo", "puedes"],
  ["siento", "sientes"],
  ["necesito", "necesitas"],
  ["sé", "sabes"],
  ["creo", "crees"],
  ["pienso", "piensas"],
  ["hago", "haces"],
  ["digo", "dices"],
  ["voy", "vas"],
  ["doy", "das"],
  ["veo", "ves"],
  ["odio", "odias"],
  ["amo", "amas"],
  ["entiendo", "entiendes"],
  ["conozco", "conoces"],
  ["prefiero", "prefieres"],
  ["merezco", "mereces"],
  ["vivo", "vives"],
  ["salgo", "sales"],
  ["vengo", "vienes"],
  ["pongo", "pones"],
  ["debo", "debes"],
  ["busco", "buscas"],
  ["espero", "esperas"],
  ["temo", "temes"],
  ["he", "has"],
  ["fui", "fuiste"],
  ["hice", "hiciste"],
  ["dije", "dijiste"],
  ["tuve", "tuviste"],
  ["estuve", "estuviste"],
  ["quise", "quisiste"],
  ["pude", "pudiste"],
  ["supe", "supiste"],
  ["vine", "viniste"],
  ["somos", "sois"],
  ["estamos", "estáis"],
  ["tenemos", "tenéis"],
  ["podemos", "podéis"],
  ["queremos", "queréis"],
  ["necesitamos", "necesitáis"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/**
 * Frases con pronombre átono: reglas explícitas que tienen prioridad sobre
 * la reflexión palabra a palabra («me siento» → «te sientes»).
 */
export const PHRASE_PAIRS = [
  ["me siento", "te sientes"],
  ["me gusta", "te gusta"],
  ["me gustan", "te gustan"],
  ["me duele", "te duele"],
  ["me duelen", "te duelen"],
  ["me encanta", "te encanta"],
  ["me encantan", "te encantan"],
  ["me importa", "te importa"],
  ["me preocupa", "te preocupa"],
  ["me preocupo", "te preocupas"],
  ["me molesta", "te molesta"],
  ["me pasa", "te pasa"],
  ["me acuerdo", "te acuerdas"],
  ["me llamo", "te llamas"],
  ["me quedo", "te quedas"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/** Formas de 2.ª persona de los verbos del mapa, normalizadas («estas», «eres»…). */
export const SECOND_PERSON_VERB_NORMS: ReadonlySet<string> = new Set(
  VERB_PAIRS.map(([, second]) => stripAccents(second)),
);

/** Todas las formas verbales del mapa, normalizadas. */
export const MAPPED_VERB_NORMS: ReadonlySet<string> = new Set(
  VERB_PAIRS.flatMap((pair) => pair.map((form) => stripAccents(form))),
);
