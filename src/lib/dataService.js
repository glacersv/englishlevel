// ============================================================
// CAPA DE DATOS (Firestore con fallback local para desarrollo)
// Colecciones:
//   users/{cleanEmail}           -> { email, name, role, status, validatedBy, updatedAt, grade, section, carnet, selfReportedLevel }
//   academicStructure/config     -> { grades: [...], sections: [...], levels: [...] }
//   oralEvaluations/{evalId}     -> { studentCarnet, studentName, grade, section, teacherEmail, finalLevel, totalDurationSeconds, levelsEvaluated: {...}, createdAt }
//   exams/{examId}               -> { level, title, grade, questions: [...], active }
// ============================================================
import { db, isFirebaseConfigured } from './firebase'
import { collection, getDocs, setDoc, getDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore'
import defaultSchoolStudents from '../data/studentsFromSchool.json'
import { OFFICIAL_DIAGNOSTIC_EXAMS } from '../data/officialExamsData'

const LS_USERS = 'el_users'
const LS_ORAL_EVALS = 'el_oral_evals'
const LS_EXAMS = 'el_exams'
const LS_RESULTS = 'el_results'
const LS_ACADEMIC = 'el_academic_structure'
const LS_EXAM_DISPATCH = 'el_exam_dispatch'

const readLS = k => {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]')
  } catch {
    return []
  }
}
const writeLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch (err) {
    console.warn(`Error al guardar en localStorage key "${k}":`, err)
  }
}

export const sanitizeDocId = email => (email || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_')

// ---------- CONFIGURACIÓN DINÁMICA DE GRADOS, SECCIONES Y NIVELES ----------

const DEFAULT_DIAGNOSTIC_CONFIG = {
  // Ponderaciones globales sugeridas (100% total)
  weights: {
    oral: 40,        // Entrevista oral con docente
    platform: 60     // Pruebas en plataforma (listening, reading, scramble, cloze...)
  },
  // Umbrales de corte porcentual sugeridos para clasificación
  cutoffs: {
    basicMax: 45,       // 0% a 45%: Básico
    intermediateMax: 74 // 46% a 74%: Intermedio, 75%+: Avanzado
  },
  // Matriz de grupos de destino según el grado al que pasa el alumno (2026)
  gradeDestinations: {
    '7': {
      label: '7° Grado (vienen de 6°)',
      basic: { code: 'L1-A', label: 'Básico (Libro 1 Inicial)' },
      intermediate: { code: 'L1-B', label: 'Intermedio (Libro 1 Regular)' },
      advanced: { code: 'L2', label: 'Avanzado (Libro 2 Adelantado)' }
    },
    '8': {
      label: '8° Grado (vienen de 7°)',
      basic: { code: 'L2-A', label: 'Básico (Libro 2 Inicial)' },
      intermediate: { code: 'L2-B', label: 'Intermedio (Libro 2 Regular)' },
      advanced: { code: 'L3', label: 'Avanzado (Libro 3 Adelantado)' }
    },
    '9': {
      label: '9° Grado (vienen de 8°)',
      basic: { code: 'L2-A', label: 'Básico (Libro 2 Nivelación)' },
      intermediate: { code: 'L2-B', label: 'Intermedio (Libro 2 Regular)' },
      advanced: { code: 'L3', label: 'Avanzado (Libro 3 Adelantado)' }
    },
    '10': {
      label: '1° Bachillerato (vienen de 9°)',
      basic: { code: 'L3-A', label: 'Básico (Libro 3 Básico)' },
      intermediate: { code: 'L3-B', label: 'Intermedio (Libro 3 Regular)' },
      advanced: { code: 'L4-A', label: 'Avanzado (Libro 4 Avanzado)' }
    },
    '11': {
      label: '2° Bachillerato (vienen de 10°)',
      basic: { code: 'L4-A', label: 'Básico/Intermedio (Libro 4 Consolidado)' },
      intermediate: { code: 'L4-A', label: 'Intermedio (Libro 4 Consolidado)' },
      advanced: { code: 'L5-A', label: 'Avanzado (Libro 5 / Nivel C1)' }
    },
    '12': {
      label: '3° Bachillerato Técnico (vienen de 11° Técnico)',
      basic: { code: 'L4-A', label: 'Básico/Refuerzo (Libro 4)' },
      intermediate: { code: 'L5-A', label: 'Intermedio (Libro 5)' },
      advanced: { code: 'L5-B', label: 'Avanzado Especialidad Técnica (Libro 5 / C1+)' }
    }
  }
}

const DEFAULT_ACADEMIC = {
  grades: [
    { id: '6', label: '6°' },
    { id: '7', label: '7°' },
    { id: '8', label: '8°' },
    { id: '9', label: '9°' },
    { id: '10', label: '10°' },
    { id: '11', label: '11°' },
    { id: '12', label: '12°' }
  ],
  sections: ['A', 'B', 'C', 'D'],
  modalities: ['General', 'Técnico'],
  levels: [
    { id: 'A1', name: 'A1 - Principiante / Acceso', color: '#10b981' },
    { id: 'A2', name: 'A2 - Básico / Plataforma', color: '#06b6d4' },
    { id: 'B1', name: 'B1 - Pre-Intermedio / Umbral', color: '#3b82f6' },
    { id: 'B2', name: 'B2 - Intermedio Alto / Avanzado', color: '#8b5cf6' },
    { id: 'C1', name: 'C1 - Dominio Operativo Eficaz', color: '#ec4899' }
  ],
  diagnosticConfig: DEFAULT_DIAGNOSTIC_CONFIG
}

const LS_DIAG_CONFIG = 'el_diagnostic_config'

export async function getDiagnosticConfig() {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'academicStructure', 'diagnosticConfig'))
      if (snap.exists()) {
        return { ...DEFAULT_DIAGNOSTIC_CONFIG, ...snap.data() }
      }
    } catch (e) {
      console.warn('Error leyendo diagnosticConfig de Firestore:', e)
    }
  }
  const local = JSON.parse(localStorage.getItem(LS_DIAG_CONFIG) || 'null')
  if (local) return { ...DEFAULT_DIAGNOSTIC_CONFIG, ...local }
  saveDiagnosticConfig(DEFAULT_DIAGNOSTIC_CONFIG)
  return DEFAULT_DIAGNOSTIC_CONFIG
}

