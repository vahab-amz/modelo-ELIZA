import { describe, expect, it } from "vitest";
import { Eliza } from "./engine";
import { normalizeText, normalizeWord } from "./normalize";
import { reflect } from "./reflection";
import { PHRASE_PAIRS, PRONOUN_PAIRS, VERB_PAIRS } from "./reflection-map";

/** El diálogo de las diapositivas, tal cual. */
const SLIDE_DIALOGUE = [
  ["Mi jefe nunca me escucha.", "¿Por qué crees que tu jefe nunca te escucha?"],
  ["Porque siempre está ocupado.", "¿Puedes pensar en un ejemplo concreto?"],
  ["Me recuerda a mi madre.", "Háblame más de tu familia."],
] as const;

describe("diálogo de las diapositivas", () => {
  it("reproduce exactamente las tres respuestas, en orden", () => {
    const eliza = new Eliza();
    for (const [input, expected] of SLIDE_DIALOGUE) {
      expect(eliza.reply(input).text).toBe(expected);
    }
  });

  it("1 · «mi» (rango 2): patrón «* mi *» y reflexión me → te", () => {
    const { trace } = new Eliza().reply("Mi jefe nunca me escucha.");
    expect(trace.keyword).toEqual({ key: "mi", matched: "Mi", rank: 2 });
    expect(trace.pattern).toBe("* mi *");
    expect(trace.reflection?.before).toBe("jefe nunca me escucha");
    expect(trace.reflection?.after).toBe("jefe nunca te escucha");
    expect(trace.reflection?.tokens.filter((t) => t.changed).map((t) => [t.before, t.after])).toEqual([
      ["me", "te"],
    ]);
    expect(trace.template).toBe("¿Por qué crees que tu (2)?");
    expect(trace.usedFallback).toBe(false);
    expect(trace.usedMemory).toBe(false);
    expect(trace.memoryStored).toBe("tu jefe nunca te escucha");
  });

  it("2 · «siempre» (4) gana a «porque» (1)", () => {
    const eliza = new Eliza();
    eliza.reply(SLIDE_DIALOGUE[0][0]);
    const { trace, highlights } = eliza.reply("Porque siempre está ocupado.");
    expect(trace.keyword?.key).toBe("siempre");
    expect(trace.candidates.map((c) => [c.key, c.rank])).toEqual([
      ["siempre", 4],
      ["porque", 1],
    ]);
    expect(trace.pattern).toBe("* siempre *");
    expect(trace.template).toBe("¿Puedes pensar en un ejemplo concreto?");
    expect(highlights.find((h) => h.selected)?.key).toBe("siempre");
  });

  it("3 · «madre» (familia, 10) gana a «recuerda» (5) y a «mi» (2)", () => {
    const eliza = new Eliza();
    eliza.reply(SLIDE_DIALOGUE[0][0]);
    eliza.reply(SLIDE_DIALOGUE[1][0]);
    const { trace } = eliza.reply("Me recuerda a mi madre.");
    expect(trace.keyword).toEqual({ key: "familia", matched: "madre", rank: 10 });
    expect(trace.candidates.map((c) => c.key)).toEqual(["familia", "recuerdo", "mi"]);
    expect(trace.pattern).toBe("* mi @familia *");
    expect(trace.template).toBe("Háblame más de tu familia.");
  });

  it("es determinista: dos instancias dan exactamente lo mismo", () => {
    const inputs = [...SLIDE_DIALOGUE.map(([i]) => i), "Hace buen tiempo.", "Estoy cansado.", "Hace buen tiempo."];
    const a = new Eliza();
    const b = new Eliza();
    expect(inputs.map((i) => a.reply(i).text)).toEqual(inputs.map((i) => b.reply(i).text));
  });

  it("«Reiniciar» vuelve al estado inicial", () => {
    const eliza = new Eliza();
    const first = SLIDE_DIALOGUE.map(([i]) => eliza.reply(i).text);
    eliza.reset();
    expect(SLIDE_DIALOGUE.map(([i]) => eliza.reply(i).text)).toEqual(first);
  });
});

