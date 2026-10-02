// ============================================================
// CAPA DE DATOS (Firestore con fallback local para desarrollo)
// Colecciones:
//   users/{cleanEmail}           -> { email, name, role, status, validatedBy, updatedAt, grade, section, carnet, selfReportedLevel }
//   academicStructure/config     -> { grades: [...], sections: [...], levels: [...] }
//   oralEvaluations/{evalId}     -> { studentCarnet, studentName, grade, section, teacherEmail, finalLevel, totalDurationSeconds, levelsEvaluated: {...}, createdAt }
//   exams/{examId}               -> { level, title, grade, questions: [...], active }
// ============================================================
import { db, isFirebaseConfigured } from './firebase'
import { collection, getDocs, setDoc, getDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import defaultSchoolStudents from '../data/studentsFromSchool.json'

const LS_USERS = 'el_users'
const LS_ORAL_EVALS = 'el_oral_evals'
const LS_EXAMS = 'el_exams'
const LS_RESULTS = 'el_results'
const LS_ACADEMIC = 'el_academic_structure'

const readLS = k => JSON.parse(localStorage.getItem(k) || '[]')
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v))

export const sanitizeDocId = email => (email || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_')

// ---------- CONFIGURACIÓN DINÁMICA DE GRADOS, SECCIONES Y NIVELES ----------

const DEFAULT_ACADEMIC = {
  grades: [
    { id: '6', label: '6° Grado' },
    { id: '7', label: '7° Grado' },
    { id: '8', label: '8° Grado' },
    { id: '9', label: '9° Grado' },
    { id: '10', label: '1° Bachillerato (10°)' },
    { id: '11', label: '2° Bachillerato (11°)' },
    { id: '12', label: '3° Bachillerato Técnico (12°)' }
  ],
  sections: ['A', 'B', 'C', 'D'],
  levels: [
    { id: 'A1', name: 'A1 - Principiante / Acceso', color: '#10b981' },
    { id: 'A2', name: 'A2 - Básico / Plataforma', color: '#06b6d4' },
    { id: 'B1', name: 'B1 - Pre-Intermedio / Umbral', color: '#3b82f6' },
    { id: 'B2', name: 'B2 - Intermedio Alto / Avanzado', color: '#8b5cf6' },
    { id: 'C1', name: 'C1 - Dominio Operativo Eficaz', color: '#ec4899' }
  ]
}

export async function getAcademicStructure() {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'academicStructure', 'config'))
      if (snap.exists()) {
        return snap.data()
      }
    } catch (e) {
      console.warn('Error leyendo academicStructure:', e)
    }
  }
  const local = JSON.parse(localStorage.getItem(LS_ACADEMIC) || 'null')
  if (local) return local
  // Inicializar por defecto
  saveAcademicStructure(DEFAULT_ACADEMIC)
  return DEFAULT_ACADEMIC
}

export async function saveAcademicStructure(config) {
  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'academicStructure', 'config'), config, { merge: true })
    } catch (e) {
      console.warn('Error guardando academicStructure:', e)
    }
  }
  localStorage.setItem(LS_ACADEMIC, JSON.stringify(config))
  return config
}

// ---------- GESTIÓN DE USUARIOS Y ALUMNOS (CRUD COMPLETO) ----------

export async function getUserProfile(email) {
  const cleanEmail = (email || '').trim().toLowerCase()
  if (!cleanEmail) return null
  const docId = sanitizeDocId(cleanEmail)

  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'users', docId))
      if (snap.exists()) return snap.data()
    } catch (err) {
      console.warn('Error al consultar usuario en Firestore, usando fallback:', err)
    }
  }

  const all = readLS(LS_USERS)
  return all.find(u => u.email.toLowerCase() === cleanEmail) || null
}

export async function registerOrUpdateUser(userData) {
  const cleanEmail = (userData.email || '').trim().toLowerCase()
  const docId = sanitizeDocId(cleanEmail)

  const record = {
    ...userData,
    email: cleanEmail,
    updatedAt: new Date().toISOString()
  }

  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'users', docId), record, { merge: true })
    } catch (err) {
      console.warn('Error guardando usuario en Firestore:', err)
    }
  }

  const all = readLS(LS_USERS)
  const idx = all.findIndex(u => u.email.toLowerCase() === cleanEmail)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...record }
  } else {
    all.push(record)
  }
  writeLS(LS_USERS, all)

  return record
}

