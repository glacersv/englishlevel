// ============================================================
// MODELO DE DATOS DE LA ENTREVISTA ORAL (INTERVIEW DIAGNOSTIC)
// Criterios oficiales extraídos de la rúbrica CSSJ:
// - Pronunciation (1 - 4)
// - Grammar in Speech (1 - 4)
// - Comprehension (1 - 4)
// - Fluency (1 - 4)
// - Communicative Ability (1 - 4)
// ============================================================

import rawQuestions from '../data/interviewQuestions.json'

export const RUBRIC_CRITERIA = [
  { id: 'pronunciation', name: 'Pronunciation', desc: 'Claridad en sonidos vocálicos, consonantes y entonación' },
  { id: 'grammar', name: 'Grammar in Speech', desc: 'Uso adecuado de estructuras gramaticales al hablar' },
  { id: 'comprehension', name: 'Comprehension', desc: 'Entendimiento auditivo inmediato de la pregunta sin requerir traducción' },
  { id: 'fluency', name: 'Fluency', desc: 'Ritmo, pausas naturales y velocidad de respuesta' },
  { id: 'communicative', name: 'Communicative Ability', desc: 'Capacidad de transmitir la idea y mantener el intercambio' },
]

export const RUBRIC_SCORES = [
  { val: 4, label: '4 - Excelente', color: 'bg-emerald-500 text-white' },
  { val: 3, label: '3 - Bueno / Satisfactorio', color: 'bg-blue-500 text-white' },
  { val: 2, label: '2 - En Desarrollo / Requiere Apoyo', color: 'bg-amber-500 text-white' },
  { val: 1, label: '1 - Inicial / Limitado', color: 'bg-red-500 text-white' },
]

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

export const LEVEL_METADATA = {
  A1: { name: 'A1 - Principiante / Acceso', color: '#10b981', next: 'A2', minScore: 12 },
  A2: { name: 'A2 - Básico / Plataforma', color: '#06b6d4', next: 'B1', minScore: 13 },
  B1: { name: 'B1 - Pre-Intermedio / Umbral', color: '#3b82f6', next: 'B2', minScore: 14 },
  B2: { name: 'B2 - Intermedio Alto / Avanzado', color: '#8b5cf6', next: 'C1', minScore: 15 },
  C1: { name: 'C1 - Dominio Operativo Eficaz', color: '#ec4899', next: null, minScore: 16 },
}

// Obtener todas las preguntas organizadas por nivel
export function getQuestionsByLevel(level) {
  return rawQuestions.filter(q => q.level.toUpperCase() === level.toUpperCase())
}

// Obtener 3 preguntas aleatorias o seleccionadas para un nivel
export function getRandom3Questions(level) {
  const pool = getQuestionsByLevel(level)
  if (pool.length <= 3) return pool
  const shuffled = [...pool].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 3)
}
