// ============================================================
// CATÁLOGO DE MÓDULOS INTERACTIVOS (paquetes tipo wizard)
// Cada módulo define: id, nombre, ícono, cómo se ve, y
// cómo se AUTOCORRIGE (checkAnswer) para dar feedback inmediato.
// El docente solo rellena datos con `makeEmpty` en el builder.
// ============================================================

export const LEVELS = [
  { id: 'basico',      name: 'Básico',      color: '#58cc02', minCorrect: 4 },
  { id: 'intermedio',  name: 'Intermedio',  color: '#1cb0f6', minCorrect: 4 },
  { id: 'avanzado',    name: 'Avanzado',    color: '#ce82ff', minCorrect: 3 },
]

export const MODULES = {
  // ---------- 1. OPCIÓN MÚLTIPLE ----------
  multipleChoice: {
    id: 'multipleChoice',
    name: 'Opción múltiple',
    icon: '🔘',
    desc: 'El alumno elige una respuesta entre varias opciones.',
    makeEmpty: () => ({
      type: 'multipleChoice',
      prompt: '¿Cuál es la traducción de "La niña está comiendo"?',
      options: ['The girl is eating', 'The boy is eating', 'The girl eats apple'],
      correctIndex: 0,
    }),
    checkAnswer: (q, studentAnswer) => studentAnswer === q.correctIndex,
  },

  // ---------- 2. ORDENAR ORACIÓN (arrastrar palabras) ----------
  orderSentence: {
    id: 'orderSentence',
    name: 'Ordenar oración',
    icon: '🧩',
    desc: 'Arrastra (o toca) las palabras para construir la oración correcta.',
    makeEmpty: () => ({
      type: 'orderSentence',
      prompt: 'Ordena las palabras para formar la oración:',
      words: ['She', 'is', 'reading', 'a', 'book'],   // orden correcto
      translation: 'Ella está leyendo un libro',
    }),
    // studentAnswer = arreglo de índices en el orden que puso el alumno
    checkAnswer: (q, studentAnswer) =>
      Array.isArray(studentAnswer) &&
      studentAnswer.length === q.words.length &&
      studentAnswer.every((idx, pos) => q.words[idx] === q.words[pos]),
  },

  // ---------- 3. COMPLETAR PÁRRAFO (huecos + banco de palabras) ----------
  fillParagraph: {
    id: 'fillParagraph',
    name: 'Completar párrafo',
    icon: '📝',
    desc: 'Párrafo con huecos; el alumno arrastra palabras del banco a cada hueco.',
    makeEmpty: () => ({
      type: 'fillParagraph',
      prompt: 'Completa el párrafo con las palabras del banco:',
      // Usa ___{n}___ para marcar cada hueco
      text: 'Yesterday I ___0___ to the park and I ___1___ a dog. We ___2___ together.',
      blanks: [
        { answer: 'went',   options: ['went', 'go', 'gone'] },
        { answer: 'saw',    options: ['see', 'saw', 'seen'] },
        { answer: 'played', options: ['played', 'play', 'playing'] },
      ],
    }),
    // studentAnswer = arreglo de palabras elegidas por hueco
    checkAnswer: (q, studentAnswer) =>
      Array.isArray(studentAnswer) &&
      q.blanks.every((b, i) => studentAnswer[i] === b.answer),
  },

  // ---------- 4. LISTENING (reproducir audio → responder) ----------
  listening: {
    id: 'listening',
    name: 'Escuchar y responder',
    icon: '🎧',
    desc: 'Se reproduce un audio (archivo del docente o voz sintetizada) y el alumno responde.',
    makeEmpty: () => ({
      type: 'listening',
      prompt: 'Escucha y elige la opción correcta:',
      audioUrl: '',                       // opcional: URL o archivo subido a Firebase Storage
      ttsText: 'I usually wake up at seven o clock.', // fallback: voz generada por el navegador
      question: '¿A qué hora se despierta?',
      options: ['A las 7:00', 'A las 9:00', 'A las 12:00'],
      correctIndex: 0,
    }),
    checkAnswer: (q, studentAnswer) => studentAnswer === q.correctIndex,
  },

  // ---------- 5. HABLAR (grabar audio → análisis simple) ----------
  speaking: {
    id: 'speaking',
    name: 'Hablar / grabar',
    icon: '🎤',
    desc: 'El alumno graba repitiendo una frase. Se transcribe con el micrófono y se compara palabra a palabra.',
    makeEmpty: () => ({
      type: 'speaking',
      prompt: 'Graba tu voz diciendo:',
      targetText: 'The weather is nice today',
      tolerance: 0.7, // % mínimo de palabras correctas para aprobar
    }),
    // studentAnswer = texto transcrito del audio del alumno
    checkAnswer: (q, studentAnswer) => {
      if (!studentAnswer) return false
      const norm = s => s.toLowerCase().replace(/[^a-zñ\s']/g, '').split(/\s+/).filter(Boolean)
      const target = norm(q.targetText)
      const said = norm(studentAnswer)
      let hits = 0
      target.forEach(w => { if (said.includes(w)) hits++ })
      return hits / target.length >= (q.tolerance ?? 0.7)
    },
  },

  // ---------- 6. ESCRITURA MANUAL (comparar con clave) ----------
  writing: {
    id: 'writing',
    name: 'Escribir oración',
    icon: '✍️',
    desc: 'El alumno escribe la oración completa a mano (ej. tras escuchar un audio).',
    makeEmpty: () => ({
      type: 'writing',
      prompt: 'Escribe en inglés lo que escuchaste:',
      ttsText: 'My brother plays soccer on Sundays.',
      audioUrl: '',
      acceptedAnswers: ['my brother plays soccer on sundays'],
    }),
    checkAnswer: (q, studentAnswer) => {
      if (!studentAnswer) return false
      const norm = s => s.toLowerCase().replace(/[^a-zñ\s']/g, '').replace(/\s+/g, ' ').trim()
      return q.acceptedAnswers.some(a => norm(a) === norm(studentAnswer))
    },
  },
}

export const moduleCatalog = () => Object.values(MODULES)
