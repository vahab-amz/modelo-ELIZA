import type { Token } from "./types";

const COMBINING_MARKS = /[̀-ͯ]/g;

/** «Mamá» → «Mama», «sueño» → «sueno». */
export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").normalize("NFC");
}

/** Forma de comparación: minúsculas y sin tildes. */
export function normalizeWord(word: string): string {
  return stripAccents(word.toLocaleLowerCase("es"));
}

/** Normaliza una frase entera: minúsculas, sin tildes, sin puntuación. */
export function normalizeText(text: string): string {
  return tokenize(text)
    .words.map((t) => t.norm)
    .join(" ");
}

export function hasAccent(word: string): boolean {
  return stripAccents(word) !== word;
}

// Palabras (letras, marcas diacríticas, dígitos) o signos que cortan cláusulas.
const TOKEN_RE = /[\p{L}\p{M}\p{N}]+|[.,;:!?¡¿…]+/gu;
const SENTENCE_END = /[.!?…]/;

/**
 * Como ELIZA original, la entrada se parte en cláusulas por la puntuación
 * (y por «pero»). Solo se transforma la cláusula que contiene la palabra
 * clave ganadora, para que los fragmentos reflejados sean cortos.
 */
const CLAUSE_WORDS = new Set(["pero"]);

export interface TokenizedInput {
  /** Todas las palabras, en orden. */
  words: Token[];
  /** Palabras agrupadas por cláusula (sin cláusulas vacías). */
  clauses: Token[][];
  isQuestion: boolean;
}

export function tokenize(input: string): TokenizedInput {
  const words: Token[] = [];
  const clauses: Token[][] = [];
  let current: Token[] = [];
  let sentenceStart = true;

  const closeClause = () => {
    if (current.length > 0) clauses.push(current);
    current = [];
  };

  for (const match of input.matchAll(TOKEN_RE)) {
    const text = match[0];
    const start = match.index;
    const isWord = /[\p{L}\p{N}]/u.test(text);

    if (!isWord) {
      closeClause();
      if (SENTENCE_END.test(text)) sentenceStart = true;
      continue;
    }

    const lower = text.toLocaleLowerCase("es");
    const token: Token = {
      text,
      lower,
      norm: stripAccents(lower),
      start,
      end: start + text.length,
      sentenceStart,
    };
    sentenceStart = false;
    words.push(token);

    if (CLAUSE_WORDS.has(token.norm)) {
      closeClause();
      continue;
    }
    current.push(token);
  }
  closeClause();

  return { words, clauses, isQuestion: /[?¿]/.test(input) };
}