export async function saveDiagnosticConfig(config) {
  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'academicStructure', 'diagnosticConfig'), config, { merge: true })
    } catch (e) {
      console.warn('Error guardando diagnosticConfig en Firestore:', e)
    }
  }
  localStorage.setItem(LS_DIAG_CONFIG, JSON.stringify(config))
  return config
}

/**
 * Calcula la sugerencia de grupo y nivel para un alumno según su grado destino y puntajes.
 * @param {string|number} targetGrade - Grado al que pasa el alumno (ej: '7', '8', '9', '10', '11')
 * @param {number} oralScorePercent - % obtenido en entrevista oral (0 - 100)
 * @param {number} platformScorePercent - % obtenido en pruebas de plataforma (0 - 100)
 * @param {object} customConfig - Configuración opcional de pesos y cortes
 */
export function calculatePlacementSuggestion(targetGrade, oralScorePercent = 0, platformScorePercent = 0, customConfig = null) {
  const cfg = customConfig || DEFAULT_DIAGNOSTIC_CONFIG
  const wOral = (cfg.weights?.oral ?? 40) / 100
  const wPlat = (cfg.weights?.platform ?? 60) / 100

  const totalScore = Math.round((oralScorePercent * wOral) + (platformScorePercent * wPlat))
  const cleanGrade = String(targetGrade || '').replace(/\D/g, '')

  const cutoffs = cfg.cutoffs || { basicMax: 45, intermediateMax: 74 }
  let category = 'intermediate'
  if (totalScore <= cutoffs.basicMax) category = 'basic'
  else if (totalScore <= cutoffs.intermediateMax) category = 'intermediate'
  else category = 'advanced'

  const destInfo = cfg.gradeDestinations?.[cleanGrade] || cfg.gradeDestinations?.['7']
  const assigned = destInfo ? destInfo[category] : { code: 'Sin Nivel', label: 'Sin Definir' }

  return {
    totalScore,
    category, // 'basic' | 'intermediate' | 'advanced'
    categoryLabel: category === 'basic' ? 'Básico' : category === 'intermediate' ? 'Intermedio' : 'Avanzado',
    suggestedGroup: assigned.code,
    suggestedLabel: assigned.label,
    targetGrade: cleanGrade
  }
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
  if (!cleanEmail) return userData
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
  const idx = all.findIndex(u => (u.email || '').toLowerCase() === cleanEmail)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...record }
  } else {
    all.push(record)
  }
  writeLS(LS_USERS, all)

  // Sincronizar automáticamente la sesión activa si corresponde al mismo usuario
  try {
    const curSession = JSON.parse(localStorage.getItem('el_session_user') || 'null')
    if (curSession && (curSession.email || '').toLowerCase() === cleanEmail) {
      localStorage.setItem('el_session_user', JSON.stringify({ ...curSession, ...record }))
    }
  } catch (e) {
    console.warn('Error sincronizando sesión en LocalStorage:', e)
  }

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

  // En Firestore, marcamos el registro con status: 'deleted' y eliminamos cualquier dato
  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'users', docId), {
        email: cleanEmail,
        status: 'deleted',
        deletedAt: new Date().toISOString()
      }, { merge: true })
    } catch (err) {
      console.warn('Error al marcar eliminado en Firestore:', err)
    }
  }

  // Guardar en lista local de excluidos/eliminados
  const deletedEmails = JSON.parse(localStorage.getItem('el_deleted_users') || '[]')
  if (!deletedEmails.includes(cleanEmail)) {
    deletedEmails.push(cleanEmail)
    localStorage.setItem('el_deleted_users', JSON.stringify(deletedEmails))
  }

  const all = readLS(LS_USERS)
  const filtered = all.filter(u => u.email.toLowerCase() !== cleanEmail)
  writeLS(LS_USERS, filtered)
  return true
}