// Permite al alumno auto-declarar su nivel previo percibido
export async function saveStudentSelfLevel(email, selfReportedLevel) {
  return await registerOrUpdateUser({
    email,
    selfReportedLevel,
    selfReportedAt: new Date().toISOString()
  })
}

export async function deleteUser(email) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const docId = sanitizeDocId(cleanEmail)

  if (isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, 'users', docId))
    } catch (err) {
      console.warn('Error al eliminar usuario en Firestore:', err)
    }
  }

  const all = readLS(LS_USERS)
  const filtered = all.filter(u => u.email.toLowerCase() !== cleanEmail)
  writeLS(LS_USERS, filtered)
  return true
}

export async function getAllUsers() {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'users'))
      if (!snap.empty) {
        return snap.docs.map(d => d.data())
      }
    } catch (err) {
      console.warn('Error obteniendo usuarios de Firestore:', err)
    }
  }

  let local = readLS(LS_USERS)
  if (!local || local.length === 0) {
    local = defaultSchoolStudents
    writeLS(LS_USERS, local)
  }
  return local
}

export async function updateUserStatus(email, newStatus, validatedByEmail) {
  const cleanEmail = (email || '').trim().toLowerCase()
  const docId = sanitizeDocId(cleanEmail)

  const update = {
    status: newStatus,
    validatedBy: validatedByEmail,
    updatedAt: new Date().toISOString()
  }

  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'users', docId), update, { merge: true })
    } catch (err) {
      console.warn('Error al actualizar estado:', err)
    }
  }

  const all = readLS(LS_USERS)
  const idx = all.findIndex(u => u.email.toLowerCase() === cleanEmail)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...update }
    writeLS(LS_USERS, all)
  }
  return update
}

export async function batchSyncStudents(studentsList, validatedByEmail) {
  const updated = []
  for (let s of studentsList) {
    const res = await registerOrUpdateUser({
      ...s,
      role: 'student',
      status: s.status || 'pending',
      validatedBy: validatedByEmail || 'import_system'
    })
    updated.push(res)
  }
  return updated
}

// ---------- EXÁMENES Y RESULTADOS ESCRITOS ----------

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

export function classify(attempts) {
  const order = ['basico', 'intermedio', 'avanzado']
  let assigned = null
  for (const lvl of order) {
    const a = attempts.find(x => x.level === lvl)
    if (a && a.passed) assigned = lvl
    else break
  }
  return assigned ?? 'sin_nivel'
}

// ---------- EVALUACIONES ORALES (INTERVIEW) ----------

export async function saveOralEvaluation(evalData) {
  const evalId = evalData.id || `eval_${evalData.studentCarnet || sanitizeDocId(evalData.studentEmail)}_${Date.now()}`
  const payload = {
    ...evalData,
    id: evalId,
    createdAt: new Date().toISOString()
  }

  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'oralEvaluations', evalId), payload)
    } catch (err) {
      console.warn('Error al guardar evaluación oral en Firestore:', err)
    }
  }

  const all = readLS(LS_ORAL_EVALS)
  const idx = all.findIndex(e => e.id === evalId)
  if (idx >= 0) all[idx] = payload
  else all.push(payload)
  writeLS(LS_ORAL_EVALS, all)

  if (evalData.studentEmail) {
    await registerOrUpdateUser({
      email: evalData.studentEmail,
      assignedLevel: evalData.finalLevel,
      evaluationCompleted: true,
      lastEvaluatedAt: payload.createdAt,
      evaluatedByTeacher: evalData.teacherEmail
    })
  }

  return payload
}

export async function getOralEvaluations() {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'oralEvaluations'))
      if (!snap.empty) {
        return snap.docs.map(d => d.data())
      }
    } catch (err) {
      console.warn('Error leyendo oralEvaluations de Firestore:', err)
    }
  }
  return readLS(LS_ORAL_EVALS)
}
