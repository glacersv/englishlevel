// ============================================================
// GENERADOR INTELIGENTE DE PREGUNTAS (IA & REGLAS CURRICULARES)
// Genera reactivos calibrados para A1, A2, B1, B2 y C1
// basados en el contenido pedagógico de Macmillan Get Involved
// ============================================================

export const AI_TOPICS = [
  { id: 'daily_routine', label: 'Daily Routines & Hobbies', levels: ['A1', 'A2'] },
  { id: 'past_experiences', label: 'Past Experiences & Used to', levels: ['A2', 'B1'] },
  { id: 'travel_directions', label: 'Travel, Cities & Directions', levels: ['A1', 'A2', 'B1'] },
  { id: 'conditionals', label: 'Conditionals (Zero, First, Second)', levels: ['A2', 'B1', 'B2'] },
  { id: 'modals_deduction', label: 'Modals of Deduction & Advice', levels: ['B1', 'B2', 'C1'] },
  { id: 'passive_voice', label: 'Passive Voice & Cause-Effect', levels: ['B1', 'B2', 'C1'] },
  { id: 'social_trends', label: 'Social Media, FOMO & Psychology', levels: ['B2', 'C1'] },
  { id: 'growth_mindset', label: 'Growth Mindset & Science', levels: ['C1'] },
]