export async function deleteUsersBatch(emails = []) {
  if (!Array.isArray(emails) || emails.length === 0) return true
  const cleanEmails = emails.map(e => (e || '').trim().toLowerCase()).filter(Boolean)

  if (isFirebaseConfigured()) {
    try {
      const promises = cleanEmails.map(cleanEmail => {
        const docId = sanitizeDocId(cleanEmail)
        return setDoc(doc(db, 'users', docId), {
          email: cleanEmail,
          status: 'deleted',
          deletedAt: new Date().toISOString()
        }, { merge: true })
      })
      await Promise.all(promises)
    } catch (err) {
      console.warn('Error al marcar lote de eliminados en Firestore:', err)
    }
  }

  // Guardar en lista local de excluidos/eliminados
  const deletedEmails = JSON.parse(localStorage.getItem('el_deleted_users') || '[]')
  for (const c of cleanEmails) {
    if (!deletedEmails.includes(c)) deletedEmails.push(c)
  }
  localStorage.setItem('el_deleted_users', JSON.stringify(deletedEmails))

  const all = readLS(LS_USERS)
  const filtered = all.filter(u => !cleanEmails.includes(u.email.toLowerCase()))
  writeLS(LS_USERS, filtered)
  return true
}

export async function getAllUsers() {
  const localMap = new Map()
  const deletedSet = new Set(JSON.parse(localStorage.getItem('el_deleted_users') || '[]'))

  // 1. Cargar alumnos base del colegio (omitiendo eliminados)
  for (let s of defaultSchoolStudents) {
    if (s.email && !deletedSet.has(s.email.toLowerCase())) {
      localMap.set(s.email.toLowerCase(), { ...s })
    }
  }

  // 2. Sobrescribir con lo guardado en LocalStorage
  const savedLS = readLS(LS_USERS)
  if (Array.isArray(savedLS)) {
    for (let u of savedLS) {
      if (u.email && !deletedSet.has(u.email.toLowerCase()) && u.status !== 'deleted') {
        const key = u.email.toLowerCase()
        localMap.set(key, { ...(localMap.get(key) || {}), ...u })
      }
    }
  }

  // 3. Sobrescribir con lo guardado en Firestore si está disponible
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'users'))
      if (!snap.empty) {
        for (let d of snap.docs) {
          const u = d.data()
          if (u.email) {
            const key = u.email.toLowerCase()
            if (u.status === 'deleted') {
              localMap.delete(key)
              deletedSet.add(key)
            } else {
              localMap.set(key, { ...(localMap.get(key) || {}), ...u })
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error obteniendo usuarios de Firestore:', err)
    }
  }

  // Carnets oficiales de los alumnos de 11° Técnico (que este año se evalúan para ser 12° el próximo año)
  const tecTargetCarnets = [
    '20160122', '20253108', '20220702', '20253105',
    '20240901', '20253103', '20253106', '20253101'
  ]

  // 4. Normalizar campos: separar grado, seccion limpia (A, B, C, D) y especialidad (General / Técnico para bachillerato)
  const normalizedList = Array.from(localMap.values()).map(u => {
    let section = u.section || 'A'
    let especialidad = u.especialidad || null
    let canEvaluate = true

    // Extraer número de grado (6 a 12)
    let numGrado = '7'
    if (u.codigoGrado) {
      numGrado = String(parseInt(u.codigoGrado, 10))
    } else if (u.grade) {
      const match = String(u.grade).match(/\d+/)
      if (match) numGrado = match[0]
    }

    if (tecTargetCarnets.includes(u.carnet)) {
      numGrado = '11'
      section = 'A'
      especialidad = 'Técnico'
      canEvaluate = true
    } else {
      const isBachi = ['10', '11', '12', '32'].includes(numGrado) || (u.grade || '').toLowerCase().includes('bachillerato')

      if (section === 'Téc') {
        section = 'A'
        if (isBachi) especialidad = 'Técnico'
      } else if (isBachi && !especialidad) {
        especialidad = 'General'
      }

      // Si es 11° General, ya no se evalúan este año
      if (numGrado === '11' && especialidad === 'General') {
        canEvaluate = false
      }
    }

    const isBachiFinal = ['10', '11', '12', '32'].includes(numGrado) || (u.grade || '').toLowerCase().includes('bachillerato')
    const canonicalGrade = `${numGrado}°`

    return {
      ...u,
      grade: canonicalGrade,
      codigoGrado: numGrado,
      section,
      especialidad: isBachiFinal ? (especialidad || 'General') : null,
      canEvaluate
    }
  })

  return normalizedList
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
  const idx = all.findIndex(u => u.email?.toLowerCase() === cleanEmail)
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...update }
  } else {
    // Buscar en la lista base del colegio para armar el registro completo
    const base = defaultSchoolStudents.find(s => s.email?.toLowerCase() === cleanEmail) || {}
    all.push({ ...base, email: cleanEmail, ...update })
  }
  writeLS(LS_USERS, all)
  return update
}

