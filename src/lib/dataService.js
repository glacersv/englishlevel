// ============================================================
// CAPA DE DATOS (Firestore con fallback local para desarrollo)
// Colecciones:
//   exams/{examId}  -> { level, title, grade, questions: [...], active }
//   results/{uid}   -> { studentName, grade, attempts: [{level, correct, total, passed}] }
// Si Firebase no está configurado aún, usa localStorage para que
// puedas probar toda la app sin conexión.
// ============================================================
import { db, isFirebaseConfigured } from './firebase'
import { collection, getDocs, setDoc, doc, query, where } from 'firebase/firestore'

const LS_EXAMS = 'el_exams'
const LS_RESULTS = 'el_results'

const readLS = k => JSON.parse(localStorage.getItem(k) || '[]')
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v))

// ---------- EXÁMENES ----------
export async function saveExam(exam) {
  if (isFirebaseConfigured()) {
    await setDoc(doc(db, 'exams', exam.id), exam)
  } else {
    const all = readLS(LS_EXAMS)
    const i = all.findIndex(e => e.id === exam.id)
    i >= 0 ? (all[i] = exam) : all.push(exam)
    writeLS(LS_EXAMS, all)
  }
  return exam
}

export async function getExams(levelId, grade) {
  let all
  if (isFirebaseConfigured()) {
    const q = query(collection(db, 'exams'), where('level', '==', levelId))
    all = (await getDocs(q)).docs.map(d => d.data())
  } else {
    all = readLS(LS_EXAMS)
  }
  return all.filter(e => e.active !== false && (!grade || e.grade === grade))
}

// ---------- RESULTADOS / CLASIFICACIÓN ----------
export async function saveResult(result) {
  if (isFirebaseConfigured()) {
    await setDoc(doc(db, 'results', result.id), result, { merge: true })
  } else {
    const all = readLS(LS_RESULTS)
    const i = all.findIndex(r => r.id === result.id)
    i >= 0 ? (all[i] = result) : all.push(result)
    writeLS(LS_RESULTS, all)
  }
  return result
}

// Regla de negocio: recorre niveles en orden; si alcanza minCorrect avanza.
// El nivel FINAL asignado es el último que aprobó (ahí recibirá clases).
export function classify(attempts) {
  const order = ['basico', 'intermedio', 'avanzado']
  let assigned = null
  for (const lvl of order) {
    const a = attempts.find(x => x.level === lvl)
    if (a && a.passed) assigned = lvl
    else break // si reprobó un nivel, no puede evaluarse sobre los siguientes
  }
  return assigned ?? 'sin_nivel' // sin_nivel => básico reforzado
}