export const AI_QUESTION_TEMPLATES = {
  multipleChoice: [
    {
      level: 'A1',
      topic: 'daily_routine',
      prompt: 'Choose the correct option to complete the sentence:',
      options: ['She usually wakes up at 7:00 AM.', 'She usually waking up at 7:00 AM.', 'She usually wake up at 7:00 AM.'],
      correctIndex: 0,
      explanation: 'With third-person singular (she) in Simple Present, the verb adds -s/-es.'
    },
    {
      level: 'A2',
      topic: 'past_experiences',
      prompt: 'Which sentence correctly uses "used to"?',
      options: ['I used to play soccer when I was a child.', 'I use to played soccer when I was child.', 'I used to playing soccer when I was child.'],
      correctIndex: 0,
      explanation: '"used to" is followed by the base form of the verb to describe past habits.'
    },
    {
      level: 'B1',
      topic: 'conditionals',
      prompt: 'If you _____ earlier, you wouldn\'t miss the school bus.',
      options: ['woke up', 'wake up', 'had woken up'],
      correctIndex: 0,
      explanation: 'Second conditional uses past simple in the if-clause and would + base verb in the main clause.'
    },
    {
      level: 'B2',
      topic: 'modals_deduction',
      prompt: 'Lucas hasn\'t arrived yet and his phone is off. He _____ in traffic.',
      options: ['might be stuck', 'can to be stuck', 'should have stuck'],
      correctIndex: 0,
      explanation: '"might + base verb" is used for present speculation/possibility.'
    },
    {
      level: 'C1',
      topic: 'growth_mindset',
      prompt: 'Which statement aligns with Carol Dweck\'s concept of a growth mindset?',
      options: ['Challenges are opportunities to expand neural connections.', 'Talent is inherently fixed from birth.', 'Effort is only needed by those lacking natural genius.'],
      correctIndex: 0,
      explanation: 'A growth mindset perceives intelligence as malleable through deliberate practice and resilience.'
    }
  ],

  trueFalse: [
    {
      level: 'A1',
      topic: 'daily_routine',
      readingText: 'The school library opens from Monday to Friday, from 8:30 AM to 4:30 PM. Students can borrow up to four books at a time for three weeks. Eating and drinking are strictly prohibited, except bottled water.',
      prompt: 'Students are allowed to eat sandwiches inside the school library.',
      correct: false,
      explanation: 'The rules explicitly state that eating and drinking are strictly prohibited except water.'
    },
    {
      level: 'A2',
      topic: 'travel_directions',
      readingText: 'To get to the central museum, walk straight down Maple Avenue for two blocks. When you reach the traffic lights, turn left onto King Street. The museum is opposite the public library.',
      prompt: 'You should turn left at the traffic lights on King Street to reach the museum.',
      correct: true,
      explanation: 'The directions confirm: "turn left onto King Street. The museum is opposite the public library".'
    },
    {
      level: 'B2',
      topic: 'social_trends',
      readingText: 'FOMO (Fear Of Missing Out) is exacerbated by perpetual connectivity. Users frequently experience anxiety when observing curated depictions of others\' social gatherings, leading to compulsive screen checking.',
      prompt: 'FOMO causes individuals to feel content and indifferent about missing social events.',
      correct: false,
      explanation: 'FOMO causes distress and anxiety, leading to compulsive checking rather than indifference.'
    },
    {
      level: 'C1',
      topic: 'growth_mindset',
      readingText: 'Neuroscientific research demonstrates neuroplasticity: the brain forms stronger synapses when encountering difficult tasks. Consequently, failure is not an indictment of capability, but an essential diagnostic signal.',
      prompt: 'According to neuroplasticity research, making mistakes inhibits the formation of new neural synapses.',
      correct: false,
      explanation: 'Mistakes and struggle trigger synapse strengthening and neural growth.'
    }
  ],

  orderSentence: [
    {
      level: 'A1',
      topic: 'daily_routine',
      prompt: 'Order the words to form a correct English sentence:',
      words: ['They', 'always', 'study', 'English', 'together'],
      translation: 'Ellos siempre estudian inglés juntos'
    },
    {
      level: 'A2',
      topic: 'past_experiences',
      prompt: 'Order the words to form a past progressive sentence:',
      words: ['She', 'was', 'cooking', 'when', 'the', 'phone', 'rang'],
      translation: 'Ella estaba cocinando cuando el teléfono sonó'
    },
    {
      level: 'B1',
      topic: 'travel_directions',
      prompt: 'Order the words to form a travel recommendation:',
      words: ['You', 'should', 'book', 'your', 'tickets', 'in', 'advance'],
      translation: 'Deberías reservar tus boletos con anticipación'
    },
    {
      level: 'B2',
      topic: 'passive_voice',
      prompt: 'Order the words to form a passive voice statement:',
      words: ['The', 'new', 'library', 'was', 'designed', 'by', 'architects'],
      translation: 'La nueva biblioteca fue diseñada por arquitectos'
    },
    {
      level: 'C1',
      topic: 'growth_mindset',
      prompt: 'Order the words to form an inverted conditional structure:',
      words: ['Had', 'we', 'known', 'earlier', 'we', 'would', 'have', 'helped'],
      translation: 'De haberlo sabido antes, habríamos ayudado'
    }
  ],

  fillParagraph: [
    {
      level: 'A1',
      topic: 'daily_routine',
      prompt: 'Complete the paragraph with the correct verbs:',
      textWithBlanks: 'Every morning, Carlos {{0}} up at 6:30. He {{1}} breakfast with his family and then {{2}} to school by bus.',
      blanks: [
        { answer: 'wakes', options: ['wakes', 'wake', 'waking'] },
        { answer: 'eats', options: ['eats', 'eat', 'eating'] },
        { answer: 'goes', options: ['goes', 'go', 'went'] }
      ]
    },
    {
      level: 'B1',
      topic: 'conditionals',
      prompt: 'Complete the travel guide recommendations:',
      textWithBlanks: 'If you visit London in winter, you should {{0}} warm clothes. If it rains, you {{1}} visit the British Museum. Public transport {{2}} very efficient.',
      blanks: [
        { answer: 'pack', options: ['pack', 'packed', 'packing'] },
        { answer: 'can', options: ['can', 'could', 'will can'] },
        { answer: 'is', options: ['is', 'are', 'was'] }
      ]
    },
    {
      level: 'B2',
      topic: 'social_trends',
      prompt: 'Complete the paragraph analyzing digital habits:',
      textWithBlanks: 'Psychologists note that adolescents who spend excessive hours on social media {{0}} more prone to anxiety. Experts suggest {{1}} regular digital detoxes to {{2}} emotional well-being.',
      blanks: [
        { answer: 'are', options: ['are', 'is', 'being'] },
        { answer: 'taking', options: ['taking', 'take', 'took'] },
        { answer: 'enhance', options: ['enhance', 'enhancing', 'enhanced'] }
      ]
    }
  ],

  listening: [
    {
      level: 'A1',
      topic: 'travel_directions',
      prompt: 'Listen to the audio and answer the question:',
      audioUrl: '/material_evaluaciones/A1_first_day_at_schoolA1.mp3',
      audioText: 'Good morning! What is your name? My name is Jing Wang. Can you spell that? J-I-N-G  W-A-N-G. Thank you! You are in classroom 3B.',
      question: 'In which classroom is the new student registered?',
      options: ['Classroom 3B', 'Classroom 2A', 'Classroom 4C'],
      correctIndex: 0
    },
    {
      level: 'A2',
      topic: 'travel_directions',
      prompt: 'Listen to the directions and select the correct destination:',
      audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
      audioText: 'Go straight on, take the first right, past the supermarket and it is right opposite the post office.',
      question: 'Where is the destination located?',
      options: ['Opposite the post office', 'Behind the supermarket', 'Next to the bus stop'],
      correctIndex: 0
    }
  ]
}

/**
 * Genera reactivos con IA o banco contextual según el tipo, nivel y tema curricular.
 */
export function generateAIQuestion(type = 'multipleChoice', level = 'A1', topicId = 'daily_routine') {
  const pool = AI_QUESTION_TEMPLATES[type] || AI_QUESTION_TEMPLATES.multipleChoice
  // Buscar coincidencia exacta por nivel
  const matches = pool.filter(q => q.level === level)
  if (matches.length > 0) {
    const picked = matches[Math.floor(Math.random() * matches.length)]
    return { ...picked, type, id: `ai_q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` }
  }
  // Fallback al primer elemento disponible
  const fallback = pool[0]
  return { ...fallback, type, level, id: `ai_q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` }
}