export async function updateUsersStatusBatch(emails = [], newStatus, validatedByEmail) {
  if (!Array.isArray(emails) || emails.length === 0) return true
  const cleanEmails = emails.map(e => (e || '').trim().toLowerCase()).filter(Boolean)
  const updatedAt = new Date().toISOString()
  const update = {
    status: newStatus,
    validatedBy: validatedByEmail,
    updatedAt
  }

  if (isFirebaseConfigured()) {
    try {
      const promises = cleanEmails.map(cleanEmail => {
        const docId = sanitizeDocId(cleanEmail)
        return setDoc(doc(db, 'users', docId), update, { merge: true })
      })
      await Promise.all(promises)
    } catch (err) {
      console.warn('Error al actualizar estados en lote en Firestore:', err)
    }
  }

  const all = readLS(LS_USERS)
  for (const cleanEmail of cleanEmails) {
    const idx = all.findIndex(u => u.email?.toLowerCase() === cleanEmail)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...update }
    } else {
      const base = defaultSchoolStudents.find(s => s.email?.toLowerCase() === cleanEmail) || {}
      all.push({ ...base, email: cleanEmail, ...update })
    }
  }
  writeLS(LS_USERS, all)
  return true
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
  const prepared = {
    ...exam,
    weight: typeof exam.weight === 'number' ? exam.weight : (parseInt(exam.weight, 10) || 20),
    timeLimitMinutes: typeof exam.timeLimitMinutes === 'number' ? exam.timeLimitMinutes : (parseInt(exam.timeLimitMinutes, 10) || 15),
    toolType: exam.toolType || exam.type || 'multipleChoice',
    active: exam.active !== false,
    updatedAt: new Date().toISOString()
  }

  if (isFirebaseConfigured()) {
    await setDoc(doc(db, 'exams', exam.id), prepared, { merge: true })
  } else {
    const all = readLS(LS_EXAMS)
    const i = all.findIndex(e => e.id === exam.id)
    i >= 0 ? (all[i] = prepared) : all.push(prepared)
    writeLS(LS_EXAMS, all)
  }
  return prepared
}

export async function getExams(levelId, grade) {
  let all = []
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'exams'))
      all = snap.docs.map(d => d.data())
    } catch (e) {
      console.warn('Error leyendo exams de Firestore:', e)
      all = readLS(LS_EXAMS)
    }
  } else {
    all = readLS(LS_EXAMS)
  }

  // Si la colección está vacía, auto-precargar la batería estandarizada oficial inmediatamente
  if (!all || all.length === 0) {
    all = OFFICIAL_DIAGNOSTIC_EXAMS
    writeLS(LS_EXAMS, OFFICIAL_DIAGNOSTIC_EXAMS)
    if (isFirebaseConfigured()) {
      // Auto-sembrado asíncrono para que persista para todos los usuarios
      Promise.all(
        OFFICIAL_DIAGNOSTIC_EXAMS.map(ex => setDoc(doc(db, 'exams', ex.id), ex, { merge: true }))
      ).catch(err => console.warn('Auto-seed Firestore exams notice:', err))
    }
  }

  return all.filter(e => {
    if (e.active === false) return false
    if (levelId && e.level !== levelId) return false
    if (grade && e.grade && e.grade !== grade && e.grade !== 'all') return false
    return true
  })
}

export async function getAllExamsForTeacher(teacherEmail) {
  let all = []
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'exams'))
      all = snap.docs.map(d => d.data())
    } catch {
      all = readLS(LS_EXAMS)
    }
  } else {
    all = readLS(LS_EXAMS)
  }

  if (!all || all.length === 0) {
    all = OFFICIAL_DIAGNOSTIC_EXAMS
  }

  if (!teacherEmail) return all
  return all.filter(e => !e.createdBy || e.createdBy.toLowerCase() === teacherEmail.toLowerCase())
}

// ---------- HABILITACIÓN POR GRADO/SECCIÓN, PAUSA GLOBAL Y CRONÓMETRO DOCENTE ----------

