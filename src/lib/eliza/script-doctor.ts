/**
 * Guion DOCTOR en español (España), inspirado en el original de 1966.
 *
 * Rangos: cuanto mayor, más prioridad. Ajustados para que el diálogo de las
 * diapositivas salga exactamente igual:
 *   «siempre» (4) gana a «porque» (1)
 *   «familia» (10) gana a «recuerdo» (5) y a «mi» (2)
 *
 * En las plantillas, (n) es el n-ésimo hueco del patrón (cada `*` o `@clase`).
 */
import { hasAccent } from "./normalize";
import { isPronounMi, isPronounTu } from "./spanish";
import type { ScriptSpec, TemplateSpec } from "./types";

/** El hueco debe parecer una oración: «jefe nunca me escucha». */
const clause = (text: string): TemplateSpec => ({ text, needs: "clause" });
/** El hueco debe ser un sintagma nominal: «coche nuevo». */
const phrase = (text: string): TemplateSpec => ({ text, needs: "phrase" });

const FAMILIA = [
  "madre", "padre", "mamá", "papá", "padres", "familia", "hermano", "hermana",
  "hermanos", "hermanas", "hijo", "hija", "hijos", "hijas", "marido", "esposo",
  "esposa", "abuelo", "abuela", "abuelos", "tío", "tía", "tíos", "primo",
  "prima", "primos", "suegro", "suegra",
];

const TRISTE = [
  "triste", "deprimido", "deprimida", "infeliz", "desgraciado", "desgraciada",
  "desanimado", "desanimada", "hundido", "hundida", "depre", "agobiado",
  "agobiada", "angustiado", "angustiada", "desesperado", "desesperada",
];

const TRISTEZA = ["tristeza", "depresión", "angustia", "ansiedad", "soledad"];

const FELIZ = ["feliz", "contento", "contenta", "alegre", "ilusionado", "ilusionada"];

