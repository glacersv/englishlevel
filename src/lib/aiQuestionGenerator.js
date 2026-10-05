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

// ============================================================
// GENERADOR DE PREGUNTAS ORALES CON IA PARA ENTREVISTA (A1 - C1)
// ============================================================
const ORAL_AI_TEMPLATES = {
  A1: [
    {
      topic: 'Daily Routine & School Life',
      question: 'What time do you usually arrive at school, and who do you walk with?',
      visualPrompt: 'Muestra o describe tu mochila escolar, tus útiles y tu horario de clases.'
    },
    {
      topic: 'Family and Friends',
      question: 'Can you describe your best friend or a family member? (Name, age, what they like to do).',
      visualPrompt: 'Piensa en una fotografía de tu familia o amigo y describe cómo es.'
    },
    {
      topic: 'Food and Preferences',
      question: 'What is your favorite lunch meal, and what foods do you really dislike?',
      visualPrompt: 'Imagina el menú de la cafetería escolar y describe tu plato preferido.'
    },
    {
      topic: 'My Room & Personal Objects',
      question: 'What objects are there on your study desk or in your bedroom?',
      visualPrompt: 'Señala o visualiza tu escritorio y menciona 3 objetos que siempre utilizas.'
    }
  ],
  A2: [
    {
      topic: 'Past Vacation & Weekend',
      question: 'What did you do last weekend? Tell me about where you went and who was with you.',
      visualPrompt: 'Imagina una foto de tus últimas vacaciones o paseo familiar y descríbela.'
    },
    {
      topic: 'Giving Directions & City Life',
      question: 'How do you get from your house to the school? Mention at least two streets or landmarks.',
      visualPrompt: 'Visualiza un mapa urbano sencillo: gira a la derecha, avanza dos cuadras, frente al parque.'
    },
    {
      topic: 'Future Plans & Hobbies',
      question: 'What are you going to do after classes today, and what hobby do you want to learn this year?',
      visualPrompt: 'Menciona tus planes para esta tarde en orden cronológico.'
    },
    {
      topic: 'Health and Sports',
      question: 'What sports or physical activities do you practice to stay healthy?',
      visualPrompt: 'Describe las reglas básicas o qué ropa deportiva necesitas para ese deporte.'
    }
  ],
  B1: [
    {
      topic: 'Technology in Education',
      question: 'How has using smartphones and tablets changed the way students do homework today?',
      visualPrompt: 'Compara una imagen de una biblioteca tradicional de libros frente a un aula con tablets digitales.'
    },
    {
      topic: 'Travel & Cultural Experiences',
      question: 'If you could travel to any country in the world tomorrow, where would you go and what would you explore?',
      visualPrompt: 'Imagina que tienes una guía turística en mano: explica por qué elegiste ese destino.'
    },
    {
      topic: 'Environmental Awareness',
      question: 'What simple actions can our school community take to reduce plastic waste and save energy?',
      visualPrompt: 'Observa una campaña de reciclaje escolar y explica cómo motivar a tus compañeros.'
    },
    {
      topic: 'Film & Entertainment',
      question: 'Describe a movie or book that inspired you recently. What was the central message?',
      visualPrompt: 'Describe la portada o el afiche del póster de la película y los personajes principales.'
    }
  ],
  B2: [
    {
      topic: 'Social Media & Mental Health (FOMO)',
      question: 'How does constant connectivity and the Fear of Missing Out (FOMO) affect teenagers\' self-esteem?',
      visualPrompt: 'Analiza una infografía sobre tiempo de pantalla, notificaciones y niveles de estrés en jóvenes.'
    },
    {
      topic: 'Global Careers & Artificial Intelligence',
      question: 'In your opinion, how will artificial intelligence reshape the future jobs and university degrees?',
      visualPrompt: 'Compara empleos automatizados por software frente a profesiones que exigen empatía humana.'
    },
    {
      topic: 'Leadership & Teamwork',
      question: 'Describe a challenging project where you worked in a team. How did you resolve disagreements?',
      visualPrompt: 'Visualiza un proyecto escolar complejo y explica cómo repartieron los roles de liderazgo.'
    },
    {
      topic: 'Ethical Consumerism',
      question: 'Should consumers boycott companies that damage the environment, even if their products are cheaper?',
      visualPrompt: 'Evalúa el balance entre precio accesible y responsabilidad ecológica empresarial.'
    }
  ],
  C1: [
    {
      topic: 'Mindset & Neuroplasticity',
      question: 'How does Carol Dweck\'s Growth Mindset model contrast with a Fixed Mindset when confronting severe academic setbacks?',
      visualPrompt: 'Examina un diagrama de neuroplasticidad: esfuerzo constante vs. talento innato prefijado.'
    },
    {
      topic: 'Ethics in Scientific Innovation',
      question: 'To what extent should governments regulate genetic editing and artificial intelligence development globally?',
      visualPrompt: 'Analiza los dilemas bioéticos y la necesidad de consensos regulatorios internacionales.'
    },
    {
      topic: 'Linguistic Identity & Globalization',
      question: 'Does the dominance of English as a global lingua franca threaten local languages and cultural diversity?',
      visualPrompt: 'Examina la coexistencia de lenguas originarias y el inglés en los negocios globales.'
    },
    {
      topic: 'Social Inequality & Policy Reform',
      question: 'What systemic strategies can modern institutions implement to bridge the socio-economic opportunity gap?',
      visualPrompt: 'Contrasta políticas de becas de inclusión frente a reformas estructurales en el sistema educativo.'
    }
  ]
}

export function generateOralInterviewQuestionWithAI(level = 'A1', customTopic = '') {
  const cleanLevel = (level || 'A1').toUpperCase()
  const pool = ORAL_AI_TEMPLATES[cleanLevel] || ORAL_AI_TEMPLATES.A1

  // Si hay tema personalizado o filtro, buscar coincidencia, si no elegir al azar
  let candidate
  if (customTopic) {
    const matched = pool.filter(q => q.topic.toLowerCase().includes(customTopic.toLowerCase()))
    candidate = matched.length > 0 ? matched[Math.floor(Math.random() * matched.length)] : pool[Math.floor(Math.random() * pool.length)]
  } else {
    candidate = pool[Math.floor(Math.random() * pool.length)]
  }

  return {
    id: `oral_ai_${cleanLevel}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    level: cleanLevel,
    topic: candidate.topic,
    question: candidate.question,
    visualPrompt: candidate.visualPrompt || null,
    isCustom: true,
    generatedByAI: true,
    createdAt: new Date().toISOString()
  }
}