export const DEFAULT_EXAM_DISPATCH = {
  enabledGrades: ['all'],        // Compatibilidad previa
  enabledSections: ['all'],     // Compatibilidad previa
  isPaused: false,              // Pausa global de compatibilidad
  pausedAt: null,
  pauseReason: 'receso',
  pausedDurationSeconds: 0,
  resumedAt: null,
  globalTimeLimitMinutes: 90,
  updatedBy: null,
  updatedAt: new Date().toISOString(),

  // Control Maestro por Grado (6°, 7°, 8°, 9°, 10°/1° Bach, 11°/2° Bach, 12°/3° Bach)
  // Por defecto todos los grados inician en 'paused' (bloqueados)
  gradesControl: {
    '6': { platformStatus: 'paused', interviewStatus: 'paused', updatedAt: new Date().toISOString() },
    '7': { platformStatus: 'paused', interviewStatus: 'paused', updatedAt: new Date().toISOString() },
    '8': { platformStatus: 'paused', interviewStatus: 'paused', updatedAt: new Date().toISOString() },
    '9': { platformStatus: 'paused', interviewStatus: 'paused', updatedAt: new Date().toISOString() },
    '10': { platformStatus: 'paused', interviewStatus: 'paused', updatedAt: new Date().toISOString() },
    '11': { platformStatus: 'paused', interviewStatus: 'paused', updatedAt: new Date().toISOString() },
    '12': { platformStatus: 'paused', interviewStatus: 'paused', updatedAt: new Date().toISOString() }
  },

  // Overrides / Excepciones individuales por alumno (indexado por email sanitizado o email directo)
  studentOverrides: {}
}

export async function getExamDispatchConfig() {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'systemSettings', 'examDispatch'))
      if (snap.exists()) {
        const data = snap.data()
        const merged = {
          ...DEFAULT_EXAM_DISPATCH,
          ...data,
          gradesControl: {
            ...DEFAULT_EXAM_DISPATCH.gradesControl,
            ...(data.gradesControl || {})
          },
          studentOverrides: {
            ...(data.studentOverrides || {})
          }
        }
        writeLS(LS_EXAM_DISPATCH, merged)
        return merged
      }
    } catch (e) {
      console.warn('Error leyendo examDispatch de Firestore:', e)
    }
  }
  const local = localStorage.getItem(LS_EXAM_DISPATCH)
  if (local) {
    try {
      const parsed = JSON.parse(local)
      return {
        ...DEFAULT_EXAM_DISPATCH,
        ...parsed,
        gradesControl: {
          ...DEFAULT_EXAM_DISPATCH.gradesControl,
          ...(parsed.gradesControl || {})
        },
        studentOverrides: {
          ...(parsed.studentOverrides || {})
        }
      }
    } catch {
      // fallback
    }
  }
  return DEFAULT_EXAM_DISPATCH
}

export async function saveExamDispatchConfig(config) {
  const current = await getExamDispatchConfig().catch(() => DEFAULT_EXAM_DISPATCH)
  const merged = {
    ...current,
    ...config,
    gradesControl: {
      ...current.gradesControl,
      ...(config.gradesControl || {})
    },
    studentOverrides: {
      ...current.studentOverrides,
      ...(config.studentOverrides || {})
    },
    updatedAt: new Date().toISOString()
  }

  writeLS(LS_EXAM_DISPATCH, merged)

  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'systemSettings', 'examDispatch'), merged, { merge: true })
    } catch (e) {
      console.warn('Error guardando examDispatch en Firestore:', e)
    }
  }

  // Notificar en la misma ventana / pestañas
  try {
    window.dispatchEvent(new CustomEvent('el_exam_dispatch_changed', { detail: merged }))
  } catch {}

  return merged
}

/**
 * Cambia el estado de un grado ('platform' o 'interview') a 'active', 'paused' o 'finished'
 */
export async function setGradeExamStatus(grade, examType, status, updatedBy = 'Docente') {
  const gKey = String(grade)
  const current = await getExamDispatchConfig()
  const gradeData = current.gradesControl?.[gKey] || { platformStatus: 'paused', interviewStatus: 'paused' }

  const updatedGrade = {
    ...gradeData,
    [examType === 'platform' ? 'platformStatus' : 'interviewStatus']: status,
    updatedAt: new Date().toISOString(),
    ...(status === 'paused' ? { pausedAt: new Date().toISOString() } : {})
  }

  const newGradesControl = {
    ...(current.gradesControl || {}),
    [gKey]: updatedGrade
  }

  return await saveExamDispatchConfig({
    gradesControl: newGradesControl,
    updatedBy
  })
}

/**
 * Establece una excepción individual para un alumno (Play/Pausa individual o acceso a entrevista)
 */
export async function setStudentExamStatus(studentEmail, examType, status, updatedBy = 'Docente') {
  if (!studentEmail) return
  const cleanEmail = sanitizeDocId(studentEmail)
  const current = await getExamDispatchConfig()
  const prevOverride = current.studentOverrides?.[cleanEmail] || current.studentOverrides?.[studentEmail.toLowerCase()] || {}

  const newOverride = {
    ...prevOverride,
    updatedAt: new Date().toISOString(),
    updatedBy
  }

  if (examType === 'platform') {
    newOverride.platformStatus = status // 'active' | 'paused' | 'finished'
    newOverride.platformAllowed = (status === 'active')
  } else if (examType === 'interview') {
    newOverride.interviewStatus = status
    newOverride.interviewAllowed = (status === 'active')
  }

  const newOverrides = {
    ...(current.studentOverrides || {}),
    [cleanEmail]: newOverride,
    [studentEmail.toLowerCase()]: newOverride
  }

  return await saveExamDispatchConfig({
    studentOverrides: newOverrides,
    updatedBy
  })
}