export const DOCTOR_ES: ScriptSpec = {
  name: "DOCTOR (español)",
  greeting: "Hola, soy ELIZA. Cuéntame, ¿qué te preocupa?",

  classes: {
    familia: FAMILIA,
    triste: TRISTE,
    tristeza: TRISTEZA,
    feliz: FELIZ,
  },

  keywords: [
    {
      key: "ordenador",
      rank: 50,
      words: [
        "ordenador", "ordenadores", "computadora", "computadoras", "máquina",
        "máquinas", "robot", "robots", "chatgpt", "ia", "inteligencia artificial",
      ],
      decompositions: [
        {
          pattern: "*",
          templates: [
            "¿Te preocupan los ordenadores?",
            "¿Por qué mencionas las máquinas?",
            "¿Qué crees que tienen que ver las máquinas con tu problema?",
            "¿No crees que los ordenadores pueden ayudar a las personas?",
            "¿Qué es exactamente lo que te inquieta de las máquinas?",
          ],
        },
      ],
    },

    {
      key: "familia",
      rank: 10,
      words: FAMILIA,
      decompositions: [
        {
          pattern: "* mi @familia *",
          templates: [
            "Háblame más de tu familia.",
            clause("¿Quién más en tu familia (3)?"),
            "¿Tu (2)?",
            "¿Qué más te viene a la mente cuando piensas en tu (2)?",
          ],
        },
        {
          pattern: "* mis @familia *",
          templates: [
            "Háblame más de tu familia.",
            clause("¿Quién más en tu familia (3)?"),
            "¿Tus (2)?",
            "¿Qué más te viene a la mente cuando piensas en tus (2)?",
          ],
        },
        {
          pattern: "* @familia *",
          templates: [
            "Háblame más de tu familia.",
            "¿Cómo te llevas con tu familia?",
            "¿Qué papel tiene tu familia en todo esto?",
          ],
        },
      ],
    },

    {
      key: "recuerdo",
      rank: 5,
      words: [
        "recuerdo", "recuerdos", "recuerdas", "recuerda", "recordar", "recordaba",
        "me acuerdo", "te acuerdas",
      ],
      decompositions: [
        {
          pattern: "* recuerdo que *",
          templates: ["¿Piensas a menudo en eso?", "¿Qué más recuerdas?", "¿Por qué lo recuerdas justo ahora?"],
        },
        {
          pattern: "* recuerdo *",
          templates: [
            "¿Piensas a menudo en (2)?",
            "¿Pensar en (2) te trae algo más a la mente?",
            "¿Qué más recuerdas?",
            "¿Por qué recuerdas (2) justo ahora?",
          ],
        },
        {
          pattern: "* me acuerdo de *",
          templates: ["¿Piensas a menudo en (2)?", "¿Qué más recuerdas?", "¿Por qué te acuerdas de (2) justo ahora?"],
        },
        {
          pattern: "* recuerdas *",
          templates: [
            "¿Creías que lo había olvidado?",
            "¿Por qué crees que debería recordar (2) ahora?",
            "¿Qué pasa con (2)?",
          ],
        },
        {
          // «Me recuerda a…»: un parecido, como ALIKE en el guion original.
          pattern: "* recuerda *",
          templates: ["¿Qué parecido ves?", "¿En qué sentido?", "¿Qué relación crees que hay?"],
        },
        {
          pattern: "*",
          templates: ["¿Qué más recuerdas?", "Háblame más de ese recuerdo."],
        },
      ],
    },

    {
      key: "triste",
      rank: 5,
      words: [...TRISTE, ...TRISTEZA],
      decompositions: [
        { pattern: "* no estoy * @triste *", templates: ["Me alegra oír eso.", "¿Y cómo estás, entonces?"] },
        { pattern: "* no me siento * @triste *", templates: ["Me alegra oír eso.", "¿Y cómo te sientes, entonces?"] },
        {
          pattern: "* estoy * @triste *",
          templates: [
            "Siento oír que estás (3).",
            "¿Crees que venir aquí te ayudará a no estar (3)?",
            "Seguro que no es agradable estar (3).",
            "¿Puedes explicar qué te ha hecho estar (3)?",
          ],
        },
        {
          pattern: "* me siento * @triste *",
          templates: [
            "Siento oír que te sientes (3).",
            "¿Desde cuándo te sientes (3)?",
            "¿Crees que hablar de ello te ayudará a no sentirte (3)?",
          ],
        },
        {
          pattern: "* @tristeza *",
          templates: [
            "¿Desde cuándo sientes esa (2)?",
            "¿Qué crees que provoca esa (2)?",
            "¿Cómo te afecta esa (2) en el día a día?",
          ],
        },
        {
          pattern: "*",
          templates: [
            "Siento oír eso. ¿Quieres contarme más?",
            "¿Qué crees que provoca esa tristeza?",
            "¿Cómo te afecta eso a ti?",
          ],
        },
      ],
    },

    {
      key: "feliz",
      rank: 5,
      words: FELIZ,
      decompositions: [
        { pattern: "* no estoy * @feliz *", templates: ["¿Por qué no estás (3)?", "¿Qué necesitarías para estar (3)?"] },
        { pattern: "* no soy * @feliz *", templates: ["¿Por qué crees que no eres (3)?", "¿Qué necesitarías para ser (3)?"] },
        { pattern: "* no me siento * @feliz *", templates: ["¿Por qué no te sientes (3)?", "¿Qué necesitarías para sentirte (3)?"] },
        {
          pattern: "* estoy * @feliz *",
          templates: [
            "¿Cómo te he ayudado a estar (3)?",
            "¿Qué te hace estar (3) justo ahora?",
            "¿Puedes explicar por qué de repente estás (3)?",
          ],
        },
        {
          pattern: "* me siento * @feliz *",
          templates: ["¿Cómo te he ayudado a sentirte (3)?", "¿Qué te hace sentir (3) justo ahora?"],
        },
        {
          pattern: "* quiero * @feliz *",
          templates: ["¿Qué crees que te haría (3)?", "¿Qué significaría para ti ser (3)?"],
        },
        {
          pattern: "* @feliz *",
          templates: ["¿Qué te hace sentir (2)?", "¿Qué significa para ti ser (2)?", "Cuéntame más de eso."],
        },
      ],
    },

    {
      // Como NAME en el original: ELIZA no quiere saber nombres.
      key: "nombre",
      rank: 15,
      words: ["nombre", "me llamo", "te llamas"],
      decompositions: [
        {
          pattern: "*",
          templates: [
            "No me interesan los nombres.",
            "Ya te he dicho que los nombres no me importan. Continúa, por favor.",
          ],
        },
      ],
    },

    {
      key: "siempre",
      rank: 4,
      words: ["siempre"],
      decompositions: [
        {
          pattern: "* siempre *",
          templates: [
            "¿Puedes pensar en un ejemplo concreto?",
            "¿Cuándo?",
            "¿En qué situación concreta estás pensando?",
            "¿De verdad, siempre?",
          ],
        },
      ],
    },

    {
      key: "sueño",
      rank: 4,
      words: ["sueño", "sueños", "soñé", "soñar", "soñaba", "soñado", "pesadilla", "pesadillas"],
      decompositions: [
        {
          pattern: "*",
          templates: [
            "¿Qué crees que significa ese sueño?",
            "¿Sueñas a menudo?",
            "¿Qué personas aparecen en tus sueños?",
            "¿Crees que los sueños tienen algo que ver con tu problema?",
          ],
        },
      ],
    },

    {
      key: "me siento",
      rank: 3,
      words: ["me siento", "me sentía"],
      decompositions: [
        {
          pattern: "* no me siento *",
          templates: ["¿Por qué no te sientes (2)?", "¿Qué necesitarías para sentirte (2)?"],
        },
        {
          pattern: "* me siento *",
          templates: [
            "¿Te sientes (2) a menudo?",
            "Háblame más de esa sensación.",
            "¿Desde cuándo te sientes (2)?",
            "¿Te gusta sentirte (2)?",
          ],
        },
        {
          pattern: "* me sentía *",
          templates: ["¿Y cómo te sientes ahora?", "¿Qué te hacía sentirte (2)?"],
        },
      ],
    },

    {
      key: "me gusta",
      rank: 3,
      words: ["me gusta", "me gustan", "me encanta", "me encantan"],
      decompositions: [
        {
          pattern: "* no me gusta *",
          templates: [
            "¿Por qué no te gusta (2)?",
            phrase("¿Qué es lo que no te gusta de (2)?"),
            "¿Qué te gustaría que fuera diferente?",
          ],
        },
        { pattern: "* no me gustan *", templates: ["¿Por qué no te gustan (2)?", "¿Qué te gustaría que fuera diferente?"] },
        {
          pattern: "* me gusta *",
          templates: ["¿Por qué te gusta (2)?", phrase("¿Qué es lo que más te gusta de (2)?"), "¿Desde cuándo te gusta (2)?"],
        },
        { pattern: "* me gustan *", templates: ["¿Por qué te gustan (2)?", "¿Desde cuándo te gustan (2)?"] },
        { pattern: "* me encanta *", templates: [phrase("¿Qué es lo que te encanta de (2)?"), "¿Por qué te encanta (2)?"] },
        { pattern: "* me encantan *", templates: ["¿Por qué te encantan (2)?", "¿Desde cuándo te encantan (2)?"] },
      ],
    },

    {
      key: "me preocupa",
      rank: 3,
      words: ["me preocupa", "me preocupan", "me molesta", "me molestan"],
      decompositions: [
        { pattern: "* me preocupa *", templates: ["¿Por qué te preocupa (2)?", "¿Desde cuándo te preocupa (2)?"] },
        { pattern: "* me preocupan *", templates: ["¿Por qué te preocupan (2)?", "¿Desde cuándo te preocupan (2)?"] },
        { pattern: "* me molesta *", templates: ["¿Por qué te molesta (2)?", "¿Qué sientes cuando te molesta (2)?"] },
        { pattern: "* me molestan *", templates: ["¿Por qué te molestan (2)?", "¿Qué sientes cuando te molestan (2)?"] },
        { pattern: "*", templates: ["¿Qué es lo que más te preocupa?", "Háblame más de esa preocupación."] },
      ],
    },

    {
      key: "me duele",
      rank: 3,
      words: ["me duele", "me duelen"],
      decompositions: [
        {
          pattern: "* me duele *",
          templates: [
            "¿Desde cuándo te duele (2)?",
            "¿Qué crees que significa ese dolor?",
            "¿Te duele (2) cuando piensas en tus problemas?",
          ],
        },
        { pattern: "* me duelen *", templates: ["¿Desde cuándo te duelen (2)?", "¿Qué crees que significa ese dolor?"] },
      ],
    },

    {
      key: "estoy",
      rank: 3,
      words: ["estoy"],
      decompositions: [
        {
          pattern: "* no estoy *",
          templates: ["¿Por qué no estás (2)?", "¿Te gustaría estar (2)?", "¿Qué te impide estar (2)?"],
        },
        {
          pattern: "* estoy *",
          templates: [
            "¿Viniste a verme porque estás (2)?",
            "¿Desde cuándo estás (2)?",
            "¿Crees que es normal estar (2)?",
            "¿Te gusta estar (2)?",
          ],
        },
      ],
    },

    {
      key: "soy",
      rank: 3,
      words: ["soy"],
      decompositions: [
        { pattern: "* no soy *", templates: ["¿Por qué crees que no eres (2)?", "¿Te gustaría ser (2)?"] },
        {
          pattern: "* soy *",
          templates: [
            "¿Viniste a verme porque eres (2)?",
            "¿Desde cuándo eres (2)?",
            "¿Crees que es normal ser (2)?",
            "¿Te gusta ser (2)?",
          ],
        },
      ],
    },

    {
      key: "quiero",
      rank: 3,
      words: ["quiero", "necesito"],
      decompositions: [
        { pattern: "* te quiero *", templates: ["¿De verdad me quieres? Solo soy un programa.", "Hablemos de ti, no de mí."] },
        { pattern: "* no quiero *", templates: ["¿Por qué no quieres (2)?", "¿Y qué es lo que sí quieres?"] },
        {
          pattern: "* quiero *",
          templates: [
            "¿Qué significaría para ti conseguir (2)?",
            "¿Por qué quieres (2)?",
            "Imagina que consiguieras (2) pronto. ¿Qué pasaría?",
            "¿Y si nunca consiguieras (2)?",
          ],
        },
        {
          pattern: "* necesito *",
          templates: ["¿Por qué necesitas (2)?", "¿De verdad te ayudaría conseguir (2)?", "¿Seguro que necesitas (2)?"],
        },
      ],
    },

    {
      key: "puedo",
      rank: 2,
      words: ["puedo", "puedes"],
      decompositions: [
        {
          pattern: "* no puedo *",
          templates: ["¿Por qué crees que no puedes (2)?", "¿Qué pasaría si pudieras (2)?", "¿Qué te lo impide?"],
        },
        { pattern: "* puedo *", templates: ["¿Quieres poder (2)?", "¿Y si pudieras (2)?", "¿Qué te lo impide?"] },
        {
          pattern: "* puedes *",
          templates: ["¿Crees que puedo (2)?", "¿Te gustaría que pudiera (2)?", "¿Por qué me lo preguntas?"],
        },
      ],
    },

    {
      key: "eres",
      rank: 2,
      words: ["eres"],
      decompositions: [
        { pattern: "* no eres *", templates: ["¿Por qué crees que no soy (2)?", "¿Te gustaría que lo fuera?"] },
        {
          pattern: "* eres *",
          templates: [
            "¿Qué te hace pensar que soy (2)?",
            "¿Te gusta creer que soy (2)?",
            "¿A veces te gustaría ser (2)?",
          ],
        },
      ],
    },

    {
      key: "nadie",
      rank: 2,
      words: ["nadie", "todo el mundo"],
      decompositions: [
        {
          pattern: "* nadie *",
          templates: [
            "¿De verdad, nadie?",
            "¿Puedes pensar en alguien en concreto?",
            "¿Quién, por ejemplo?",
            "¿Estás pensando en alguien especial?",
          ],
        },
        {
          pattern: "*",
          templates: ["¿De verdad, todo el mundo?", "¿Puedes pensar en alguien en concreto?", "¿Quién, por ejemplo?"],
        },
      ],
    },

    {
      key: "mi",
      rank: 2,
      words: ["mi", "mis"],
      // «mi» sin tilde tras preposición puede ser «mí»: «para mi es difícil».
      when: ({ tokens, index }) => tokens[index]?.lower !== "mí" && !isPronounMi(tokens, index),
      decompositions: [
        {
          pattern: "* mi *",
          templates: [
            clause("¿Por qué crees que tu (2)?"),
            "¿Tu (2)?",
            clause("¿Eso tiene algo que ver con que tu (2)?"),
            phrase("Háblame más de tu (2)."),
          ],
        },
        {
          pattern: "* mis *",
          templates: [
            clause("¿Por qué crees que tus (2)?"),
            "¿Tus (2)?",
            clause("¿Eso tiene algo que ver con que tus (2)?"),
            phrase("Háblame más de tus (2)."),
          ],
        },
      ],
    },

    {
      key: "quizás",
      rank: 1,
      words: ["quizás", "quizá", "tal vez", "a lo mejor", "puede que"],
      decompositions: [
        {
          pattern: "*",
          templates: [
            "Parece que no lo tienes claro.",
            "¿Por qué ese tono de duda?",
            "¿No puedes concretar un poco más?",
            "¿No lo sabes con certeza?",
          ],
        },
      ],
    },

    {
      key: "porque",
      rank: 1,
      words: ["porque", "ya que", "xq", "pq"],
      decompositions: [
        {
          pattern: "*",
          templates: [
            "¿Es esa la verdadera razón?",
            "¿No se te ocurren otras razones?",
            "¿Esa razón explica algo más?",
            "¿Qué otras razones podría haber?",
          ],
        },
      ],
    },

    {
      key: "tú",
      rank: 0,
      words: ["tú", "tu"],
      when: ({ tokens, index }) => isPronounTu(tokens, index),
      decompositions: [
        {
          pattern: "* tu *",
          templates: [
            clause("¿Por qué crees que yo (2)?"),
            "Estamos hablando de ti, no de mí.",
            clause("¿Te gusta pensar que yo (2)?"),
          ],
        },
      ],
    },

    {
      key: "lo siento",
      rank: 0,
      words: ["lo siento", "lo lamento", "perdón", "perdona", "perdone", "disculpa", "disculpe"],
      decompositions: [
        {
          pattern: "*",
          templates: [
            "Por favor, no te disculpes.",
            "No hace falta que te disculpes.",
            "¿Qué sientes cuando pides perdón?",
            "Ya te he dicho que no hace falta pedir perdón.",
          ],
        },
      ],
    },

    {
      key: "sí",
      rank: 0,
      words: ["sí"],
      // «si» sin tilde suele ser condicional; solo cuenta si va sola o al final.
      when: ({ tokens, index }) =>
        tokens[index]?.lower === "sí" || tokens.length <= 2 || index === tokens.length - 1,
      decompositions: [
        { pattern: "*", templates: ["Lo dices con mucha seguridad.", "¿Lo tienes claro?", "Ya veo.", "Entiendo."] },
      ],
    },

    {
      key: "no",
      rank: 0,
      words: ["no"],
      // Solo el «no» como respuesta («No.», «Pues no»), no cada negación ni «No sé».
      when: ({ tokens, index }) => tokens.length <= 3 && tokens[index + 1]?.norm !== "se",
      decompositions: [
        {
          pattern: "*",
          templates: [
            "¿Dices que no solo por llevar la contraria?",
            "Eso suena un poco negativo.",
            "¿Por qué no?",
            "¿Por qué «no»?",
          ],
        },
      ],
    },

    {
      key: "pregunta",
      rank: 0,
      words: ["qué", "cómo", "cuándo", "dónde", "quién", "por qué"],
      when: ({ tokens, index, isQuestion }) =>
        isQuestion &&
        (index === 0 || tokens.slice(index, index + 2).some((t) => hasAccent(t.lower))),
      decompositions: [
        {
          pattern: "*",
          templates: [
            "¿Por qué lo preguntas?",
            "¿Te interesa esa pregunta?",
            "¿Qué es lo que de verdad quieres saber?",
            "¿Tú qué crees?",
          ],
        },
      ],
    },

    {
      key: "hola",
      rank: 0,
      words: ["hola", "buenas", "buenos días", "buenas tardes", "saludos"],
      decompositions: [
        {
          pattern: "*",
          templates: ["Hola. Cuéntame qué te preocupa.", "Hola de nuevo. ¿De qué te gustaría hablar?"],
        },
      ],
    },

    {
      key: "adiós",
      rank: 0,
      words: ["adiós", "chao", "chau", "hasta luego", "hasta pronto", "nos vemos"],
      decompositions: [
        {
          pattern: "*",
          templates: [
            "Adiós. Ha sido un placer hablar contigo.",
            "Hasta pronto. Cuídate mucho.",
            "Gracias por la conversación. Adiós.",
          ],
        },
      ],
    },
  ],

  fallbacks: [
    "Por favor, continúa.",
    "Entiendo.",
    "¿Qué te hace pensar eso?",
    "No estoy segura de entenderte del todo.",
    "¿Y eso qué te sugiere?",
    "¿Te importa hablar de este tipo de cosas?",
    "Cuéntame más.",
  ],

  safeTemplates: [
    "Háblame más de eso.",
    "¿Y cómo te hace sentir eso?",
    "¿Por qué lo dices?",
    "Sigue, te escucho.",
  ],

  memoryTemplates: {
    singular: [
      "Antes dijiste que tu (2).",
      "Hablemos más de por qué tu (2).",
      "¿Tiene esto algo que ver con que tu (2)?",
    ],
    plural: [
      "Antes dijiste que tus (2).",
      "Hablemos más de por qué tus (2).",
      "¿Tiene esto algo que ver con que tus (2)?",
    ],
  },
};