describe("mapa de reflexión", () => {
  // «mi»/«tu» sin tilde dependen del contexto: se prueban aparte.
  const contextual = new Set(["mi", "tu"]);

  it.each([...PRONOUN_PAIRS, ...VERB_PAIRS].filter(([a, b]) => !contextual.has(a) && !contextual.has(b)))(
    "%s ↔ %s",
    (first, second) => {
      expect(reflect(`… ${first}`).after).toBe(`${second}`);
      expect(reflect(`… ${second}`).after).toBe(`${first}`);
    },
  );

  it("posesivos y pronombres según el contexto", () => {
    expect(reflect("mi jefe").after).toBe("tu jefe");
    expect(reflect("tu jefe").after).toBe("mi jefe");
    expect(reflect("para mi es difícil").after).toBe("para ti es difícil");
    expect(reflect("tú no me entiendes").after).toBe("yo no te entiendo");
    expect(reflect("tu no me entiendes").after).toBe("yo no te entiendo");
    expect(reflect("yo estoy cansado de mis amigos").after).toBe("tú estás cansado de tus amigos");
    expect(reflect("vienes conmigo").after).toBe("vengo contigo");
  });

  it.each(PHRASE_PAIRS)("frase con clítico: %s ↔ %s", (first, second) => {
    expect(reflect(first).after).toBe(second);
    expect(reflect(second).after).toBe(first);
  });

  it("marca qué palabras han cambiado", () => {
    const { tokens } = reflect("mi jefe nunca me escucha");
    expect(tokens.map((t) => t.changed)).toEqual([true, false, false, true, false]);
  });

  it("infinitivo con enclítico: ayudarme ↔ ayudarte", () => {
    expect(reflect("puedes ayudarme").after).toBe("puedo ayudarte");
    expect(reflect("tengo mala suerte").after).toBe("tienes mala suerte");
  });

  it("escribe las tildes correctas aunque el usuario no las ponga", () => {
    expect(reflect("tu eres").after).toBe("yo soy");
    expect(reflect("yo estoy").after).toBe("tú estás");
    expect(reflect("es mio").after).toBe("es tuyo");
  });
});

describe("reflexión segura", () => {
  it("detecta formas verbales en 1.ª persona que el mapa no conoce", () => {
    expect(reflect("yo cocino fatal").unknownWords).toEqual(["cocino"]);
    expect(reflect("me levanto tarde").unknownWords).toEqual(["levanto"]);
    expect(reflect("nunca duermo").unknownWords).toEqual(["duermo"]);
    expect(reflect("ayer comí pasta").unknownWords).toEqual(["comí"]);
    expect(reflect("trabajamos mucho").unknownWords).toEqual(["trabajamos"]);
    expect(reflect("me escuchas").unknownWords).toEqual(["escuchas"]);
  });

  it("no da falsos positivos en frases normales", () => {
    for (const phrase of [
      "jefe nunca me escucha",
      "me lo dijo ayer",
      "no solo eso",
      "mis primos viven aquí",
      "tengo mala suerte",
      "estoy triste",
    ]) {
      expect(reflect(phrase).safe, phrase).toBe(true);
    }
  });

  it("usa una plantilla que no refleja si el fragmento no es seguro", () => {
    const { text, trace } = new Eliza().reply("Mi novia dice que yo cocino fatal.");
    expect(text).toBe("Háblame más de eso.");
    expect(trace.keyword?.key).toBe("mi");
    expect(trace.safeReflection).toBe(true);
    expect(trace.source).toBe("safe");
    expect(trace.unknownWords).toEqual(["cocino"]);
    expect(trace.memoryStored).toBeNull();
  });

  it("prefiere una plantilla sin fragmento del mismo patrón si la hay", () => {
    const { text, trace } = new Eliza().reply("Me siento como si me levanto sin ganas.");
    expect(text).toBe("Háblame más de esa sensación.");
    expect(trace.source).toBe("rule");
    expect(trace.safeReflection).toBe(true);
  });
});

describe("reglas explícitas con clítico", () => {
  it("me gusta → te gusta", () => {
    expect(new Eliza().reply("Me gusta el chocolate.").text).toBe("¿Por qué te gusta el chocolate?");
  });
  it("no me gusta → no te gusta (y mi → tu)", () => {
    expect(new Eliza().reply("No me gusta mi trabajo.").text).toBe("¿Por qué no te gusta tu trabajo?");
  });
  it("me siento → te sientes", () => {
    expect(new Eliza().reply("Me siento solo.").text).toBe("¿Te sientes solo a menudo?");
  });
  it("me duele → te duele", () => {
    expect(new Eliza().reply("Me duele la cabeza.").text).toBe("¿Desde cuándo te duele la cabeza?");
  });
});