/**
 * Limpia las excepciones individuales de los alumnos de un grado
 */
export async function resetGradeExamOverrides(grade, studentEmailsInGrade = [], updatedBy = 'Docente') {
  const current = await getExamDispatchConfig()
  const newOverrides = { ...(current.studentOverrides || {}) }

  studentEmailsInGrade.forEach(em => {
    if (!em) return
    delete newOverrides[sanitizeDocId(em)]
    delete newOverrides[em.toLowerCase()]
  })

  return await saveExamDispatchConfig({
    studentOverrides: newOverrides,
    updatedBy
  })
}

export function subscribeExamDispatch(callback) {
  let unsubFirestore = null

  if (isFirebaseConfigured()) {
    try {
      unsubFirestore = onSnapshot(doc(db, 'systemSettings', 'examDispatch'), (snap) => {
        if (snap.exists()) {
          const data = { ...DEFAULT_EXAM_DISPATCH, ...snap.data() }
          writeLS(LS_EXAM_DISPATCH, data)
          callback(data)
        }
      }, (err) => {
        console.warn('Error en suscripción tiempo real a examDispatch:', err)
      })
    } catch (e) {
      console.warn('Error al conectar onSnapshot examDispatch:', e)
    }
  }

  // Listener para eventos locales y almacenamiento cruzado entre pestañas
  const handleLocalEvent = (e) => {
    if (e.detail) callback(e.detail)
  }
  const handleStorageEvent = (e) => {
    if (e.key === LS_EXAM_DISPATCH && e.newValue) {
      try {
        callback({ ...DEFAULT_EXAM_DISPATCH, ...JSON.parse(e.newValue) })
      } catch {}
    }
  }

  window.addEventListener('el_exam_dispatch_changed', handleLocalEvent)
  window.addEventListener('storage', handleStorageEvent)

  // Disparar valor actual inicial
  getExamDispatchConfig().then(cfg => callback(cfg)).catch(() => {})

  return () => {
    if (unsubFirestore) unsubFirestore()
    window.removeEventListener('el_exam_dispatch_changed', handleLocalEvent)
    window.removeEventListener('storage', handleStorageEvent)
  }
}

// Función rápida para actualizar tiempo y porcentaje de un examen sin pasar por el asistente
export async function updateExamSettings(examId, { timeLimitMinutes, weight, active }) {
  const all = await getExams()
  const target = all.find(e => e.id === examId)
  if (!target) throw new Error('Examen no encontrado: ' + examId)

  const updated = {
    ...target,
    ...(timeLimitMinutes !== undefined ? { timeLimitMinutes: parseInt(timeLimitMinutes, 10) || 0 } : {}),
    ...(weight !== undefined ? { weight: parseInt(weight, 10) || 0 } : {}),
    ...(active !== undefined ? { active: Boolean(active) } : {}),
    updatedAt: new Date().toISOString()
  }

  return await saveExam(updated)
}

export async function saveResult(result) {
  const payload = {
    ...result,
    id: result.id || `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    completedAt: result.completedAt || new Date().toISOString()
  }

  if (isFirebaseConfigured()) {
    await setDoc(doc(db, 'results', payload.id), payload, { merge: true })
  } else {
    const all = readLS(LS_RESULTS)
    const i = all.findIndex(r => r.id === payload.id)
    i >= 0 ? (all[i] = payload) : all.push(payload)
    writeLS(LS_RESULTS, all)
  }
  return payload
}

export async function getStudentResults(studentEmail) {
  const cleanEmail = (studentEmail || '').trim().toLowerCase()
  if (!cleanEmail) return []

  let all
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'results'))
      all = snap.docs.map(d => d.data())
    } catch {
      all = readLS(LS_RESULTS)
    }
  } else {
    all = readLS(LS_RESULTS)
  }
  return all.filter(r => (r.studentEmail || '').toLowerCase() === cleanEmail)
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
    const oralPercent = typeof evalData.oralScorePercent === 'number'
      ? evalData.oralScorePercent
      : (typeof evalData.scorePercent === 'number' ? evalData.scorePercent : null)

    await registerOrUpdateUser({
      email: evalData.studentEmail,
      assignedLevel: evalData.finalLevel,
      oralScorePercent: oralPercent,
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

// ---------- BANCO DE PREGUNTAS DE ENTREVISTA ORAL (A1 - C1) ----------
const LS_INTERVIEW_QUESTIONS = 'el_interview_questions'

export async function getInterviewQuestions() {
  let questions = null
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'academicStructure', 'interviewQuestions'))
      if (snap.exists() && Array.isArray(snap.data().list) && snap.data().list.length > 0) {
        questions = snap.data().list
      }
    } catch (e) {
      console.warn('Error leyendo interviewQuestions de Firestore:', e)
    }
  }

  if (!questions) {
    const local = localStorage.getItem(LS_INTERVIEW_QUESTIONS)
    if (local) {
      try {
        questions = JSON.parse(local)
      } catch (err) {
        console.warn('Error parseando preguntas locales:', err)
      }
    }
  }

  // Si aún no existen, cargar desde archivo base
  if (!questions || questions.length === 0) {
    try {
      const raw = await import('../data/interviewQuestions.json')
      questions = (raw.default || raw).map((q, idx) => ({
        ...q,
        id: q.id || `q_${q.level || 'A1'}_${idx + 1}`
      }))
      // Guardar localmente
      localStorage.setItem(LS_INTERVIEW_QUESTIONS, JSON.stringify(questions))
    } catch (err) {
      console.error('Error importando preguntas base:', err)
      questions = []
    }
  }

  return questions
}

export async function saveInterviewQuestions(questionsList) {
  if (!Array.isArray(questionsList)) return questionsList

  // Guardar en Firestore para que todos los docentes compartan el banco
  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'academicStructure', 'interviewQuestions'), {
        list: questionsList,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    } catch (e) {
      console.warn('Error guardando interviewQuestions en Firestore:', e)
    }
  }

  localStorage.setItem(LS_INTERVIEW_QUESTIONS, JSON.stringify(questionsList))
  return questionsList
}

export async function resetInterviewQuestionsToDefault() {
  try {
    const raw = await import('../data/interviewQuestions.json')
    const defaults = (raw.default || raw).map((q, idx) => ({
      ...q,
      id: q.id || `q_${q.level || 'A1'}_${idx + 1}`
    }))
    await saveInterviewQuestions(defaults)
    return defaults
  } catch (err) {
    console.error('Error reseteando preguntas:', err)
    return []
  }
}

// Resetear evaluación de un estudiante individual
export async function resetStudentEvaluation(studentEmail) {
  const cleanEmail = (studentEmail || '').trim().toLowerCase()
  if (!cleanEmail) return

  // 1. Quitar assignedLevel en Firestore y en local
  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'users', sanitizeDocId(cleanEmail)), {
        assignedLevel: null,
        evaluationCompleted: false,
        lastEvaluatedAt: null,
        evaluatedByTeacher: null
      }, { merge: true })

      // Eliminar sus registros en oralEvaluations
      const snap = await getDocs(collection(db, 'oralEvaluations'))
      for (let d of snap.docs) {
        const data = d.data()
        if (data.studentEmail?.toLowerCase() === cleanEmail) {
          await deleteDoc(d.ref)
        }
      }
    } catch (err) {
      console.warn('Error al resetear evaluación en Firestore:', err)
    }
  }

  // 2. Limpiar en LocalStorage
  const users = readLS(LS_USERS)
  const userIdx = users.findIndex(u => u.email?.toLowerCase() === cleanEmail)
  if (userIdx >= 0) {
    users[userIdx].assignedLevel = null
    users[userIdx].evaluationCompleted = false
    delete users[userIdx].lastEvaluatedAt
    delete users[userIdx].evaluatedByTeacher
    writeLS(LS_USERS, users)
  }

  const evals = readLS(LS_ORAL_EVALS).filter(e => e.studentEmail?.toLowerCase() !== cleanEmail)
  writeLS(LS_ORAL_EVALS, evals)
}

// Desbloquear / Re-habilitar un examen específico de un alumno (o toda la batería)
export async function unlockStudentExam(studentEmail, examId = null) {
  const cleanEmail = (studentEmail || '').trim().toLowerCase()
  if (!cleanEmail) return

  const docId = sanitizeDocId(cleanEmail)

  if (isFirebaseConfigured()) {
    try {
      const userRef = doc(db, 'users', docId)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const u = snap.data()
        const currentCompleted = { ...(u.completedExams || {}) }

        if (examId) {
          delete currentCompleted[examId]
        } else {
          // Si no se especifica examen, resetear todos
          for (let k of Object.keys(currentCompleted)) {
            delete currentCompleted[k]
          }
        }

        await setDoc(userRef, { completedExams: currentCompleted }, { merge: true })
      }
    } catch (err) {
      console.warn('Error al desbloquear examen en Firestore:', err)
    }
  }

  // Actualizar también en localStorage
  const users = readLS(LS_USERS)
  const userIdx = users.findIndex(u => u.email?.toLowerCase() === cleanEmail)
  if (userIdx >= 0) {
    const comp = { ...(users[userIdx].completedExams || {}) }
    if (examId) {
      delete comp[examId]
    } else {
      for (let k of Object.keys(comp)) delete comp[k]
    }
    users[userIdx].completedExams = comp
    writeLS(LS_USERS, users)
  }
}

// Eliminar un acta de evaluación oral individual
export async function deleteOralEvaluation(evalId, studentEmail) {
  if (isFirebaseConfigured() && evalId) {
    try {
      await deleteDoc(doc(db, 'oralEvaluations', evalId))
    } catch (err) {
      console.warn('Error eliminando evaluación oral en Firestore:', err)
    }
  }

  // Eliminar en localStorage
  const evals = readLS(LS_ORAL_EVALS).filter(e => e.id !== evalId && (!studentEmail || e.studentEmail?.toLowerCase() !== studentEmail.toLowerCase()))
  writeLS(LS_ORAL_EVALS, evals)

  // Si se pasa studentEmail, resetear además el nivel del alumno a "Sin Evaluar"
  if (studentEmail) {
    await resetStudentEvaluation(studentEmail)
  }
}

// Eliminar un examen de la batería
export async function deleteExam(examId) {
  if (!examId) return
  if (isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, 'exams', examId))
    } catch (err) {
      console.warn('Error eliminando examen en Firestore:', err)
    }
  }

  const all = readLS(LS_EXAMS).filter(e => e.id !== examId)
  writeLS(LS_EXAMS, all)
  return all
}

// Resetear TODAS las evaluaciones de alumnos (modo pruebas)
export async function resetAllEvaluations() {
  if (isFirebaseConfigured()) {
    try {
      const evalsSnap = await getDocs(collection(db, 'oralEvaluations'))
      for (let d of evalsSnap.docs) {
        await deleteDoc(d.ref)
      }

      const usersSnap = await getDocs(collection(db, 'users'))
      for (let d of usersSnap.docs) {
        const u = d.data()
        if (u.assignedLevel) {
          await setDoc(d.ref, {
            assignedLevel: null,
            evaluationCompleted: false,
            lastEvaluatedAt: null,
            evaluatedByTeacher: null
          }, { merge: true })
        }
      }
    } catch (err) {
      console.warn('Error al resetear todas las evaluaciones en Firestore:', err)
    }
  }

  // LocalStorage
  const users = readLS(LS_USERS).map(u => ({
    ...u,
    assignedLevel: null,
    evaluationCompleted: false,
    lastEvaluatedAt: null,
    evaluatedByTeacher: null
  }))
  writeLS(LS_USERS, users)
  writeLS(LS_ORAL_EVALS, [])
}

// ================= GESTIÓN DE PERMISOS Y MÓDULOS PARA COORDINACIÓN =================
const LS_MODULE_PERMISSIONS = 'el_module_permissions'
export const DEFAULT_COORDINATION_MODULES = {
  overview: { id: 'overview', label: 'Supervisión General', desc: 'Panel central con KPIs, estados de alumnos y conteo global.', enabled: true, icon: 'dashboard' },
  analytics: { id: 'analytics', label: 'Dashboard Analítico', desc: 'Métricas de nivelación por grado, sección y distribución MCER.', enabled: true, icon: 'analytics' },
  students_manager: { id: 'students_manager', label: 'Gestión de Alumnos', desc: 'Habilitación de accesos, edición de datos y filtros por grado.', enabled: true, icon: 'groups' },
  academic_structure: { id: 'academic_structure', label: 'Grados y Secciones', desc: 'Creación y mantenimiento del padrón de grados y secciones.', enabled: true, icon: 'category' },
  teachers: { id: 'teachers', label: 'Docentes y Coordinación', desc: 'Control de cuentas docentes, permisos y altas de personal.', enabled: true, icon: 'school' },
  thresholds: { id: 'thresholds', label: 'Ponderaciones y Cortes 2026', desc: 'Reglas de cálculo del examen diagnóstico y porcentajes.', enabled: true, icon: 'tune' },
  interview_console: { id: 'interview_console', label: 'Consola de Entrevista Oral', desc: 'Acceso para aplicar la entrevista oral directa a alumnos.', enabled: true, icon: 'record_voice_over' },
  question_bank: { id: 'question_bank', label: 'Banco de Preguntas MCER', desc: 'Revisión y edición del banco de preguntas orales A1-C1.', enabled: true, icon: 'quiz' },
  test_builder: { id: 'test_builder', label: 'Batería de Tests y Pruebas', desc: 'Configuración y prueba de exámenes estandarizados.', enabled: true, icon: 'auto_stories' },
  reports: { id: 'reports', label: 'Reportes y Cierre', desc: 'Generación y exportación de sábanas oficiales de notas.', enabled: true, icon: 'assessment' }
}

export async function getCoordinationModulesConfig() {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'systemSettings', 'coordinationModules'))
      if (snap.exists()) {
        return { ...DEFAULT_COORDINATION_MODULES, ...(snap.data().modules || {}) }
      }
    } catch (e) {
      console.warn('Error leyendo permisos de módulos en Firestore:', e)
    }
  }
  const local = JSON.parse(localStorage.getItem(LS_MODULE_PERMISSIONS) || 'null')
  if (local) return { ...DEFAULT_COORDINATION_MODULES, ...local }
  return DEFAULT_COORDINATION_MODULES
}

export async function saveCoordinationModulesConfig(modulesConfig) {
  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'systemSettings', 'coordinationModules'), {
        modules: modulesConfig,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    } catch (e) {
      console.warn('Error guardando permisos de módulos en Firestore:', e)
    }
  }
  localStorage.setItem(LS_MODULE_PERMISSIONS, JSON.stringify(modulesConfig))
  return modulesConfig
}