describe("normalización: sin distinguir tildes, mayúsculas ni puntuación", () => {
  it("normaliza palabras y frases", () => {
    expect(normalizeWord("Mamá")).toBe("mama");
    expect(normalizeWord("ADIÓS")).toBe("adios");
    expect(normalizeText("¡¿Por qué, mamá?!")).toBe("por que mama");
  });

  it.each([
    ["MI JEFE NUNCA ME ESCUCHA", "¿Por qué crees que tu jefe nunca te escucha?"],
    ["mi jefe nunca me escucha", "¿Por qué crees que tu jefe nunca te escucha?"],
    ["¡¡Mi jefe nunca me escucha!!", "¿Por qué crees que tu jefe nunca te escucha?"],
  ])("«%s»", (input, expected) => {
    expect(new Eliza().reply(input).text).toBe(expected);
  });

  it("encuentra palabras clave escritas sin tilde (o con tildes de más)", () => {
    const eliza = new Eliza();
    expect(eliza.reply("porque siempre esta ocupado").trace.keyword?.key).toBe("siempre");
    expect(eliza.reply("me recuerda a mi mama").trace.keyword?.key).toBe("familia");
    expect(eliza.reply("Quizas").trace.keyword?.key).toBe("quizás");
    expect(eliza.reply("adios").trace.keyword?.key).toBe("adiós");
    expect(eliza.reply("Tengo un ordenadór nuevo").trace.keyword?.key).toBe("ordenador");
  });

  it("devuelve las posiciones de las palabras clave en el texto original", () => {
    const input = "Me recuerda a mi madre.";
    const { highlights } = new Eliza().reply(input);
    expect(highlights.map((h) => [input.slice(h.start, h.end), h.selected])).toEqual([
      ["recuerda", false],
      ["mi", false],
      ["madre", true],
    ]);
  });
});

describe("memoria y respuestas genéricas", () => {
  it("sin palabra clave, recupera lo que se dijo con «mi …»", () => {
    const eliza = new Eliza();
    for (const [input] of SLIDE_DIALOGUE) eliza.reply(input);
    const { text, trace } = eliza.reply("Hace buen tiempo hoy.");
    expect(text).toBe("Antes dijiste que tu jefe nunca te escucha.");
    expect(trace.usedMemory).toBe(true);
    expect(trace.usedFallback).toBe(false);
    expect(trace.memorySource).toBe("Mi jefe nunca me escucha.");
  });

  it("alterna memoria y respuesta genérica («a veces»)", () => {
    const eliza = new Eliza();
    eliza.reply("Mi jefe nunca me escucha.");
    eliza.reply("Mi perro se escapó ayer.");
    expect(eliza.reply("Vale.").trace.source).toBe("memory");
    expect(eliza.reply("Vale.").trace.source).toBe("fallback");
    expect(eliza.reply("Vale.").text).toBe("Hablemos más de por qué tu perro se escapó ayer.");
  });

  it("no guarda en memoria un «mi» subordinado («quiero que mi jefe…»)", () => {
    const eliza = new Eliza();
    expect(eliza.reply("Quiero que mi jefe me escuche.").trace.memoryStored).toBeNull();
    expect(eliza.reply("Y mi jefe me odia.").trace.memoryStored).toBe("tu jefe te odia");
  });

  it("sin memoria, usa las respuestas genéricas en rotación", () => {
    const eliza = new Eliza();
    const replies = ["Hace frío.", "Vale.", "Hace calor."].map((i) => eliza.reply(i));
    expect(replies.map((r) => r.text)).toEqual(["Por favor, continúa.", "Entiendo.", "¿Qué te hace pensar eso?"]);
    expect(replies.every((r) => r.trace.usedFallback && r.trace.keyword === null)).toBe(true);
  });

  it("las plantillas rotan para no repetirse", () => {
    const eliza = new Eliza();
    const a = eliza.reply("Siempre llueve.").text;
    const b = eliza.reply("Siempre llueve.").text;
    expect(a).toBe("¿Puedes pensar en un ejemplo concreto?");
    expect(b).toBe("¿Cuándo?");
  });
});
