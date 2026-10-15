import React, { useState, useEffect, useMemo } from 'react'
import Sidebar from '../shared/Sidebar'
import ExamBuilder from './ExamBuilder'
import OralInterviewExam from './OralInterviewExam'
import TeacherProfile from './TeacherProfile'
import DiagnosticConfigManager from '../shared/DiagnosticConfigManager'
import InterviewQuestionsBankManager from './InterviewQuestionsBankManager'
import GradeDispatchHub from './GradeDispatchHub'
import teacherAvatar from '../../assets/avatar_teacher.png'
import AnalyticsDashboard from '../shared/AnalyticsDashboard'
import FinalVerdictModal from './FinalVerdictModal'
import {
  getAllUsers,
  registerOrUpdateUser,
  updateUserStatus,
  updateUsersStatusBatch,
  getOralEvaluations,
  getAcademicStructure,
  getDiagnosticConfig,
  resetStudentEvaluation,
  resetAllEvaluations,
  deleteOralEvaluation,
  getUserProfile,
  subscribeExamDispatch,
  saveExamDispatchConfig,
  setGradeExamStatus,
  setGradeStudentLevelVisibility,
  setStudentExamStatus,
  resetGradeExamOverrides,
  unlockStudentExam,
  clearFraudIncidents,
  getCoordinationModulesConfig
} from '../../lib/dataService'

export default function TeacherWorkspace({ user, onLogout, onSwitchToStudentView, onSwitchToAdminView, onUpdateCurrentUser }) {
  const [currentSection, setCurrentSection] = useState('interview')
  const [collapsed, setCollapsed] = useState(false)
  const [currentTeacher, setCurrentTeacher] = useState(user)

  // Mantener sincronizado si user cambia
  useEffect(() => {
    if (user) {
      setCurrentTeacher(prev => ({ ...(prev || {}), ...user }))
      const email = (user.email || '').toLowerCase()
      if (email.includes('edgar') || email.includes('pacheco')) {
        setTeacherFilter('edgar')
      } else if (email.includes('ronald')) {
        setTeacherFilter('ronald')
      } else if (email.includes('silvia')) {
        setTeacherFilter('silvia')
      } else if (email.includes('nelsi')) {
        setTeacherFilter('nelsi')
      }
    }
  }, [user])

  // Segmentos / Toggles de Grados, Secciones, Especialidad de Bachillerato y Filtro por Docente Asignado
  const [activeInterviewGradeId, setActiveInterviewGradeId] = useState(null) // null = ver tarjetas de grados, '6','7','8',etc = ver nómina
  const [gradePill, setGradePill] = useState('all')
  const [sectionPill, setSectionPill] = useState('all')
  const [modalityPill, setModalityPill] = useState('all') // 'all' | 'General' | 'Técnico'
  const [levelPill, setLevelPill] = useState('all')

  // Estados para Navegador y Filtros de Fraudes y Pestaña (Combinación A + B)
  const [fraudGradeFilter, setFraudGradeFilter] = useState('all') // 'all' o '6','7','8','9','10','11'
  const [fraudSeverityFilter, setFraudSeverityFilter] = useState('all') // 'all' | 'critical' (>=3 o auto) | 'medium' (2) | 'low' (1)
  const [fraudSectionFilter, setFraudSectionFilter] = useState('all')
  const [fraudSearchTerm, setFraudSearchTerm] = useState('')
  const [fraudPage, setFraudPage] = useState(1)
  const fraudPageSize = 12
  const [expandedFraudStudentId, setExpandedFraudStudentId] = useState(null)
  const [expandedInterviewStudentId, setExpandedInterviewStudentId] = useState(null)
  // Por defecto, si el usuario logueado es uno de los docentes oficiales, se preselecciona ver sus alumnos asignados
  const [teacherFilter, setTeacherFilter] = useState(() => {
    const email = (user?.email || '').toLowerCase()
    if (email.includes('ronald')) return 'ronald'
    if (email.includes('silvia')) return 'silvia'
    if (email.includes('nelsi')) return 'nelsi'
    if (email.includes('edgar') || email.includes('pacheco')) return 'edgar'
    return 'all'
  })
  const [statusToggle, setStatusToggle] = useState('all') // 'all' | 'pending' | 'completed'
  const [searchTerm, setSearchTerm] = useState('')

  // Estructura dinámica de grados y secciones desde Firestore
  const [academic, setAcademic] = useState({ grades: [], sections: [], levels: [] })

  // Paginación para fluidez con 467 alumnos
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const [students, setStudents] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Alumno activo que está siendo evaluado en la consola oral
  const [activeInterviewStudent, setActiveInterviewStudent] = useState(null)

  // Estado para modal de detalle de rúbrica en Resultados
  const [selectedEvaluationDetail, setSelectedEvaluationDetail] = useState(null)

  // Estado para modal de detalle de incidencias de seguridad / fraude
  const [selectedStudentSecurityDetail, setSelectedStudentSecurityDetail] = useState(null)
  const [expandedExamAnswers, setExpandedExamAnswers] = useState({}) // { [examId]: boolean }

  // Estado de Habilitación por Grado/Sección y Pausa General de Evaluaciones
  const [dispatchConfig, setDispatchConfig] = useState({
    enabledGrades: ['all'],
    enabledSections: ['all'],
    isPaused: false,
    pausedAt: null,
    pauseReason: 'receso',
    globalTimeLimitMinutes: 90
  })
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [savingDispatch, setSavingDispatch] = useState(false)

  // Suscribirse a la configuración de habilitación y pausa en tiempo real
  useEffect(() => {
    const unsub = subscribeExamDispatch((cfg) => {
      if (cfg) setDispatchConfig(cfg)
    })
    return () => unsub()
  }, [])

  // Filtros del Dashboard de Resultados
  const [resultsSearch, setResultsSearch] = useState('')
  const [resultsLevelFilter, setResultsLevelFilter] = useState('all')
  const [resultsGradeFilter, setResultsGradeFilter] = useState('all')
  const [resultsTeacherFilter, setResultsTeacherFilter] = useState('all')
  const [resultsPage, setResultsPage] = useState(1)
  const resultsPageSize = 10

  // Estado para visualización e impresión de Acta Oficial
  const [actaToPrint, setActaToPrint] = useState(null) // null o { title, items, gradeFilter, teacherFilter, date }

  // Modal para componer y editar el mensaje de Microsoft Teams antes de enviar
  const [teamsModalData, setTeamsModalData] = useState(null) // null o { studentEmail, studentName, grade, groupLevel, cefrLevel, message }

  // Obtener el nivel institucional de destino (L1-A, L1-B, L2, L3, L4, etc.)
  // Obtener la información completa de ubicación según la Matriz Oficial Institucional y el % obtenido
  const getEvaluationPlacementData = (studentOrEval) => {
    if (!studentOrEval) {
      return { group: 'Sin Asignar', scorePercent: 0, category: 'intermediate', categoryLabel: 'Intermedio', cefr: 'A2' }
    }

    const email = (studentOrEval.email || studentOrEval.studentEmail || '').toLowerCase()
    const student = students.find(s => (s.email || '').toLowerCase() === email) || studentOrEval

    // 1. Si ya tiene asignado un grupo institucional explícito (ej: L1-A, L2-B, L3...)
    if (student.assignedGroup) {
      return {
        group: student.assignedGroup,
        scorePercent: student.totalDiagnosticScore ?? studentOrEval.totalScorePercent ?? 0,
        category: student.assignedGroup.includes('-A') ? 'basic' : student.assignedGroup.includes('-B') ? 'intermediate' : 'advanced',
        categoryLabel: student.assignedGroup.includes('-A') ? 'Básico' : student.assignedGroup.includes('-B') ? 'Intermedio' : 'Avanzado',
        cefr: student.assignedCefr || studentOrEval.finalLevel || 'A2'
      }
    }

    // 2. Determinar porcentajes de plataforma y oral
    const oralScore = typeof studentOrEval.oralScorePercent === 'number'
      ? studentOrEval.oralScorePercent
      : (typeof studentOrEval.scorePercent === 'number'
        ? studentOrEval.scorePercent
        : (studentOrEval.finalLevel === 'A1' ? 40 :
           studentOrEval.finalLevel === 'A2' ? 60 :
           studentOrEval.finalLevel === 'B1' ? 80 :
           studentOrEval.finalLevel === 'B2' ? 95 :
           studentOrEval.finalLevel === 'C1' ? 100 : (student.oralScorePercent || 0)))

    // Calcular porcentaje de plataforma
    const compExams = student.completedExams || {}
    const examEntries = Object.values(compExams)
    const platScore = examEntries.length > 0
      ? Math.round(examEntries.reduce((acc, ex) => acc + (ex.score || 0), 0) / examEntries.length)
      : (typeof student.platformScorePercent === 'number' ? student.platformScorePercent : oralScore)

    // Ponderación (por defecto 60% plataforma, 40% oral)
    const weights = diagnosticConfig?.weights || { platform: 60, oral: 40 }
    const wPlat = (weights.platform ?? 60) / 100
    const wOral = (weights.oral ?? 40) / 100
    const totalScorePercent = Math.min(100, Math.max(0, Math.round((platScore * wPlat) + (oralScore * wOral))))

    // 3. Determinar grado al que pasa el alumno
    const rawGrade = String(studentOrEval.grade || student.grade || student.codigoGrado || '7')
    const gradeNum = parseInt(rawGrade.replace(/\D/g, ''), 10) || 7
    let targetGradeKey = '7'
    if (gradeNum === 6) targetGradeKey = '7'
    else if (gradeNum === 7) targetGradeKey = '8'
    else if (gradeNum === 8) targetGradeKey = '9'
    else if (gradeNum === 9) targetGradeKey = '10'
    else if (gradeNum === 10) targetGradeKey = '11'
    else if (gradeNum === 11) targetGradeKey = student.especialidad === 'Técnico' ? '12' : '11'

    // 4. Cortes de la Matriz Oficial (Básico: 0-40%, Intermedio: 41-70%, Avanzado: ≥71%)
    const cutoffs = diagnosticConfig?.cutoffs || { basicMax: 40, intermediateMax: 70 }
    const bMax = cutoffs.basicMax ?? 40
    const iMax = cutoffs.intermediateMax ?? 70

    let category = 'intermediate'
    let categoryLabel = 'Intermedio'
    let suggestedCefr = 'A2'
    if (totalScorePercent <= bMax) {
      category = 'basic'
      categoryLabel = 'Básico'
      suggestedCefr = 'A1'
    } else if (totalScorePercent <= iMax) {
      category = 'intermediate'
      categoryLabel = 'Intermedio'
      suggestedCefr = 'A2'
    } else {
      category = 'advanced'
      categoryLabel = 'Avanzado'
      suggestedCefr = 'B1'
    }

    // 5. Matriz Fija Institucional Oficial de Libros y Grupos por Grado
    const fixedMatrix = {
      '7': { basic: 'L1-A', intermediate: 'L1-B', advanced: 'L2' },
      '8': { basic: 'L2-A', intermediate: 'L2-B', advanced: 'L3' },
      '9': { basic: 'L2-A', intermediate: 'L2-B', advanced: 'L3' },
      '10': { basic: 'L3-A', intermediate: 'L3-B', advanced: 'L4-A' },
      '11': { basic: 'L4-A', intermediate: 'L4-A', advanced: 'L5-A' },
      '12': { basic: 'L4-A', intermediate: 'L5-A', advanced: 'L5-B' }
    }

    const dynDest = diagnosticConfig?.gradeDestinations?.[targetGradeKey]
    const assignedGroup = dynDest?.[category]?.code || fixedMatrix[targetGradeKey]?.[category] || 'L1-B'

    return {
      group: assignedGroup,
      scorePercent: totalScorePercent,
      category,
      categoryLabel,
      cefr: student.assignedCefr || studentOrEval.finalLevel || suggestedCefr,
      targetGrade: targetGradeKey
    }
  }

  // Obtener el nivel institucional de destino (L1-A, L1-B, L2, L2-A, L2-B, L3, etc.)
  const getStudentInstitutionalLevel = (studentOrEval) => {
    return getEvaluationPlacementData(studentOrEval).group
  }

  // Abrir modal interactivo para previsualizar y editar el mensaje de Teams
  const handleOpenTeamsComposer = (studentOrEval) => {
    const email = studentOrEval.email || studentOrEval.studentEmail
    if (!email) {
      alert('El estudiante no tiene un correo institucional registrado.')
      return
    }

    const name = studentOrEval.name || studentOrEval.studentName || 'Student'
    const placement = getEvaluationPlacementData(studentOrEval)
    const teacherName = currentTeacher?.name || user?.name || 'English Department Teacher'

    // Determinar etiqueta en inglés de la categoría (Basic, Intermediate, Advanced)
    const categoryEn = placement.category === 'basic' ? 'Basic' :
                       placement.category === 'intermediate' ? 'Intermediate' : 'Advanced'
    const targetGradeLabel = `${placement.targetGrade}th Grade`

    const defaultMsg = `Hello ${name},\n\nGreetings from Prof. ${teacherName} from the Foreign Languages Department at Colegio Salesiano San José.\n\nI am sharing the official results of your English Diagnostic Assessment 2026:\n• Official Assigned Level: **${placement.group}** (${categoryEn})\n• Target Grade: ${targetGradeLabel}\n\nCongratulations on your effort, dedication, and commitment during this diagnostic process! Keep giving your best.`

    setTeamsModalData({
      studentEmail: email.trim(),
      studentName: name,
      grade: targetGradeLabel,
      groupLevel: placement.group,
      categoryLabel: categoryEn,
      scorePercent: placement.scorePercent,
      cefrLevel: placement.cefr,
      message: defaultMsg
    })
  }

  // Despachar hacia la URL de Teams
  const handleSendTeamsMessage = () => {
    if (!teamsModalData || !teamsModalData.studentEmail) return
    const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(teamsModalData.studentEmail)}&message=${encodeURIComponent(teamsModalData.message)}`
    window.open(teamsUrl, '_blank')
    setTeamsModalData(null)
  }

  // Exportar actas filtradas a Excel / CSV con Nivel de Matriz y % Global
  const handleExportCSV = (evaluationsList, filename = 'Acta_Resultados_Ingles_2026.csv') => {
    if (!evaluationsList || evaluationsList.length === 0) {
      alert('No hay evaluaciones para exportar con los filtros seleccionados.')
      return
    }

    const headers = [
      'Carnet',
      'Estudiante',
      'Correo Institucional',
      'Grado',
      'Seccion',
      'Nivel Matriz (Grupo)',
      'Categoria',
      'Puntaje Global (%)',
      'Equivalencia MCER',
      'Docente Evaluador',
      'Duracion',
      'Fecha Evaluacion'
    ]

    const rows = evaluationsList.map(ev => {
      const p = getEvaluationPlacementData(ev)
      return [
        `"${ev.studentCarnet || 'N/A'}"`,
        `"${(ev.studentName || '').replace(/"/g, '""')}"`,
        `"${ev.studentEmail || ''}"`,
        `"${ev.grade || ''}"`,
        `"${ev.section || ''}"`,
        `"${p.group}"`,
        `"${p.categoryLabel}"`,
        `"${p.scorePercent}%"`,
        `"${p.cefr}"`,
        `"${(ev.teacherName || ev.teacherEmail || '').replace(/"/g, '""')}"`,
        `"${ev.durationFormatted || `${ev.totalDurationSeconds || 0}s`}"`,
        `"${ev.completedAt ? new Date(ev.completedAt).toLocaleString('es-SV') : 'N/A'}"`
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Preparar y disparar impresión de Acta Oficial
  const handleOpenPrintActa = (evaluationsList) => {
    if (!evaluationsList || evaluationsList.length === 0) {
      alert('No hay registros de evaluación para emitir el acta con los filtros actuales.')
      return
    }

    setActaToPrint({
      items: evaluationsList,
      generatedAt: new Date(),
      grade: resultsGradeFilter === 'all' ? 'Todos los Grados' : `${resultsGradeFilter}° Grado`,
      level: resultsLevelFilter === 'all' ? 'Todos los Niveles' : `Nivel ${resultsLevelFilter}`,
      teacher: resultsTeacherFilter === 'all' ? (currentTeacher?.name || user?.name || 'Cuerpo Docente') : resultsTeacherFilter.toUpperCase(),
      totalStudents: evaluationsList.length
    })
  }

  const triggerBrowserPrint = () => {
    document.body.classList.add('printing-report')
    window.print()
    setTimeout(() => {
      document.body.classList.remove('printing-report')
    }, 500)
  }

  // Configuración de módulos activados desde el Admin
  const [coordinationModules, setCoordinationModules] = useState({})
  // Configuración diagnóstica (ponderaciones y matriz de libros por grado)
  const [diagnosticConfig, setDiagnosticConfig] = useState(null)
  // Alumno seleccionado para revisar y emitir veredicto final
  const [selectedVerdictStudent, setSelectedVerdictStudent] = useState(null)

  // Cargar lista de alumnos, evaluaciones, estructura académica y datos frescos del docente
  const loadData = async () => {
    setLoadingStudents(true)
    try {
      const [all, evals, struct, freshTeacher, modulesCfg, diagCfg] = await Promise.all([
        getAllUsers(),
        getOralEvaluations(),
        getAcademicStructure(),
        user?.email ? getUserProfile(user.email) : Promise.resolve(null),
        getCoordinationModulesConfig(),
        getDiagnosticConfig()
      ])
      setStudents((all || []).filter(u => u.role === 'student'))
      setEvaluations(evals || [])
      if (struct) setAcademic(struct)
      if (modulesCfg) setCoordinationModules(modulesCfg)
      if (diagCfg) setDiagnosticConfig(diagCfg)
      if (freshTeacher) {
        setCurrentTeacher(prev => ({ ...(prev || {}), ...freshTeacher }))
        onUpdateCurrentUser?.(freshTeacher)
      }
    } catch (e) {
      console.error('Error cargando alumnos en vista docente:', e)
    } finally {
      setLoadingStudents(false)
    }
  }

  // Guardar Veredicto Final en Firebase Firestore y sincronizar localmente
  const handleSaveFinalVerdict = async (verdictData) => {
    try {
      // 1. Actualización visual reactiva e inmediata
      setStudents(prev => prev.map(s => {
        if ((s.email || '').toLowerCase() === (verdictData.studentEmail || '').toLowerCase()) {
          return {
            ...s,
            assignedLevel: verdictData.assignedLevel,
            assignedGroup: verdictData.assignedGroup,
            assignedCefr: verdictData.assignedCefr,
            verdictJustification: verdictData.verdictJustification,
            verdictByTeacher: verdictData.verdictByTeacher,
            verdictDate: verdictData.verdictDate,
            totalDiagnosticScore: verdictData.totalScorePercent,
            evaluationCompleted: true
          }
        }
        return s
      }))

      // 2. Guardar y persistir en Firebase Firestore
      await registerOrUpdateUser({
        email: verdictData.studentEmail,
        assignedLevel: verdictData.assignedLevel,
        assignedGroup: verdictData.assignedGroup,
        assignedCefr: verdictData.assignedCefr,
        verdictJustification: verdictData.verdictJustification,
        verdictByTeacher: verdictData.verdictByTeacher,
        verdictDate: verdictData.verdictDate,
        totalDiagnosticScore: verdictData.totalScorePercent,
        evaluationCompleted: true
      })

      // 3. Cerrar modal y notificar al profesor
      setSelectedVerdictStudent(null)
      alert(`✅ Veredicto guardado y sincronizado exitosamente en Firebase:\n\nEstudiante: ${verdictData.studentEmail}\nGrupo Oficial Asignado: ${verdictData.assignedGroup}\nNivel MCER: ${verdictData.assignedCefr}\nPuntaje Global: ${verdictData.totalScorePercent}%\nDocente: ${verdictData.verdictByTeacher}`)
      
      // Recargar datos para asegurar consistencia
      await loadData()
    } catch (err) {
      console.error('Error guardando veredicto final en Firebase:', err)
      alert('Error guardando veredicto: ' + err.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Iniciar la entrevista oral llamando al alumno
  const handleStartInterview = (student) => {
    setActiveInterviewStudent(student)
  }

  // Resetear la evaluación de un alumno individual
  const handleResetStudent = async (student) => {
    if (!confirm(`¿Deseas resetear el Nivel Oficial y la evaluación de ${student.name}? Volverá a quedar en "Sin Evaluar".`)) return
    try {
      await resetStudentEvaluation(student.email)
      await loadData()
    } catch (e) {
      console.error('Error al resetear alumno:', e)
    }
  }

  // Desbloquear / Re-habilitar / Resetear test específico o todos los tests de un alumno (Listening, Plataforma, etc.)
  const handleUnlockExam = async (student, examId = null) => {
    const isListening = examId && (examId.toLowerCase().includes('listening') || examId.toLowerCase().includes('audio'))
    const examLabel = examId 
      ? (isListening ? `Prueba de Comprensión Auditiva (Listening: ${examId})` : `Actividad "${examId}"`)
      : 'todas las actividades y pruebas digitales de plataforma'

    const msg = examId
      ? `¿Deseas RESETEAR y habilitar la ${examLabel} para el alumno ${student.name || student.studentName}?\n\nAl resetearla, se borrará su intento previo y el alumno podrá ingresar a realizarla de nuevo inmediatamente.`
      : `¿Deseas RESETEAR todas las pruebas de plataforma y listening para ${student.name || student.studentName}?\n\nEl alumno podrá realizar todas sus pruebas nuevamente desde cero.`
    
    if (!confirm(msg)) return
    const targetEmail = student.email || student.studentEmail
    try {
      await unlockStudentExam(targetEmail, examId)
      await loadData()

      // Actualizar el modal de seguridad si está abierto
      if (selectedStudentSecurityDetail?.email === targetEmail) {
        const updatedStudent = { ...selectedStudentSecurityDetail }
        const comp = { ...(updatedStudent.completedExams || {}) }
        if (examId) delete comp[examId]
        else for (let k of Object.keys(comp)) delete comp[k]
        updatedStudent.completedExams = comp
        setSelectedStudentSecurityDetail(updatedStudent)
      }

      alert(`✓ Actividad ${examId ? `"${examId}"` : 'digital'} reseteada y desbloqueada exitosamente para el estudiante. Ya puede volver a realizarla.`)
    } catch (e) {
      console.error('Error al desbloquear examen:', e)
      alert('Error al desbloquear examen: ' + e.message)
    }
  }

  // Resetear / Limpiar las alertas de fraude y salidas de pestaña de un alumno
  const handleClearFraud = async (student, examId = null) => {
    const studentName = student.name || student.studentName || 'el alumno'
    const msg = examId
      ? `¿Deseas RESETEAR las alertas de fraude del test "${examId}" para ${studentName}?\n\nLas advertencias y eventos de salida de pestaña se reiniciarán a 0 conservando la nota del estudiante.`
      : `¿Deseas RESETEAR TODAS las alertas de fraude e incidencias de ${studentName}?\n\nLa bitácora de salidas de pantalla se limpiará y el alumno quedará sin penalizaciones de fraude.`

    if (!confirm(msg)) return
    const targetEmail = student.email || student.studentEmail
    try {
      await clearFraudIncidents(targetEmail, examId)
      await loadData()

      // Actualizar el modal si está abierto
      if (selectedStudentSecurityDetail?.email === targetEmail) {
        const updatedStudent = { ...selectedStudentSecurityDetail }
        const comp = { ...(updatedStudent.completedExams || {}) }
        if (examId && comp[examId]) {
          comp[examId] = { ...comp[examId], warningsCount: 0, incidents: [], byTimeout: false }
        } else {
          for (let k of Object.keys(comp)) {
            comp[k] = { ...comp[k], warningsCount: 0, incidents: [], byTimeout: false }
          }
        }
        updatedStudent.completedExams = comp
        setSelectedStudentSecurityDetail(updatedStudent)
      }

      alert(`✓ Alertas de fraude reseteadas exitosamente para ${studentName}.`)
    } catch (e) {
      console.error('Error al resetear fraude:', e)
      alert('Error al resetear alertas de fraude: ' + e.message)
    }
  }

  // Resetear / Limpiar alertas de fraude de forma masiva para los alumnos filtrados
  const handleBatchClearFraud = async (studentsList, label = 'la lista seleccionada') => {
    if (!studentsList || studentsList.length === 0) return
    if (!confirm(`⚠️ ¿Deseas RESETEAR las alertas de fraude y salidas de pantalla de los ${studentsList.length} alumno(s) de ${label}?\n\nLas advertencias se restablecerán a 0 y quedarán con expediente limpio conservando sus notas.`)) return
    
    try {
      setLoadingStudents(true)
      await Promise.all(
        studentsList.map(s => {
          const target = s.email || s.studentEmail
          return target ? clearFraudIncidents(target, null) : Promise.resolve()
        })
      )
      await loadData()
      alert(`✅ Se limpiaron exitosamente las alertas de fraude para ${studentsList.length} estudiantes.`)
    } catch (e) {
      console.error('Error al resetear alertas masivas:', e)
      alert('Error al resetear alertas: ' + e.message)
    } finally {
      setLoadingStudents(false)
    }
  }

  // Eliminar un acta de evaluación oral individual desde la pestaña Resultados
  const handleDeleteEvaluation = async (ev) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente la evaluación de "${ev.studentName}"?\n\nEl alumno quedará nuevamente como "Sin Evaluar" para poder repetir su entrevista oral.`)) return
    try {
      await deleteOralEvaluation(ev.id, ev.studentEmail)
      await loadData()
    } catch (e) {
      console.error('Error al eliminar evaluación:', e)
      alert('Error al eliminar la evaluación: ' + e.message)
    }
  }

  // Resetear TODAS las evaluaciones de los alumnos
  const handleResetAll = async () => {
    if (!confirm('⚠️ ¿Estás seguro de que deseas resetear los Niveles Oficiales de TODOS los alumnos? Quedarán todos pendientes de evaluación.')) return
    try {
      await resetAllEvaluations()
      await loadData()
    } catch (e) {
      console.error('Error al resetear todas las evaluaciones:', e)
    }
  }

  // Activar o desactivar alumno desde vista docente
  const handleToggleStatus = async (targetEmail, currentStatus) => {
    if (!targetEmail) return
    const clean = targetEmail.trim().toLowerCase()
    const newStatus = currentStatus === 'active' ? 'pending' : 'active'
    
    // Actualización visual inmediata (optimista)
    setStudents(prev => prev.map(s => (s.email || '').trim().toLowerCase() === clean ? { ...s, status: newStatus } : s))
    
    try {
      await updateUserStatus(clean, newStatus, user.email)
      await loadData()
    } catch (e) {
      console.error('Error al actualizar estado:', e)
      await loadData()
    }
  }

  // Alternar Activo / Pausado de toda la lista filtrada
  const [isBatchUpdatingStatus, setIsBatchUpdatingStatus] = useState(false)
  const handleBatchToggleStatus = async () => {
    if (filteredStudents.length === 0) return
    const allActive = filteredStudents.every(s => s.status === 'active')
    const targetStatus = allActive ? 'pending' : 'active'
    const actionText = targetStatus === 'active' ? 'HABILITAR' : 'PAUSAR'

    if (!confirm(`¿Deseas ${actionText} el acceso de los ${filteredStudents.length} alumnos de esta sección/vista?`)) return

    setIsBatchUpdatingStatus(true)
    const emailsToUpdate = filteredStudents.map(s => s.email).filter(Boolean)
    const cleanEmails = emailsToUpdate.map(e => e.trim().toLowerCase())

    // Actualización visual reactiva inmediata
    setStudents(prev => prev.map(s => {
      const email = (s.email || '').trim().toLowerCase()
      if (cleanEmails.includes(email)) return { ...s, status: targetStatus }
      return s
    }))

    try {
      await updateUsersStatusBatch(cleanEmails, targetStatus, user.email)
      await loadData()
    } catch (e) {
      console.error('Error al actualizar estados en lote:', e)
      await loadData()
    } finally {
      setIsBatchUpdatingStatus(false)
    }
  }

  // Filtrado reactivo con Botones Ovalados
  const filteredStudents = students.filter(s => {
    const isCompleted = Boolean(s.assignedLevel)
    const completed = s.completedExams || {}
    const totalWarnings = Object.values(completed).reduce((acc, c) => acc + (c.warningsCount || (c.incidents?.length || 0)), 0)

    const matchStatus = statusToggle === 'all' ||
      (statusToggle === 'completed' && isCompleted) ||
      (statusToggle === 'pending' && !isCompleted) ||
      (statusToggle === 'incidents' && totalWarnings > 0)

    // Filtro de grado (Si se está en nómina dedicada activeInterviewGradeId, se usa ese grado; de lo contrario gradePill)
    const effectiveGrade = activeInterviewGradeId || gradePill
    let matchGrade = true
    if (effectiveGrade !== 'all') {
      const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
      if (effectiveGrade === '6') matchGrade = gStr.includes('6°') || s.codigoGrado === '06'
      else if (effectiveGrade === '7') matchGrade = gStr.includes('7°') || s.codigoGrado === '07'
      else if (effectiveGrade === '8') matchGrade = gStr.includes('8°') || s.codigoGrado === '08'
      else if (effectiveGrade === '9') matchGrade = gStr.includes('9°') || s.codigoGrado === '09'
      else if (effectiveGrade === '10') matchGrade = gStr.includes('10°') || gStr.includes('1° Bachillerato') || s.codigoGrado === '10'
      else if (effectiveGrade === '11') matchGrade = gStr.includes('11°') || gStr.includes('2° Bachillerato') || s.codigoGrado === '11' || gStr.includes('12°') || s.codigoGrado === '32'
      else matchGrade = gStr.includes(effectiveGrade)
    }

    const matchSection = sectionPill === 'all' || s.section === sectionPill

    // Filtro de Especialidad / Modalidad de Bachillerato (General vs Técnico)
    const matchModality = modalityPill === 'all' || s.especialidad === modalityPill

    // Filtro por nivel institucional actual (L1-A, L1-B, etc.)
    // 6° Grado no posee nivel previo institucional. Siempre se muestra si se está en 6° grado o 'all'
    const isSixth = (s.grade || '').includes('6°') || s.codigoGrado === '06' || s.codigoGrado === '6'
    const matchLevel = levelPill === 'all' || (isSixth && (levelPill === 'none' || levelPill === 'Sin Nivel')) || s.currentLevel === levelPill

    // Filtro por docente asignado
    let matchTeacher = true
    if (teacherFilter !== 'all') {
      const tKey = teacherFilter.toLowerCase()
      const sTeacher = (s.assignedTeacher || '').toLowerCase()
      const sTeacherEmail = (s.assignedTeacherEmail || '').toLowerCase()
      matchTeacher = sTeacher.includes(tKey) || sTeacherEmail.includes(tKey)
    }

    const matchSearch = !searchTerm ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.carnet && s.carnet.includes(searchTerm)) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.especialidad && s.especialidad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.currentLevel && s.currentLevel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.assignedTeacher && s.assignedTeacher.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchStatus && matchGrade && matchSection && matchModality && matchLevel && matchTeacher && matchSearch
  })

  // Paginación
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Filtrado de Evaluaciones en Sección Resultados basado en la Matriz Oficial
  const filteredEvaluations = evaluations.filter(ev => {
    const placement = getEvaluationPlacementData(ev)

    // Filtro por Nivel / Categoría de la Matriz Oficial
    if (resultsLevelFilter !== 'all') {
      const targetFilter = resultsLevelFilter.toUpperCase()
      const matchCategory = placement.category.toUpperCase() === targetFilter
      const matchGroup = placement.group.toUpperCase() === targetFilter
      const matchCefr = (placement.cefr || '').toUpperCase() === targetFilter || (ev.finalLevel || '').toUpperCase() === targetFilter
      if (!matchCategory && !matchGroup && !matchCefr) return false
    }
    // Grado
    if (resultsGradeFilter !== 'all') {
      const gStr = String(ev.grade || '')
      if (!gStr.includes(resultsGradeFilter)) return false
    }
    // Docente
    if (resultsTeacherFilter !== 'all') {
      const tKey = resultsTeacherFilter.toLowerCase()
      const tName = (ev.teacherName || '').toLowerCase()
      const tMail = (ev.teacherEmail || '').toLowerCase()
      if (!tName.includes(tKey) && !tMail.includes(tKey)) return false
    }
    // Búsqueda
    if (resultsSearch) {
      const s = resultsSearch.toLowerCase()
      const match =
        (ev.studentName && ev.studentName.toLowerCase().includes(s)) ||
        (ev.studentCarnet && ev.studentCarnet.toLowerCase().includes(s)) ||
        (ev.studentEmail && ev.studentEmail.toLowerCase().includes(s)) ||
        (ev.teacherName && ev.teacherName.toLowerCase().includes(s)) ||
        (placement.group && placement.group.toLowerCase().includes(s))
      if (!match) return false
    }
    return true
  })

  const resultsTotalPages = Math.ceil(filteredEvaluations.length / resultsPageSize) || 1
  const paginatedEvaluations = filteredEvaluations.slice((resultsPage - 1) * resultsPageSize, resultsPage * resultsPageSize)

  // Métricas del Dashboard de Resultados según la Matriz Oficial Fija
  const matrixCounts = evaluations.reduce((acc, ev) => {
    const p = getEvaluationPlacementData(ev)
    acc[p.category] = (acc[p.category] || 0) + 1 // 'basic', 'intermediate', 'advanced'
    acc[p.group] = (acc[p.group] || 0) + 1
    return acc
  }, { basic: 0, intermediate: 0, advanced: 0 })

  const totalEvaluatedTime = evaluations.reduce((sum, ev) => sum + (ev.totalDurationSeconds || 0), 0)
  const avgDurationMinutes = evaluations.length ? Math.round(totalEvaluatedTime / evaluations.length / 60) : 0

  // Total de alumnos con incidencias registradas
  const totalStudentsWithIncidents = students.filter(s => {
    const c = s.completedExams || {}
    return Object.values(c).reduce((acc, x) => acc + (x.warningsCount || (x.incidents?.length || 0)), 0) > 0
  }).length

  const isAnalyticsEnabled = coordinationModules?.analytics?.enabled !== false

  const menuItems = [
    // 1. GRUPO: ANÁLISIS DE NIVEL
    { type: 'category', label: 'Análisis de Nivel' },
    { key: 'final_verdict', label: 'Veredicto Final', icon: 'gavel', badge: `${students.filter(s => Boolean(s.assignedLevel)).length}/${students.length}` },

    // 2. GRUPO: EVALUACIÓN
    { type: 'category', label: 'Evaluación' },
    { key: 'interview', label: 'Entrevista Oral', icon: 'record_voice_over', badge: `${students.length}` },
    { key: 'exam_dispatch', label: 'Gestión de Pruebas', icon: 'hub', badge: 'En Vivo' },
    { key: 'security_audit', label: 'Fraudes y Pestaña', icon: 'security', badge: totalStudentsWithIncidents > 0 ? `${totalStudentsWithIncidents}` : null },

    // 3. GRUPO: REPORTES
    { type: 'category', label: 'Reportes' },
    { key: 'results', label: 'Actas y Resultados', icon: 'military_tech', badge: `${evaluations.length}` },
    ...(isAnalyticsEnabled ? [{ key: 'analytics', label: 'Analíticas', icon: 'analytics', badge: `${students.filter(s => Boolean(s.assignedLevel)).length} eval.` }] : []),

    // 4. GRUPO: CONFIGURACIÓN
    { type: 'category', label: 'Configuración' },
    { key: 'interview_questions', label: 'Banco de Preguntas', icon: 'quiz' },
    { key: 'builder', label: 'Batería MCER', icon: 'auto_stories' },
    { key: 'diagnostic_config', label: 'Ponderaciones', icon: 'tune' },
    { key: 'profile', label: 'Mi Perfil', icon: 'account_circle' },
  ]

  return (
    <div className="flex h-screen bg-surface font-sans overflow-hidden">
      <Sidebar
        title="Docente Inglés"
        subtitle="Colegio Salesiano San José"
        icon="school"
        menuItems={menuItems}
        activeKey={currentSection}
        onSelect={(k) => {
          setActiveInterviewStudent(null)
          setCurrentSection(k)
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        user={currentTeacher}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="h-20 px-8 bg-white border-b border-[#eceaf6] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-heading font-black text-2xl text-[#2d2c38] tracking-tight">
                {menuItems.find(m => m.key === currentSection)?.label}
              </h1>
              <span className="text-xs text-[#8e8a9f] font-semibold">
                Consola Docente & Diagnóstico 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeInterviewStudent && (
              <button
                type="button"
                onClick={() => setActiveInterviewStudent(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all shadow-xs cursor-pointer"
                title="Salir de la evaluación actual y volver a la lista de alumnos / niveles"
              >
                <span className="material-symbols-outlined text-[17px]">restart_alt</span>
                <span>Restaurar / Ver Niveles</span>
              </button>
            )}

            {onSwitchToAdminView && (
              <button
                onClick={onSwitchToAdminView}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#e9e3ff] hover:bg-[#ded5ff] text-xs font-black text-[#5446a8] transition-all cursor-pointer shadow-xs"
                title="Volver a la consola de Coordinación / Administración"
              >
                <span className="material-symbols-outlined text-[17px] text-[#8a70d6]">admin_panel_settings</span>
                <span className="hidden sm:inline">Panel Admin/Coord</span>
              </button>
            )}

            <button
              onClick={onSwitchToStudentView}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#f8f7fc] hover:bg-[#ede9f7] text-xs font-black text-[#2d2c38] border border-[#e2e0ed] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-[#8a70d6]">visibility</span>
              Vista de Alumno
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition-all border border-rose-200 cursor-pointer"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="p-6 md:p-8 space-y-7 max-w-[96rem] w-full mx-auto">
          
          {/* ================= SI HAY UN ALUMNO EN EVALUACIÓN ORAL ================= */}
          {activeInterviewStudent ? (
            <OralInterviewExam
              student={activeInterviewStudent}
              teacher={currentTeacher || user}
              onFinished={(res) => {
                setActiveInterviewStudent(null)
                loadData()
              }}
              onCancel={() => setActiveInterviewStudent(null)}
            />
          ) : (
            <>
              {/* SECCIÓN 1: ENTREVISTA ORAL CON TOGGLES Y PAGINACIÓN */}
              {currentSection === 'interview' && (
                <div className="space-y-7">
                  {/* Tarjeta de bienvenida del docente - Estilo Banner Admin 3D */}
                  <div className="bg-gradient-to-r from-[#e9e3ff] via-[#f4f1fd] to-[#fbfbfb] rounded-4xl p-7 border border-[#e2e0ed] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="flex items-center gap-5 relative z-10">
                      <img
                        src={currentTeacher?.photoUrl || teacherAvatar}
                        onError={(e) => { e.currentTarget.src = teacherAvatar }}
                        alt={currentTeacher?.name || user?.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#8a70d6]/40 bg-white shadow-sm"
                      />
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#8a70d6] text-xs font-black shadow-xs">
                          <span>✨</span>
                          <span>Consola de Evaluación Oral (A1 - C1)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black text-[#2d2c38] tracking-tight">
                            {currentTeacher?.name || user?.name}
                          </h2>
                          <button
                            type="button"
                            onClick={() => setCurrentSection('profile')}
                            className="text-xs text-[#8a70d6] hover:underline font-bold flex items-center gap-0.5 ml-1"
                            title="Editar mis datos personales y foto"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            <span>Editar</span>
                          </button>
                        </div>
                        <p className="text-xs text-[#585567] font-medium">
                          {user?.email} · {currentTeacher?.specialty || 'Evaluador Oficial Diagnóstico 2026'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 relative z-10">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentSection('builder')}
                          className="px-4 py-2.5 rounded-2xl bg-[#8a70d6] hover:bg-[#7a60c7] text-white text-xs font-black transition-all shadow-md shadow-[#8a70d6]/20 flex items-center gap-2 cursor-pointer"
                          title="Ver y probar la batería oficial de tests estandarizados (Listening, Scramble 20, Reading, Cloze)"
                        >
                          <span className="material-symbols-outlined text-[18px]">auto_stories</span>
                          <span>Batería MCER (4)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCurrentSection('diagnostic_config')}
                          className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#f8f7fc] text-[#2d2c38] text-xs font-black transition-all border border-[#e2e0ed] flex items-center gap-2 cursor-pointer shadow-xs"
                          title="Ver y configurar ponderaciones de entrevista (40%) y plataforma (60%)"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#8a70d6]">tune</span>
                          <span className="hidden md:inline">Ponderaciones 2026</span>
                        </button>
                      </div>

                      <div className="text-right pl-3 sm:border-l border-[#e2e0ed] hidden sm:block">
                        <span className="text-[10px] uppercase font-black text-[#8e8a9f] block">Estudiantes</span>
                        <span className="font-heading font-black text-2xl text-[#8a70d6]">{students.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* VISTA 1: NAVEGADOR DE NÓMINAS POR GRADO (Si activeInterviewGradeId es null) */}
                  {!activeInterviewGradeId ? (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#eceaf6] shadow-xs">
                        <div>
                          <h3 className="font-heading font-black text-lg text-[#2d2c38] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#7052c9] text-[22px]">badge</span>
                            <span>Nóminas por Grado — Selección Rápida</span>
                          </h3>
                          <p className="text-xs text-[#8e8a9f] font-medium mt-0.5">
                            Selecciona un grado para abrir su nómina limpia y llamar a los estudiantes a su entrevista oral.
                          </p>
                        </div>

                        {/* Filtro por Docente para las estadísticas */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">school</span>
                            Docente:
                          </span>
                          {[
                            { id: 'all', label: 'Todos' },
                            { id: 'ronald', label: 'Ronald' },
                            { id: 'silvia', label: 'Silvia' },
                            { id: 'nelsi', label: 'Nelsi' },
                            { id: 'edgar', label: 'Edgar' }
                          ].map(t => {
                            const isSelected = teacherFilter === t.id
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setTeacherFilter(t.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#5446a8] text-white shadow-xs'
                                    : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                                }`}
                              >
                                {t.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Tarjetas de Grados en Cuadrícula (6°, 7°, 8°, 9°, 10°, 11°) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                          { id: '6', label: '6° Grado', fullTitle: '6° Grado (Educación Básica)', badge: 'Básica' },
                          { id: '7', label: '7° Grado', fullTitle: '7° Grado (Educación Básica)', badge: 'Básica' },
                          { id: '8', label: '8° Grado', fullTitle: '8° Grado (Educación Básica)', badge: 'Básica' },
                          { id: '9', label: '9° Grado', fullTitle: '9° Grado (Tercer Ciclo)', badge: 'Tercer Ciclo' },
                          { id: '10', label: '1° Bachillerato', fullTitle: '1° Bachillerato (10° Grado)', badge: 'Media' },
                          { id: '11', label: '2° Bachillerato', fullTitle: '2° Bachillerato (11° Grado)', badge: 'Graduandos' }
                        ].map(gDef => {
                          const gId = gDef.id
                          const gradeStudents = students.filter(s => {
                            const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
                            if (gId === '6') return gStr.includes('6°') || s.codigoGrado === '06'
                            if (gId === '7') return gStr.includes('7°') || s.codigoGrado === '07'
                            if (gId === '8') return gStr.includes('8°') || s.codigoGrado === '08'
                            if (gId === '9') return gStr.includes('9°') || s.codigoGrado === '09'
                            if (gId === '10') return gStr.includes('10°') || gStr.includes('1° Bach') || s.codigoGrado === '10'
                            if (gId === '11') return gStr.includes('11°') || gStr.includes('2° Bach') || s.codigoGrado === '11' || gStr.includes('12°') || s.codigoGrado === '32'
                            return false
                          })

                          const visibleStudents = teacherFilter === 'all'
                            ? gradeStudents
                            : gradeStudents.filter(s => {
                                const tKey = teacherFilter.toLowerCase()
                                const sTeacher = (s.assignedTeacher || '').toLowerCase()
                                const sTeacherEmail = (s.assignedTeacherEmail || '').toLowerCase()
                                return sTeacher.includes(tKey) || sTeacherEmail.includes(tKey)
                              })

                          const total = visibleStudents.length
                          const evaluated = visibleStudents.filter(s => Boolean(s.assignedLevel)).length
                          const pending = total - evaluated
                          const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0

                          return (
                            <div
                              key={gId}
                              className="card-academy p-6 flex flex-col justify-between hover:shadow-lg hover:border-[#8a70d6]/50 transition-all duration-200 group bg-white"
                            >
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed]">
                                    {gDef.badge}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#8e8a9f]">
                                    <span className="material-symbols-outlined text-[16px] text-[#7052c9]">group</span>
                                    <span>{total} alumnos</span>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-heading font-black text-xl text-[#2d2c38] group-hover:text-[#7052c9] transition-colors">
                                    {gDef.label}
                                  </h4>
                                  <p className="text-xs text-[#8e8a9f] font-medium mt-0.5">
                                    {gDef.fullTitle}
                                  </p>
                                </div>

                                <div className="space-y-1.5 bg-[#fbfbfd] p-3.5 rounded-2xl border border-[#eceaf6]">
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-[#585567]">Avance Entrevista:</span>
                                    <span className="text-[#7052c9] font-black">{percent}%</span>
                                  </div>
                                  <div className="w-full bg-[#e2e0ed] h-2.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-gradient-to-r from-[#8a70d6] to-emerald-500 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${percent}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] pt-1 font-semibold">
                                    <span className="text-emerald-700 flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                      {evaluated} Evaluados
                                    </span>
                                    <span className="text-amber-700 flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                      {pending} Pendientes
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveInterviewGradeId(gId)
                                  setSectionPill('all')
                                  setStatusToggle('all')
                                  setSearchTerm('')
                                  setCurrentPage(1)
                                }}
                                className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-[#7052c9] to-[#8a70d6] hover:from-[#5e41b5] hover:to-[#7a60c7] text-white font-black text-xs shadow-md shadow-[#8a70d6]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                              >
                                <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                                <span>Ver Nómina ({gDef.label})</span>
                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    /* VISTA 2: NÓMINA DEDICADA DEL GRADO SELECCIONADO */
                    <div className="space-y-5 animate-fadeIn">
                      {/* Cabecera de la Nómina con Botón Volver */}
                      <div className="bg-white p-5 rounded-3xl border border-[#eceaf6] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveInterviewGradeId(null)
                              setSearchTerm('')
                            }}
                            className="w-10 h-10 rounded-2xl bg-[#f8f7fc] hover:bg-[#e9e3ff] text-[#5446a8] border border-[#e2e0ed] flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
                            title="Volver al navegador de grados"
                          >
                            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#e9e3ff] text-[#5446a8]">
                                Nómina de Grado
                              </span>
                              <h3 className="font-heading font-black text-xl text-[#2d2c38]">
                                {activeInterviewGradeId === '6' && '6° Grado'}
                                {activeInterviewGradeId === '7' && '7° Grado'}
                                {activeInterviewGradeId === '8' && '8° Grado'}
                                {activeInterviewGradeId === '9' && '9° Grado'}
                                {activeInterviewGradeId === '10' && '1° Bachillerato (10°)'}
                                {activeInterviewGradeId === '11' && '2° Bachillerato (11°)'}
                              </h3>
                            </div>
                            <span className="text-xs text-[#8e8a9f] font-medium block mt-0.5">
                              Lista oficial de entrevistas • {filteredStudents.length} alumno(s) mostrados
                            </span>
                          </div>
                        </div>

                        {/* Buscador Rápido y Reset de Prueba */}
                        <div className="flex items-center gap-2.5 w-full md:w-auto">
                          <div className="relative flex-1 md:w-72">
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setCurrentPage(1)
                              }}
                              placeholder="Buscar carnet o nombre..."
                              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#f8f7fc] border border-[#e2e0ed] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 text-[#2d2c38]"
                            />
                            <span className="material-symbols-outlined text-[18px] text-[#8e8a9f] absolute left-3 top-1/2 -translate-y-1/2">
                              search
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={handleResetAll}
                            className="px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            title="Resetear niveles en modo pruebas"
                          >
                            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                            <span className="hidden sm:inline">Reset</span>
                          </button>
                        </div>
                      </div>

                      {/* Filtros Limpios de Nómina: Sección, Estado y Docente */}
                      <div className="card-academy p-4 px-5 flex flex-wrap items-center justify-between gap-3 bg-white">
                        {/* Selector de Secciones */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
                            Sección:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSectionPill('all')
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              sectionPill === 'all'
                                ? 'bg-[#5446a8] text-white shadow-xs'
                                : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                            }`}
                          >
                            Todas
                          </button>
                          {(academic.sections && academic.sections.length > 0 ? academic.sections : ['A', 'B', 'C', 'D']).map(sec => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => {
                                setSectionPill(sec)
                                setCurrentPage(1)
                              }}
                              className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                                sectionPill === sec
                                  ? 'bg-[#5446a8] text-white shadow-xs'
                                  : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                              }`}
                            >
                              {sec}
                            </button>
                          ))}

                          <span className="text-gray-300 mx-1 hidden sm:inline">|</span>

                          {/* Modalidad si es Bachillerato */}
                          {(activeInterviewGradeId === '10' || activeInterviewGradeId === '11') && (
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
                                Modalidad:
                              </span>
                              {['all', 'General', 'Técnico'].map(mod => (
                                <button
                                  key={mod}
                                  type="button"
                                  onClick={() => {
                                    setModalityPill(mod)
                                    setCurrentPage(1)
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    modalityPill === mod
                                      ? 'bg-[#2d2c38] text-white shadow-xs'
                                      : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                                  }`}
                                >
                                  {mod === 'all' ? 'Todas' : mod}
                                </button>
                              ))}
                              <span className="text-gray-300 mx-1 hidden sm:inline">|</span>
                            </div>
                          )}

                          {/* Filtro de Estado: Todos, Pendientes, Evaluados */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setStatusToggle('all')
                                setCurrentPage(1)
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                statusToggle === 'all' ? 'bg-[#2d2c38] text-white shadow-xs' : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                              }`}
                            >
                              Todos
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStatusToggle('pending')
                                setCurrentPage(1)
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                statusToggle === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-[#585567] hover:text-amber-700 bg-[#f8f7fc] border border-[#e2e0ed]'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              <span>Por Evaluar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStatusToggle('completed')
                                setCurrentPage(1)
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                statusToggle === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[#585567] hover:text-emerald-700 bg-[#f8f7fc] border border-[#e2e0ed]'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              <span>Evaluados</span>
                            </button>
                          </div>
                        </div>

                        {/* Filtro por Docente en la Nómina */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">school</span>
                            Docente:
                          </span>
                          {[
                            { id: 'all', label: 'Todos' },
                            { id: 'ronald', label: 'Ronald' },
                            { id: 'silvia', label: 'Silvia' },
                            { id: 'nelsi', label: 'Nelsi' },
                            { id: 'edgar', label: 'Edgar' }
                          ].map(t => {
                            const isSelected = teacherFilter === t.id
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setTeacherFilter(t.id)
                                  setCurrentPage(1)
                                }}
                                className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#5446a8] text-white shadow-xs'
                                    : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                                }`}
                              >
                                {t.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* TABLA LIMPIA Y PRÁCTICA DE NÓMINA (SOLO 5 COLUMNAS ESENCIALES) */}
                      <div className="card-academy overflow-hidden bg-white shadow-sm">
                        <div className="p-4 px-6 border-b border-[#eceaf6] flex items-center justify-between bg-gradient-to-r from-white to-[#f4f1fd]/40">
                          <span className="text-xs font-black text-[#2d2c38] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-[#7052c9]">playlist_add_check</span>
                            <span>Lista Oficial para Entrevistas ({filteredStudents.length} estudiantes)</span>
                          </span>
                          <span className="text-xs font-black text-[#5446a8] bg-[#e9e3ff] px-3 py-1 rounded-full shadow-xs">
                            Página {currentPage} de {totalPages}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs md:text-sm">
                            <thead>
                              <tr className="border-b border-[#eceaf6] text-[11px] font-black uppercase text-[#8e8a9f] bg-[#fbfbfb]">
                                <th className="py-3.5 px-5 font-black">Estudiante</th>
                                <th className="py-3.5 px-4 text-center font-black">Sección</th>
                                <th className="py-3.5 px-4 font-black">Docente Titular</th>
                                <th className="py-3.5 px-4 text-center font-black">Estado Oral</th>
                                <th className="py-3.5 px-5 text-right font-black">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eceaf6]/60">
                              {paginatedStudents.length === 0 ? (
                                <tr>
                                  <td colSpan="5" className="py-14 text-center text-[#8e8a9f] text-xs italic">
                                    No se encontraron alumnos en esta sección o con los filtros seleccionados.
                                  </td>
                                </tr>
                              ) : (
                                paginatedStudents.map((s) => {
                                  const hasLevel = Boolean(s.assignedLevel)
                                  const userEmail = (user?.email || '').toLowerCase()
                                  const userName = (user?.name || '').toLowerCase()
                                  const isGlobalAdminOrCoord = user?.role === 'admin' || user?.role === 'coordination' || userEmail.includes('admin') || userEmail.includes('docente@')
                                  const studentTeacher = (s.assignedTeacher || '').toLowerCase()
                                  const studentTeacherEmail = (s.assignedTeacherEmail || '').toLowerCase()

                                  const isMyStudent = isGlobalAdminOrCoord ||
                                    (userEmail && studentTeacherEmail && userEmail === studentTeacherEmail) ||
                                    (userEmail.includes('ronald') && (studentTeacher.includes('ronald') || studentTeacherEmail.includes('ronald'))) ||
                                    (userEmail.includes('silvia') && (studentTeacher.includes('silvia') || studentTeacherEmail.includes('silvia'))) ||
                                    (userEmail.includes('nelsi') && (studentTeacher.includes('nelsi') || studentTeacherEmail.includes('nelsi'))) ||
                                    ((userEmail.includes('edgar') || userEmail.includes('pacheco')) && (studentTeacher.includes('edgar') || studentTeacher.includes('pacheco') || studentTeacherEmail.includes('edgar'))) ||
                                    (userName && studentTeacher && userName.includes(studentTeacher))

                                  const isExpanded = expandedInterviewStudentId === (s.id || s.email || s.carnet)

                                  return (
                                    <React.Fragment key={s.id || s.carnet || s.email}>
                                      <tr className={`table-academy-row transition-colors ${isExpanded ? 'bg-[#f4f1fd]/40' : 'hover:bg-[#fbfafd]'}`}>
                                        {/* Columna 1: Estudiante (Nombre + Carnet + Colapsable) */}
                                        <td className="py-3.5 px-5 font-bold text-[#2d2c38]">
                                          <div className="flex items-center gap-2.5">
                                            <button
                                              type="button"
                                              onClick={() => setExpandedInterviewStudentId(isExpanded ? null : (s.id || s.email || s.carnet))}
                                              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                                isExpanded ? 'bg-[#5446a8] text-white shadow-xs rotate-180' : 'bg-[#f4f1fd] text-[#5446a8] hover:bg-[#e9e3ff]'
                                              }`}
                                              title={isExpanded ? 'Ocultar detalles del alumno' : 'Ver detalle completo del alumno'}
                                            >
                                              <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                            </button>
                                            <div className="w-8 h-8 rounded-xl bg-[#e9e3ff] text-[#5446a8] font-black text-xs flex items-center justify-center shrink-0">
                                              {(s.name || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-black text-[#2d2c38]">{s.name}</span>
                                                {s.selfReportedLevel && (
                                                  <span className="px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                                                    Auto: {s.selfReportedLevel}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[11px] text-[#8e8a9f] font-mono flex items-center gap-2">
                                                <span className="font-bold text-[#585567]">{s.carnet || 'S/C'}</span>
                                                <span>•</span>
                                                <span className="truncate max-w-xs">{s.email}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </td>

                                        {/* Columna 2: Sección */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#e9e3ff] font-black text-xs text-[#5446a8] border border-[#d8ceff] shadow-2xs">
                                            {s.section || 'A'}
                                          </span>
                                        </td>

                                        {/* Columna 3: Docente */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                          {s.assignedTeacher ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#585567] bg-[#f8f7fc] px-2.5 py-1 rounded-xl border border-[#e2e0ed]">
                                              <span>👨‍🏫</span>
                                              <span>{s.assignedTeacher}</span>
                                            </span>
                                          ) : (
                                            <span className="text-[#8e8a9f] text-xs italic">Sin asignar</span>
                                          )}
                                        </td>

                                        {/* Columna 4: Estado Oral */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                          {hasLevel ? (
                                            <div className="inline-flex items-center gap-1.5">
                                              <span className="px-3 py-1 rounded-full font-black text-xs bg-emerald-600 text-white shadow-xs">
                                                Nivel {s.assignedLevel}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleResetStudent(s)}
                                                className="p-1 rounded-lg text-[#8e8a9f] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                title={`Resetear nivel de ${s.name}`}
                                              >
                                                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                                              Por Evaluar
                                            </span>
                                          )}
                                        </td>

                                        {/* Columna 5: Acción Directa */}
                                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                          {s.canEvaluate === false ? (
                                            <span
                                              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs inline-flex items-center gap-1 border border-slate-200"
                                              title="No requiere evaluación oral"
                                            >
                                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                              <span>No se evalúa</span>
                                            </span>
                                          ) : isMyStudent ? (
                                            <div className="inline-flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => setSelectedVerdictStudent(s)}
                                                className="px-3 py-1.5 rounded-2xl bg-[#f8f7fc] hover:bg-[#ede9f7] text-[#5446a8] border border-[#e2e0ed] font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                title="Ver veredicto y notas consolidadas"
                                              >
                                                <span className="material-symbols-outlined text-[15px]">gavel</span>
                                                <span>Veredicto</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleStartInterview(s)}
                                                className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-[#8a70d6] to-[#7052c9] hover:from-[#7a60c7] hover:to-[#5e41b5] text-white font-black text-xs shadow-md shadow-[#8a70d6]/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                                title="Abrir consola de preguntas orales"
                                              >
                                                <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                                                <span>{hasLevel ? 'Reevaluar' : 'Llamar a Entrevista'}</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="inline-flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => setSelectedVerdictStudent(s)}
                                                className="px-3 py-1.5 rounded-2xl bg-[#f8f7fc] hover:bg-[#ede9f7] text-[#585567] font-black text-xs border border-[#e2e0ed] flex items-center gap-1 cursor-pointer transition-all"
                                              >
                                                <span className="material-symbols-outlined text-[15px]">gavel</span>
                                                <span>Veredicto</span>
                                              </button>
                                              <span
                                                className="px-3 py-1.5 rounded-2xl bg-[#f8f7fc] text-[#8e8a9f] font-bold text-xs inline-flex items-center gap-1 border border-[#e2e0ed] select-none"
                                                title={`Asignado a ${s.assignedTeacher || 'otro docente'}`}
                                              >
                                                <span className="material-symbols-outlined text-[14px]">lock</span>
                                                <span>Otro Docente</span>
                                              </span>
                                            </div>
                                          )}
                                        </td>
                                      </tr>

                                      {/* FILA COLAPSABLE CON DETALLES DEL ALUMNO */}
                                      {isExpanded && (
                                        <tr className="bg-[#f9f8fe] border-b border-[#e2e0ed]">
                                          <td colSpan="5" className="p-4 px-6">
                                            <div className="rounded-2xl bg-white border border-[#eceaf6] p-4.5 shadow-2xs space-y-3">
                                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0edf7] pb-3">
                                                <div className="flex items-center gap-2">
                                                  <span className="material-symbols-outlined text-[20px] text-[#7052c9]">badge</span>
                                                  <span className="text-xs font-black uppercase text-[#2d2c38]">
                                                    Ficha del Estudiante · {s.name} ({s.carnet || 'Sin Carnet'})
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-[#8e8a9f]">
                                                  <span>Grado: <strong className="text-[#5446a8]">{s.grade || s.codigoGrado || '-'}</strong></span>
                                                  <span>•</span>
                                                  <span>Sección: <strong className="text-[#5446a8]">{s.section || 'A'}</strong></span>
                                                  {s.especialidad && (
                                                    <>
                                                      <span>•</span>
                                                      <span>Esp: <strong className="text-[#5446a8]">{s.especialidad}</strong></span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Cuadrícula de detalles y pruebas */}
                                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                                <div className="p-3 rounded-xl bg-[#fbfafd] border border-[#f0edf7]">
                                                  <span className="text-[10px] font-bold text-[#8e8a9f] uppercase block">Nivel Asignado</span>
                                                  <span className="font-heading font-black text-sm text-[#2d2c38] mt-0.5 block">
                                                    {s.assignedLevel ? `Nivel ${s.assignedLevel}` : 'Pendiente de Entrevista'}
                                                  </span>
                                                  <span className="text-[10px] text-[#8e8a9f]">
                                                    {s.currentLevel && s.currentLevel !== 'Sin Nivel' ? `Previo: ${s.currentLevel}` : 'Sin nivel anterior'}
                                                  </span>
                                                </div>

                                                <div className="p-3 rounded-xl bg-[#fbfafd] border border-[#f0edf7]">
                                                  <span className="text-[10px] font-bold text-[#8e8a9f] uppercase block">Docente Titular</span>
                                                  <span className="font-heading font-black text-sm text-[#2d2c38] mt-0.5 block truncate">
                                                    {s.assignedTeacher || 'No asignado'}
                                                  </span>
                                                  <span className="text-[10px] text-[#8e8a9f] truncate block">
                                                    {s.assignedTeacherEmail || s.email}
                                                  </span>
                                                </div>

                                                <div className="p-3 rounded-xl bg-[#fbfafd] border border-[#f0edf7]">
                                                  <span className="text-[10px] font-bold text-[#8e8a9f] uppercase block">Pruebas Digitales</span>
                                                  <span className="font-heading font-black text-sm text-[#5446a8] mt-0.5 block">
                                                    {Object.keys(s.completedExams || {}).length} completada(s)
                                                  </span>
                                                  <span className="text-[10px] text-[#8e8a9f]">
                                                    {Object.keys(s.completedExams || {}).join(', ') || 'Sin envíos aún'}
                                                  </span>
                                                </div>

                                                <div className="p-3 rounded-xl bg-[#fbfafd] border border-[#f0edf7]">
                                                  <span className="text-[10px] font-bold text-[#8e8a9f] uppercase block">Seguridad e Integridad</span>
                                                  {(() => {
                                                    const comp = s.completedExams || {}
                                                    let w = 0
                                                    Object.values(comp).forEach(c => {
                                                      w += c.warningsCount || (c.incidents?.length || 0)
                                                    })
                                                    return (
                                                      <div>
                                                        <span className={`font-heading font-black text-sm mt-0.5 block ${w > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                          {w > 0 ? `${w} salida(s) detectadas` : '100% Limpio ✓'}
                                                        </span>
                                                        <span className="text-[10px] text-[#8e8a9f]">
                                                          {w >= 3 ? 'Alerta crítica de fraude' : w > 0 ? 'Observado' : 'Sin incidencias'}
                                                        </span>
                                                      </div>
                                                    )
                                                  })()}
                                                </div>
                                              </div>

                                              {/* Acciones del detalle */}
                                              <div className="flex items-center justify-end gap-2 pt-1">
                                                <button
                                                  type="button"
                                                  onClick={() => setSelectedVerdictStudent(s)}
                                                  className="px-3 py-1.5 rounded-xl bg-[#f4f1fd] hover:bg-[#e9e3ff] text-[#5446a8] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                >
                                                  <span className="material-symbols-outlined text-[15px]">gavel</span>
                                                  <span>Ver Expediente y Veredicto Completo</span>
                                                </button>
                                                {s.completedExams && Object.keys(s.completedExams).length > 0 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setSelectedStudentSecurityDetail(s)}
                                                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-rose-200"
                                                  >
                                                    <span className="material-symbols-outlined text-[15px]">shield</span>
                                                    <span>Auditar Bitácora de Fraude</span>
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Paginación de Nómina */}
                        <div className="p-4 px-6 border-t border-[#eceaf6] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                          <span className="text-xs font-semibold text-[#8e8a9f]">
                            Página <strong className="text-[#2d2c38] font-black">{currentPage}</strong> de <strong className="text-[#2d2c38] font-black">{totalPages}</strong> ({filteredStudents.length} total)
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={currentPage <= 1}
                              onClick={() => setCurrentPage(1)}
                              className="px-3 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f4f1fd] disabled:opacity-30 cursor-pointer"
                            >
                              «
                            </button>
                            <button
                              type="button"
                              disabled={currentPage <= 1}
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className="px-3.5 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f4f1fd] disabled:opacity-30 cursor-pointer"
                            >
                              Anterior
                            </button>

                            <div className="flex items-center gap-1 mx-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = currentPage
                                if (totalPages <= 5) pageNum = i + 1
                                else if (currentPage <= 3) pageNum = i + 1
                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                                else pageNum = currentPage - 2 + i

                                return (
                                  <button
                                    key={pageNum}
                                    type="button"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer ${
                                      currentPage === pageNum
                                        ? 'bg-[#8a70d6] text-white shadow-xs'
                                        : 'text-[#585567] hover:bg-[#f4f1fd]'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                )
                              })}
                            </div>

                            <button
                              type="button"
                              disabled={currentPage >= totalPages}
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className="px-3.5 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f4f1fd] disabled:opacity-30 cursor-pointer"
                            >
                              Siguiente
                            </button>
                            <button
                              type="button"
                              disabled={currentPage >= totalPages}
                              onClick={() => setCurrentPage(totalPages)}
                              className="px-3 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f4f1fd] disabled:opacity-30 cursor-pointer"
                            >
                              »
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* SECCIÓN 1.5: MESA DE VEREDICTO FINAL Y ASIGNACIÓN 360° */}
              {currentSection === 'final_verdict' && (
                <div className="space-y-6">
                  {/* Encabezado informativo con Ponderaciones Dinámicas en Tiempo Real */}
                  <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-[#1e1b4b] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-bold border border-white/10">
                          <span className="material-symbols-outlined text-[16px]">gavel</span>
                          <span>Fase Final de Asignación Oficial 2026</span>
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-black font-heading tracking-tight">
                          Mesa de Veredicto Final (360°)
                        </h2>
                        <p className="text-emerald-100/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
                          Revisa el desempeño integral (Plataforma + Entrevista Oral), contrasta el <strong>nivel previo</strong> con el <strong>nivel asignado</strong>, y evalúa el progreso del alumno según los cortes oficiales.
                        </p>
                      </div>

                      {/* Tarjetas de Métricas y Ponderaciones Dinámicas del Módulo "Ponderaciones y Cortes" */}
                      <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                        <div className="text-center px-2">
                          <span className="text-[10px] uppercase font-bold text-emerald-200 block">Veredictos</span>
                          <span className="text-2xl font-black text-white">
                            {students.filter(s => Boolean(s.assignedLevel)).length}
                          </span>
                        </div>
                        <div className="w-[1px] h-9 bg-white/20"></div>
                        <div className="text-center px-2">
                          <span className="text-[10px] uppercase font-bold text-amber-200 block">Pendientes</span>
                          <span className="text-2xl font-black text-amber-300">
                            {students.filter(s => !s.assignedLevel).length}
                          </span>
                        </div>
                        <div className="w-[1px] h-9 bg-white/20"></div>
                        <div className="text-left px-2">
                          <span className="text-[10px] uppercase font-bold text-teal-200 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">tune</span>
                            Ponderación Activa:
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 text-xs font-extrabold border border-blue-400/30">
                              Plataforma: {diagnosticConfig?.weights?.platform ?? 60}%
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 text-xs font-extrabold border border-purple-400/30">
                              Oral: {diagnosticConfig?.weights?.oral ?? 40}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE FILTROS EN TIEMPO REAL: GRADO, MAESTRO, SECCIÓN, ESTADO */}
                  <div className="card-academy p-6 space-y-4">
                    {/* Fila 1: Botones Ovalados de Grado */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
                        Grado:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setGradePill('all')
                          setCurrentPage(1)
                        }}
                        className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                          gradePill === 'all'
                            ? 'bg-[#8a70d6] text-white shadow-md shadow-[#8a70d6]/30 ring-2 ring-[#e9e3ff]'
                            : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] hover:text-[#2d2c38] border border-[#e2e0ed]'
                        }`}
                      >
                        Todos los Grados
                      </button>
                      {(academic.grades && academic.grades.length > 0 ? academic.grades : [
                        { id: '6', label: '6°' },
                        { id: '7', label: '7°' },
                        { id: '8', label: '8°' },
                        { id: '9', label: '9°' },
                        { id: '10', label: '10°' },
                        { id: '11', label: '11°' },
                        { id: '12', label: '12°' }
                      ]).map(g => {
                        const shortLabel = g.id ? `${parseInt(g.id, 10)}°` : g.label
                        const isSelected = gradePill === g.id
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setGradePill(g.id)
                              setCurrentPage(1)
                            }}
                            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? 'bg-[#8a70d6] text-white shadow-md shadow-[#8a70d6]/30 ring-2 ring-[#e9e3ff]'
                                : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] hover:text-[#2d2c38] border border-[#e2e0ed]'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        )
                      })}
                    </div>

                    {/* Fila 2: Filtro por Docente Titular */}
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#eceaf6]">
                      <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">school</span>
                        Maestro:
                      </span>
                      {[
                        { id: 'all', label: 'Todos los Maestros' },
                        { id: 'ronald', label: 'Ronald Cardona', short: 'Teacher Ronald' },
                        { id: 'silvia', label: 'Silvia Herrera', short: 'Teacher Silvia' },
                        { id: 'nelsi', label: 'Nelsi Ramos', short: 'Teacher Nelsi' },
                        { id: 'edgar', label: 'Edgar Pacheco', short: 'Teacher Edgar' }
                      ].map(t => {
                        const isSelected = teacherFilter === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTeacherFilter(t.id)
                              setCurrentPage(1)
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                              isSelected
                                ? 'bg-[#5446a8] text-white shadow-xs'
                                : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                            }`}
                          >
                            <span>{t.short || t.label}</span>
                            {t.id !== 'all' && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-[#e2e0ed] text-[#585567]'
                              }`}>
                                {students.filter(s => (s.assignedTeacher || '').toLowerCase().includes(t.id)).length}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Fila 3: Filtro por Sección, Estado de Veredicto y Buscador */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#eceaf6]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Secciones */}
                        <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
                          Sección:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSectionPill('all')
                            setCurrentPage(1)
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            sectionPill === 'all'
                              ? 'bg-[#5446a8] text-white shadow-xs'
                              : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                          }`}
                        >
                          Todas
                        </button>
                        {(academic.sections && academic.sections.length > 0 ? academic.sections : ['A', 'B', 'C', 'D']).map(sec => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setSectionPill(sec)
                              setCurrentPage(1)
                            }}
                            className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                              sectionPill === sec
                                ? 'bg-[#5446a8] text-white shadow-xs'
                                : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                            }`}
                          >
                            {sec}
                          </button>
                        ))}

                        <span className="text-gray-300 mx-1 hidden sm:inline">|</span>

                        {/* Filtro por Estado de Veredicto */}
                        <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
                          Estado:
                        </span>
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'completed', label: 'Con Veredicto', color: 'bg-emerald-600' },
                          { id: 'pending', label: 'Pendientes', color: 'bg-amber-600' }
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setStatusToggle(st.id)
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              statusToggle === st.id
                                ? `${st.color || 'bg-[#2d2c38]'} text-white shadow-xs`
                                : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      {/* Buscador reactivo */}
                      <div className="relative">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                          }}
                          placeholder="Buscar carnet o nombre..."
                          className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-2xl bg-[#f8f7fc] border border-[#e2e0ed] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 text-[#2d2c38]"
                        />
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8a9f] text-[18px]">
                          search
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabla Principal de la Mesa de Veredicto - card-academy */}
                  <div className="card-academy overflow-hidden">
                    <div className="p-4 px-6 border-b border-[#eceaf6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-white via-[#fbfbfb] to-[#f4f1fd]/50">
                      <div>
                        <h3 className="font-heading font-black text-sm text-[#2d2c38] flex items-center gap-2">
                          <span>Nómina para Veredicto Definitivo</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e9e3ff] text-[#5446a8] font-black">
                            {filteredStudents.length} alumnos filtrados
                          </span>
                        </h3>
                        <p className="text-xs text-[#8e8a9f] mt-0.5">
                          Calculando con ponderaciones dinámicas: <strong>{diagnosticConfig?.weights?.platform ?? 60}% Plataforma</strong> + <strong>{diagnosticConfig?.weights?.oral ?? 40}% Oral</strong>.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentSection('diagnostic_config')}
                        className="px-3.5 py-2 rounded-2xl bg-[#f8f7fc] hover:bg-[#ede9f7] text-[#2d2c38] font-black text-xs flex items-center gap-1.5 transition-all border border-[#e2e0ed] cursor-pointer self-start sm:self-auto"
                        title="Modificar ponderaciones y cortes institucionales"
                      >
                        <span className="material-symbols-outlined text-[17px] text-[#8a70d6]">tune</span>
                        <span>Configurar Ponderaciones</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-[#eceaf6] text-[11px] font-black uppercase text-[#8e8a9f] bg-[#fbfbfb]">
                            <th className="py-4 px-4 font-black">Alumno / Carnet</th>
                            <th className="py-4 px-3 font-black">Grado / Sec.</th>
                            <th className="py-4 px-3 text-center font-black">Nivel Previo</th>
                            <th className="py-4 px-3 text-center font-black">Plataforma ({diagnosticConfig?.weights?.platform ?? 60}%)</th>
                            <th className="py-4 px-3 text-center font-black">Oral ({diagnosticConfig?.weights?.oral ?? 40}%)</th>
                            <th className="py-4 px-3 text-center font-black">Nota Global</th>
                            <th className="py-4 px-3 text-center font-black">Nivel Oficial</th>
                            <th className="py-4 px-3 text-center font-black">Evolución</th>
                            <th className="py-4 px-3 font-black">Maestro</th>
                            <th className="py-4 px-4 text-right font-black">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eceaf6]/60">
                          {paginatedStudents.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="text-center py-14 text-[#8e8a9f] text-xs italic">
                                No se encontraron alumnos con los filtros seleccionados.
                              </td>
                            </tr>
                          ) : (
                            paginatedStudents.map((s) => {
                              const hasOfficial = Boolean(s.assignedLevel)
                              const oralEval = evaluations.find(ev => (ev.studentEmail || '').toLowerCase() === (s.email || '').toLowerCase())

                              // 1. Cálculo dinámico de plataforma según completedExams
                              const completed = s.completedExams || {}
                              const examEntries = Object.entries(completed)
                              let totalQuestions = 0
                              let totalCorrect = 0
                              let sumPercent = 0
                              examEntries.forEach(([_, exData]) => {
                                if (typeof exData.scorePercent === 'number') {
                                  sumPercent += exData.scorePercent
                                } else if (exData.totalQuestions && exData.correctCount != null) {
                                  totalQuestions += exData.totalQuestions
                                  totalCorrect += exData.correctCount
                                }
                              })
                              const platformPercent = examEntries.length > 0
                                ? (totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : Math.round(sumPercent / examEntries.length))
                                : 0

                              // 2. Cálculo dinámico de oral
                              const oralPercent = oralEval
                                ? (typeof oralEval.oralScorePercent === 'number'
                                    ? oralEval.oralScorePercent
                                    : typeof oralEval.score === 'number'
                                    ? oralEval.score
                                    : typeof oralEval.scorePercent === 'number'
                                    ? oralEval.scorePercent
                                    : (oralEval.finalLevel === 'A1' ? 40 : oralEval.finalLevel === 'A2' ? 60 : oralEval.finalLevel === 'B1' ? 80 : oralEval.finalLevel === 'B2' ? 95 : 100))
                                : (typeof s.oralScorePercent === 'number' ? s.oralScorePercent : (typeof s.oralInterviewScore === 'number' ? s.oralInterviewScore : 0))

                              // 3. Nota ponderada según configuración dinámica
                              const wP = (diagnosticConfig?.weights?.platform ?? 60) / 100
                              const wO = (diagnosticConfig?.weights?.oral ?? 40) / 100
                              const globalWeightedScore = Math.min(100, Math.max(0, Math.round((platformPercent * wP) + (oralPercent * wO))))

                              // Nivel previo (antes de la prueba)
                              const isSixth = (s.grade || '').includes('6°') || s.codigoGrado === '06' || s.codigoGrado === '6'
                              const prevLevel = isSixth ? 'Asignación 7°' : (s.currentLevel && s.currentLevel !== 'Sin Nivel' ? s.currentLevel : '-')

                              // Comparativa de progreso
                              const newLevel = s.assignedLevel || null

                              return (
                                <tr key={s.id || s.carnet} className="table-academy-row">
                                  {/* Alumno */}
                                  <td className="py-3 px-4">
                                    <div className="font-extrabold text-[#2d2c38]">{s.name}</div>
                                    <div className="text-[11px] text-[#8e8a9f] font-mono">{s.carnet} • {s.email}</div>
                                  </td>

                                  {/* Grado y Sección */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed]">
                                      {s.grade || s.codigoGrado || '-'} {s.section || ''}
                                    </span>
                                  </td>

                                  {/* Nivel Previo (Antes) */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    {isSixth ? (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f8f7fc] text-[#585567] border border-[#eceaf6]">
                                        Asignación 7°
                                      </span>
                                    ) : s.currentLevel && s.currentLevel !== 'Sin Nivel' ? (
                                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-[#f8f7fc] text-[#2d2c38] border border-[#e2e0ed]">
                                        {s.currentLevel}
                                      </span>
                                    ) : (
                                      <span className="text-[#8e8a9f] text-xs">-</span>
                                    )}
                                  </td>

                                  {/* Plataforma con % dinámico */}
                                  <td className="py-3 px-3 text-center">
                                    {examEntries.length > 0 ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                        {platformPercent}%
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-[#8e8a9f] italic">Pendiente</span>
                                    )}
                                  </td>

                                  {/* Oral con % dinámico */}
                                  <td className="py-3 px-3 text-center">
                                    {oralEval || s.oralInterviewScore != null || s.oralScorePercent != null ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#f4f1fd] text-[#7052c9] border border-[#e2e0ed]">
                                        {oralPercent}%
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-[#8e8a9f] italic">Sin evaluar</span>
                                    )}
                                  </td>

                                  {/* Nota Global Ponderada */}
                                  <td className="py-3 px-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                                      globalWeightedScore >= (diagnosticConfig?.cutoffs?.intermediateMax || 75)
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : globalWeightedScore >= (diagnosticConfig?.cutoffs?.basicMax || 45)
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                    }`}>
                                      {globalWeightedScore}%
                                    </span>
                                  </td>

                                  {/* Nivel Asignado Oficial (Veredicto) */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    {hasOfficial ? (
                                      <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                                        {s.assignedLevel}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Pendiente
                                      </span>
                                    )}
                                  </td>

                                  {/* Indicador de Progreso / Evolución */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    {hasOfficial ? (
                                      !prevLevel || prevLevel === '-' || isSixth ? (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                          <span>★ Inicial</span>
                                        </span>
                                      ) : newLevel > prevLevel || (newLevel.includes('B') && prevLevel.includes('A')) ? (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200" title={`Avanzó de ${prevLevel} a ${newLevel}`}>
                                          <span className="material-symbols-outlined text-[13px] text-emerald-600">trending_up</span>
                                          <span>Mejoró</span>
                                        </span>
                                      ) : newLevel === prevLevel ? (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200" title={`Mantiene nivel ${newLevel}`}>
                                          <span className="material-symbols-outlined text-[13px] text-blue-600">equal</span>
                                          <span>Mantuvo</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#585567] bg-[#f8f7fc] px-2 py-0.5 rounded-md border border-[#e2e0ed]" title={`Ajuste pedagógico de ${prevLevel} a ${newLevel}`}>
                                          <span className="material-symbols-outlined text-[13px] text-[#8e8a9f]">sync_alt</span>
                                          <span>Ajustado</span>
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[#8e8a9f] text-xs">-</span>
                                    )}
                                  </td>

                                  {/* Maestro Asignado */}
                                  <td className="py-3 px-3 whitespace-nowrap text-[#585567] text-xs">
                                    {s.assignedTeacher ? (
                                      <span className="inline-flex items-center gap-1 font-semibold text-[#2d2c38]">
                                        <span>👨‍🏫</span>
                                        <span>{s.assignedTeacher}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[#8e8a9f] italic">Sin asignar</span>
                                    )}
                                  </td>

                                  {/* Acción */}
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedVerdictStudent(s)}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs transition-all ${
                                        hasOfficial
                                          ? 'bg-[#f8f7fc] hover:bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed]'
                                          : 'bg-gradient-to-r from-[#8a70d6] to-[#7052c9] hover:from-[#7a60c7] hover:to-[#5e41b5] text-white shadow-[#8a70d6]/20'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">gavel</span>
                                      <span>{hasOfficial ? 'Editar Veredicto' : 'Emitir Veredicto'}</span>
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINACIÓN VEREDICTO */}
                    <div className="p-4 border-t border-[#eceaf6] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                      <span className="text-xs text-[#8e8a9f]">
                        Página <strong className="text-[#2d2c38]">{currentPage}</strong> de <strong className="text-[#2d2c38]">{totalPages}</strong> ({filteredStudents.length} total)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(1)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                        >
                          Anterior
                        </button>
                        <span className="px-3 py-1.5 text-xs font-extrabold text-[#7052c9] bg-[#f4f1fd] rounded-xl border border-[#e2e0ed]">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className="px-3 py-1.5 rounded-xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                        >
                          Siguiente
                        </button>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN ANALYTICS: DASHBOARD ANALÍTICO INSTITUCIONAL */}
              {currentSection === 'analytics' && (
                <AnalyticsDashboard
                  students={students}
                  evaluations={evaluations}
                  academic={academic}
                  onResetStudent={handleResetStudent}
                  onUnlockExam={handleUnlockExam}
                  onClearFraud={handleClearFraud}
                  isTeacherView={true}
                  teacherName={currentTeacher?.name || user?.name || ''}
                />
              )}

              {/* SECCIÓN 2: RESULTADOS Y NIVELES (DASHBOARD COMPLETO) */}
              {currentSection === 'results' && (
                <div className="space-y-6">
                  {/* KPI DASHBOARD CARDS SEGÚN MATRIZ OFICIAL DE LIBROS Y GRUPOS */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {/* Tarjeta Total Evaluados */}
                    <div className="card-academy p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8e8a9f]">Evaluados</span>
                        <div className="w-8 h-8 rounded-xl bg-[#f4f1fd] text-[#7052c9] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-[#2d2c38]">{evaluations.length}</span>
                        <span className="text-[11px] text-[#8e8a9f] block mt-0.5">de {students.length} alumnos</span>
                      </div>
                    </div>

                    {/* Tarjeta Grupo Básico (0-40%) */}
                    <div className="card-academy p-4 flex flex-col justify-between border-amber-200 bg-gradient-to-br from-white to-amber-50/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Grupo Básico</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px]">0 - 40%</span>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-amber-900">{matrixCounts['basic'] || 0}</span>
                        <span className="text-[11px] text-amber-700 font-medium block mt-0.5">
                          {evaluations.length ? Math.round(((matrixCounts['basic'] || 0) / evaluations.length) * 100) : 0}% • L1-A / L2-A / L3-A
                        </span>
                      </div>
                    </div>

                    {/* Tarjeta Grupo Intermedio (41-70%) */}
                    <div className="card-academy p-4 flex flex-col justify-between border-indigo-200 bg-gradient-to-br from-white to-indigo-50/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Grupo Intermedio</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-[10px]">41 - 70%</span>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-indigo-900">{matrixCounts['intermediate'] || 0}</span>
                        <span className="text-[11px] text-indigo-700 font-medium block mt-0.5">
                          {evaluations.length ? Math.round(((matrixCounts['intermediate'] || 0) / evaluations.length) * 100) : 0}% • L1-B / L2-B / L3-B / L4-A
                        </span>
                      </div>
                    </div>

                    {/* Tarjeta Grupo Avanzado (≥71%) */}
                    <div className="card-academy p-4 flex flex-col justify-between border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Grupo Avanzado</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">≥ 71%</span>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-emerald-900">{matrixCounts['advanced'] || 0}</span>
                        <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                          {evaluations.length ? Math.round(((matrixCounts['advanced'] || 0) / evaluations.length) * 100) : 0}% • L2 / L3 / L4-A / L5-A
                        </span>
                      </div>
                    </div>

                    {/* Tarjeta Tiempo Promedio */}
                    <div className="card-academy p-4 flex flex-col justify-between border-slate-200 bg-gradient-to-br from-white to-slate-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Duración Prom.</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px]">timer</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-slate-900">
                          {avgDurationMinutes > 0 ? `${avgDurationMinutes} min` : `${Math.round(totalEvaluatedTime / (evaluations.length || 1))}s`}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block mt-0.5">por entrevista oral</span>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE FILTROS Y BÚSQUEDA */}
                  <div className="card-academy p-5 space-y-3.5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h2 className="font-heading font-black text-base text-[#2d2c38] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#7052c9] text-[22px]">bar_chart</span>
                          <span>Panel de Resultados y Ubicación Oficial en Matriz</span>
                        </h2>
                        <p className="text-xs text-[#8e8a9f]">
                          Niveles y libros asignados según el marco curricular institucional (L1-A a L5-A) y puntaje ponderado global.
                        </p>
                      </div>

                      {/* Controles de Búsqueda y Generación de Reportes */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Buscador de alumnos en resultados */}
                        <div className="relative w-full sm:w-60">
                          <input
                            type="text"
                            value={resultsSearch}
                            onChange={(e) => {
                              setResultsSearch(e.target.value)
                              setResultsPage(1)
                            }}
                            placeholder="Buscar por nombre, carnet..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#eceaf6] text-xs focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 bg-[#f8f7fc] text-[#2d2c38]"
                          />
                          <span className="material-symbols-outlined text-[18px] text-[#8e8a9f] absolute left-3 top-1/2 -translate-y-1/2">
                            search
                          </span>
                        </div>

                        {/* Botón Imprimir Acta Oficial (PDF) */}
                        <button
                          type="button"
                          onClick={() => handleOpenPrintActa(filteredEvaluations)}
                          disabled={filteredEvaluations.length === 0}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#5446a8] hover:from-[#1b1c8f] hover:to-[#43378d] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Generar Acta Oficial con membrete del Colegio Salesiano San José para imprimir o guardar como PDF"
                        >
                          <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
                          <span>Acta Oficial (PDF)</span>
                        </button>

                        {/* Botón Exportar a Excel (CSV) */}
                        <button
                          type="button"
                          onClick={() => handleExportCSV(filteredEvaluations, `Acta_Ingles_${resultsGradeFilter !== 'all' ? resultsGradeFilter + 'Grado_' : ''}2026.csv`)}
                          disabled={filteredEvaluations.length === 0}
                          className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Descargar datos tabulados en formato CSV compatible con Microsoft Excel"
                        >
                          <span className="material-symbols-outlined text-[17px]">table_view</span>
                          <span>Exportar Excel</span>
                        </button>
                      </div>
                    </div>

                    {/* SELECTORES DE FILTRO RÁPIDO */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#eceaf6]">
                      {/* Filtro por Categoría y Niveles de la Matriz Oficial */}
                      <div className="flex items-center gap-1.5 bg-[#f8f7fc] p-1 rounded-2xl border border-[#eceaf6]">
                        <span className="text-[10px] font-bold text-[#8e8a9f] uppercase px-2">Categoría Matriz:</span>
                        {[
                          { key: 'all', label: 'Todos' },
                          { key: 'basic', label: 'Básico (0-40%)' },
                          { key: 'intermediate', label: 'Intermedio (41-70%)' },
                          { key: 'advanced', label: 'Avanzado (≥71%)' }
                        ].map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => {
                              setResultsLevelFilter(cat.key)
                              setResultsPage(1)
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                              resultsLevelFilter === cat.key
                                ? 'bg-[#5446a8] text-white shadow-xs'
                                : 'text-[#585567] hover:bg-white hover:text-[#2d2c38]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Filtro por Grado */}
                      <div className="flex items-center gap-1.5 bg-[#f8f7fc] p-1 rounded-2xl border border-[#eceaf6]">
                        <span className="text-[10px] font-bold text-[#8e8a9f] uppercase px-2">Grado:</span>
                        {['all', '6', '7', '8', '9', '10', '11'].map((gr) => (
                          <button
                            key={gr}
                            type="button"
                            onClick={() => {
                              setResultsGradeFilter(gr)
                              setResultsPage(1)
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                              resultsGradeFilter === gr
                                ? 'bg-[#5446a8] text-white shadow-xs'
                                : 'text-[#585567] hover:bg-white hover:text-[#2d2c38]'
                            }`}
                          >
                            {gr === 'all' ? 'Todos' : `${gr}°`}
                          </button>
                        ))}
                      </div>

                      {/* Filtro por Docente Evaluador */}
                      <div className="flex items-center gap-1.5 bg-[#f8f7fc] p-1 rounded-2xl border border-[#eceaf6]">
                        <span className="text-[10px] font-bold text-[#8e8a9f] uppercase px-2">Docente:</span>
                        {[
                          { key: 'all', label: 'Todos' },
                          { key: 'ronald', label: 'Ronald' },
                          { key: 'silvia', label: 'Silvia' },
                          { key: 'nelsi', label: 'Nelsi' },
                          { key: 'edgar', label: 'Edgar' }
                        ].map((t) => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => {
                              setResultsTeacherFilter(t.key)
                              setResultsPage(1)
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                              resultsTeacherFilter === t.key
                                ? 'bg-[#5446a8] text-white shadow-xs'
                                : 'text-[#585567] hover:bg-white hover:text-[#2d2c38]'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Reset Filtros */}
                      {(resultsLevelFilter !== 'all' || resultsGradeFilter !== 'all' || resultsTeacherFilter !== 'all' || resultsSearch) && (
                        <button
                          type="button"
                          onClick={() => {
                            setResultsLevelFilter('all')
                            setResultsGradeFilter('all')
                            setResultsTeacherFilter('all')
                            setResultsSearch('')
                            setResultsPage(1)
                          }}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold text-[#8e8a9f] hover:text-red-600 hover:bg-red-50 flex items-center gap-1 transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">clear</span>
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TABLA DE EVALUACIONES CON BOTÓN DE DETALLES */}
                  <div className="card-academy overflow-hidden">
                    <div className="p-4 border-b border-[#eceaf6] flex items-center justify-between bg-[#fbfbfb]">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-black text-sm text-[#2d2c38]">
                          Actas de Evaluación ({filteredEvaluations.length})
                        </h3>
                        <span className="text-[11px] text-[#8e8a9f]">
                          {filteredEvaluations.length === evaluations.length ? 'Total registradas' : `Filtradas de ${evaluations.length}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8e8a9f] hidden sm:inline">
                        Haz clic en <strong>"Ver Detalles"</strong> para consultar el desglose pregunta por pregunta.
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-[#eceaf6] text-[11px] font-black uppercase text-[#8e8a9f] bg-[#fbfbfb]">
                            <th className="py-3 px-3">Carnet</th>
                            <th className="py-3 px-3">Estudiante</th>
                            <th className="py-3 px-3 text-center">Grado</th>
                            <th className="py-3 px-3 text-center">Nivel Matriz (Grupo)</th>
                            <th className="py-3 px-3 text-center">Puntaje Global (%)</th>
                            <th className="py-3 px-3">Docente Evaluador</th>
                            <th className="py-3 px-3 text-center">Duración</th>
                            <th className="py-3 px-3">Fecha</th>
                            <th className="py-3 px-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eceaf6]/60">
                          {paginatedEvaluations.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="py-12 text-center text-[#8e8a9f] text-xs italic">
                                No se encontraron actas con los filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            paginatedEvaluations.map((ev, i) => {
                              const placement = getEvaluationPlacementData(ev)
                              const groupBadgeColors = {
                                'L1-A': 'bg-amber-50 text-amber-900 border-amber-300',
                                'L1-B': 'bg-indigo-50 text-indigo-900 border-indigo-300',
                                'L2': 'bg-emerald-50 text-emerald-900 border-emerald-300',
                                'L2-A': 'bg-amber-50 text-amber-900 border-amber-300',
                                'L2-B': 'bg-indigo-50 text-indigo-900 border-indigo-300',
                                'L3': 'bg-emerald-50 text-emerald-900 border-emerald-300',
                                'L3-A': 'bg-amber-50 text-amber-900 border-amber-300',
                                'L3-B': 'bg-indigo-50 text-indigo-900 border-indigo-300',
                                'L4-A': 'bg-purple-50 text-purple-900 border-purple-300',
                                'L5-A': 'bg-rose-50 text-rose-900 border-rose-300',
                                'L5-B': 'bg-pink-50 text-pink-900 border-pink-300'
                              }
                              const colorClass = groupBadgeColors[placement.group] || 'bg-[#f4f1fd] text-[#5446a8] border-[#e2e0ed]'

                              return (
                                <tr key={ev.id || i} className="table-academy-row">
                                  <td className="py-3.5 px-3 font-mono font-bold text-[#585567]">
                                    {ev.studentCarnet || 'N/A'}
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <div className="font-extrabold text-[#2d2c38]">{ev.studentName}</div>
                                    <div className="text-[11px] text-[#8e8a9f] font-mono truncate max-w-xs">{ev.studentEmail}</div>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#f4f1fd] font-bold text-xs text-[#5446a8] border border-[#e2e0ed]">
                                      {ev.grade} {ev.section}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className={`inline-block px-3 py-1 rounded-xl font-black text-xs border shadow-2xs ${colorClass}`}>
                                        {placement.group}
                                      </span>
                                      <span className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                        {placement.categoryLabel} • {placement.cefr}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs border ${
                                      placement.scorePercent >= 71 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                      placement.scorePercent >= 41 ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                                      'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}>
                                      {placement.scorePercent}%
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <div className="font-medium text-[#2d2c38] flex items-center gap-1">
                                      <span className="text-xs">👨‍🏫</span>
                                      <span>{ev.teacherName || ev.teacherEmail}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-3 text-center font-mono text-xs text-[#585567]">
                                    {ev.durationFormatted || `${ev.totalDurationSeconds}s`}
                                  </td>
                                  <td className="py-3.5 px-3 text-[11px] text-[#8e8a9f] whitespace-nowrap">
                                    {ev.completedAt ? new Date(ev.completedAt).toLocaleString('es-SV') : 'Hoy'}
                                  </td>
                                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* BOTÓN NOTIFICAR POR TEAMS */}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenTeamsComposer(ev)}
                                        className="px-2.5 py-1.5 rounded-xl bg-[#eef3fc] hover:bg-[#dbe6fa] text-[#4b53bc] font-bold text-xs border border-[#cfd9f5] transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                        title={`Redactar y enviar mensaje directo a ${ev.studentName} por Microsoft Teams`}
                                      >
                                        <span className="text-[14px]">💬</span>
                                        <span>Teams</span>
                                      </button>

                                      {/* BOTÓN VEREDICTO FINAL */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const matchedStudent = students.find(s => (s.email || '').toLowerCase() === (ev.studentEmail || '').toLowerCase()) || {
                                            name: ev.studentName,
                                            email: ev.studentEmail,
                                            carnet: ev.studentCarnet,
                                            grade: ev.grade,
                                            section: ev.section
                                          }
                                          setSelectedVerdictStudent(matchedStudent)
                                        }}
                                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                        title="Revisar notas consolidadas y emitir veredicto final"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">gavel</span>
                                        <span>Veredicto</span>
                                      </button>

                                      {/* BOTÓN VER DETALLES DE RÚBRICA */}
                                      <button
                                        type="button"
                                        onClick={() => setSelectedEvaluationDetail(ev)}
                                        className="px-3 py-1.5 rounded-xl bg-[#f4f1fd] hover:bg-[#e9e3ff] text-[#5446a8] font-bold text-xs border border-[#e2e0ed] transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                                        title="Ver preguntas y desglose de rúbrica"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                                        <span>Detalles</span>
                                      </button>

                                      {/* BOTÓN ELIMINAR EVALUACIÓN */}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEvaluation(ev)}
                                        className="p-1.5 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                        title={`Eliminar evaluación de ${ev.studentName} y resetear a Sin Evaluar`}
                                      >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINACIÓN DE RESULTADOS */}
                    <div className="p-4 border-t border-[#eceaf6] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                      <span className="text-xs text-[#8e8a9f]">
                        Página <strong className="text-[#2d2c38]">{resultsPage}</strong> de <strong className="text-[#2d2c38]">{resultsTotalPages}</strong> ({filteredEvaluations.length} evaluados mostrados)
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={resultsPage <= 1}
                          onClick={() => setResultsPage(1)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          disabled={resultsPage <= 1}
                          onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                        >
                          Anterior
                        </button>
                        <span className="px-3 py-1.5 text-xs font-extrabold text-[#7052c9] bg-[#f4f1fd] rounded-xl border border-[#e2e0ed]">
                          {resultsPage} / {resultsTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={resultsPage >= resultsTotalPages}
                          onClick={() => setResultsPage(p => Math.min(resultsTotalPages, p + 1))}
                          className="px-3 py-1.5 rounded-xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                        >
                          Siguiente
                        </button>
                        <button
                          type="button"
                          disabled={resultsPage >= resultsTotalPages}
                          onClick={() => setResultsPage(resultsTotalPages)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#eceaf6] text-xs font-bold text-[#585567] hover:bg-[#f8f7fc] disabled:opacity-30 cursor-pointer"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ================= MODAL DE DETALLES DEL ALUMNO / RÚBRICA ================= */}
                  {selectedEvaluationDetail && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                      <div className="bg-white rounded-4xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-[#eceaf6] animate-scaleUp">
                        {/* Cabecera del modal */}
                        <div className="bg-gradient-to-r from-[#2d2454] via-[#5446a8] to-[#7052c9] p-6 text-white flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-[#1a1926] font-black text-[10px] tracking-wider uppercase">
                                Acta de Evaluación Oral Oficial
                              </span>
                              <span className="text-xs text-[#e9e3ff]">
                                {selectedEvaluationDetail.completedAt ? new Date(selectedEvaluationDetail.completedAt).toLocaleString('es-SV') : 'Hoy'}
                              </span>
                            </div>
                            <h3 className="font-heading font-black text-2xl text-white mt-1">
                              {selectedEvaluationDetail.studentName}
                            </h3>
                            <div className="text-xs text-[#e9e3ff] font-mono flex items-center gap-3 mt-1 flex-wrap">
                              <span>Carnet: <strong>{selectedEvaluationDetail.studentCarnet || 'N/A'}</strong></span>
                              <span>·</span>
                              <span>{selectedEvaluationDetail.grade} {selectedEvaluationDetail.section}</span>
                              <span>·</span>
                              <span>Docente: <strong>{selectedEvaluationDetail.teacherName || selectedEvaluationDetail.teacherEmail}</strong></span>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedEvaluationDetail(null)}
                              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                            {(() => {
                              const p = getEvaluationPlacementData(selectedEvaluationDetail)
                              return (
                                <div className="px-4 py-1.5 rounded-2xl bg-white/15 border border-white/20 text-center">
                                  <span className="text-[10px] uppercase font-bold text-slate-200 block">Nivel Matriz (Grupo)</span>
                                  <span className="font-heading font-black text-2xl text-amber-300">
                                    {p.group}
                                  </span>
                                  <span className="text-[10px] text-white/80 font-semibold block">
                                    {p.categoryLabel} • {p.scorePercent}%
                                  </span>
                                </div>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Cuerpo scrollable con rúbricas */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
                          {/* Ficha resumen */}
                          {(() => {
                            const p = getEvaluationPlacementData(selectedEvaluationDetail)
                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-200/80">
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Puntaje Global</span>
                                  <span className="font-mono font-black text-lg text-indigo-700">
                                    {p.scorePercent}%
                                  </span>
                                  <span className="text-[10px] text-gray-400 block">{p.categoryLabel}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Grupo Matriz</span>
                                  <span className="text-base font-extrabold text-[#2528b7]">
                                    {p.group}
                                  </span>
                                  <span className="text-[10px] text-gray-500 block">MCER: {p.cefr}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tiempo Entrevista</span>
                                  <span className="font-mono font-bold text-sm text-gray-800">
                                    {selectedEvaluationDetail.durationFormatted || `${selectedEvaluationDetail.totalDurationSeconds} seg`}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Docente Evaluador</span>
                                  <span className="text-xs font-semibold text-gray-800 truncate block">
                                    {selectedEvaluationDetail.teacherName || selectedEvaluationDetail.teacherEmail}
                                  </span>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Detalle por niveles evaluados */}
                          {selectedEvaluationDetail.levelsEvaluated && Object.keys(selectedEvaluationDetail.levelsEvaluated).length > 0 ? (
                            Object.entries(selectedEvaluationDetail.levelsEvaluated).map(([lvlKey, lvlData]) => {
                              const criteriaLabels = {
                                pronunciation: 'Pronunciación y Fonética',
                                fluency: 'Fluidez y Ritmo',
                                vocabulary: 'Vocabulario y Recursos',
                                grammar: 'Gramática y Precisión',
                                comprehension: 'Comprensión Auditiva',
                                communicative: 'Eficacia Comunicativa'
                              }

                              return (
                                <div key={lvlKey} className="bg-white rounded-2xl p-5 border border-gray-200 space-y-4 shadow-2xs">
                                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-1 rounded-xl bg-indigo-50 font-black text-sm text-[#2528b7] border border-indigo-200">
                                        Nivel {lvlKey}
                                      </span>
                                      <span className="text-xs text-gray-500 font-medium">
                                        Puntaje registrado: <strong>{lvlData.scoreTotal ?? 0} pts</strong>
                                      </span>
                                    </div>
                                    {lvlKey === selectedEvaluationDetail.finalLevel && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">check</span>
                                        Nivel Consolidado
                                      </span>
                                    )}
                                  </div>

                                  {/* Observaciones si las hay */}
                                  {lvlData.comments && (
                                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                                      <span className="font-bold block mb-0.5 text-amber-800">📝 Observaciones del Docente:</span>
                                      <p className="italic">"{lvlData.comments}"</p>
                                    </div>
                                  )}

                                  {/* Preguntas y rúbricas */}
                                  {lvlData.questions && Object.keys(lvlData.questions).length > 0 && (
                                    <div className="space-y-3">
                                      {Object.entries(lvlData.questions).map(([qIdx, scores]) => {
                                        let qSum = 0
                                        return (
                                          <div key={qIdx} className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px] text-[#2528b7]">question_answer</span>
                                                <span>Pregunta #{Number(qIdx) + 1}</span>
                                              </span>
                                              <span className="text-xs font-mono font-bold text-indigo-900">
                                                Subtotal: {Object.values(scores).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)} / 20 pts
                                              </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                              {Object.entries(scores).map(([critKey, val]) => (
                                                <div key={critKey} className="bg-white p-2.5 rounded-lg border border-gray-200 flex items-center justify-between text-xs">
                                                  <span className="text-gray-600 truncate pr-2 font-medium">
                                                    {criteriaLabels[critKey] || critKey}
                                                  </span>
                                                  <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[11px] shrink-0 ${
                                                    val === 4 ? 'bg-emerald-100 text-emerald-800' :
                                                    val === 3 ? 'bg-blue-100 text-blue-800' :
                                                    val === 2 ? 'bg-amber-100 text-amber-800' :
                                                    'bg-red-100 text-red-800'
                                                  }`}>
                                                    {val} / 4 pts
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <div className="p-8 text-center text-gray-400 italic bg-white rounded-2xl border border-gray-200 text-xs">
                              No hay detalles específicos de rúbrica registrados para esta evaluación.
                            </div>
                          )}

                          {/* SECCIÓN ADICIONAL: ACTIVIDADES DE PLATAFORMA Y LISTENING CON BOTÓN DE RESET */}
                          {(() => {
                            const evalEmail = (selectedEvaluationDetail.studentEmail || '').toLowerCase()
                            const targetStudent = students.find(s => (s.email || '').toLowerCase() === evalEmail) || selectedEvaluationDetail
                            const compExams = targetStudent.completedExams || {}
                            const examEntries = Object.entries(compExams)

                            return (
                              <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between border-b border-indigo-50 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[20px] text-[#5446a8]">headphones</span>
                                    <div>
                                      <h4 className="font-heading font-black text-xs text-[#2d2c38] uppercase tracking-wider">
                                        Pruebas Digitales de Plataforma & Listening ({examEntries.length})
                                      </h4>
                                      <span className="text-[10px] text-gray-400">
                                        Permite al docente reiniciar actividades individuales (ej: Listening) para que el alumno las repita.
                                      </span>
                                    </div>
                                  </div>
                                  {examEntries.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleUnlockExam(targetStudent, null)}
                                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                                      title="Resetear todas las actividades de plataforma para este alumno"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                                      <span>Resetear Todas</span>
                                    </button>
                                  )}
                                </div>

                                {examEntries.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-gray-400 bg-slate-50 rounded-xl border border-dashed border-gray-200 italic">
                                    El alumno no tiene pruebas de plataforma ni de listening completadas actualmente.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {examEntries.map(([eid, edata]) => {
                                      const isListening = eid.toLowerCase().includes('listening') || (edata.examTitle || '').toLowerCase().includes('listening') || (edata.examTitle || '').toLowerCase().includes('audio')
                                      return (
                                        <div
                                          key={eid}
                                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                                            isListening ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/70 border-slate-200'
                                          }`}
                                        >
                                          <div className="min-w-0 flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-[18px] shrink-0 ${isListening ? 'text-indigo-600' : 'text-slate-600'}`}>
                                              {isListening ? 'headphones' : 'assignment'}
                                            </span>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-gray-800 truncate block">
                                                  {edata.examTitle || eid.replace('exam_official_', '').replace(/_/g, ' ')}
                                                </span>
                                                {isListening && (
                                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                    Listening
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-[10px] text-gray-400">
                                                {edata.completedAt ? new Date(edata.completedAt).toLocaleString('es-SV') : 'Completado'}
                                                {edata.byTimeout ? ' • Por tiempo' : ''}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            {edata.score !== undefined && (
                                              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                                {edata.score}%
                                              </span>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => handleUnlockExam(targetStudent, eid)}
                                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                              title="Resetear esta actividad para que el alumno pueda realizarla de nuevo"
                                            >
                                              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                                              <span>Resetear {isListening ? 'Listening' : 'Actividad'}</span>
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>

                        {/* Footer modal */}
                        <div className="bg-white p-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Deseas eliminar la evaluación de ${selectedEvaluationDetail.studentName} y reiniciar su nivel a Sin Evaluar?`)) {
                                handleDeleteEvaluation(selectedEvaluationDetail)
                                setSelectedEvaluationDetail(null)
                              }
                            }}
                            className="px-3 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 text-xs font-bold border border-red-200 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            Eliminar Acta
                          </button>

                          <div className="flex items-center gap-2">
                            {/* Botón notificar por Teams */}
                            <button
                              type="button"
                              onClick={() => handleOpenTeamsComposer(selectedEvaluationDetail)}
                              className="px-3.5 py-2 rounded-xl bg-[#eef3fc] hover:bg-[#dbe6fa] text-[#4b53bc] text-xs font-bold border border-[#cfd9f5] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                              title="Abrir editor de mensaje en Teams con nivel institucional oficial"
                            >
                              <span>💬</span>
                              <span>Notificar en Teams</span>
                            </button>

                            {/* Botón Imprimir Ficha Oficial */}
                            <button
                              type="button"
                              onClick={() => handleOpenPrintActa([selectedEvaluationDetail])}
                              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                              title="Imprimir acta individual para el expediente del estudiante"
                            >
                              <span className="material-symbols-outlined text-[16px]">print</span>
                              <span>Imprimir Ficha</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedEvaluationDetail(null)}
                              className="px-6 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              Cerrar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* SECCIÓN NUEVA: BITÁCORA Y ALERTAS DE FRAUDE / SALIDA DE PESTAÑA (COMBINADA A + B) */}
              {currentSection === 'security_audit' && (
                <div className="space-y-6">
                  {/* Encabezado y resumen métrico */}
                  <div className="bg-gradient-to-r from-[#ffeef2] via-[#fff5f7] to-[#fbfbfb] rounded-4xl p-6 sm:p-7 border border-[#ffd5df] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-3xl bg-white border border-[#ffd5df] text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[32px]">shield</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-heading font-black text-xl text-[#2d2c38]">
                            Supervisión de Seguridad y Antifraude
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                            Tiempo Real
                          </span>
                        </div>
                        <p className="text-xs text-[#8e8a9f] mt-1 font-medium">
                          Detección y auditoría de salidas de pantalla, cambios de ventana y bloqueos durante las pruebas digitales.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={loadData}
                        className="px-4 py-2 rounded-2xl bg-white hover:bg-[#f8f7fc] text-xs font-bold text-[#5446a8] transition-all flex items-center gap-1.5 cursor-pointer border border-[#eceaf6] shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">sync</span>
                        <span>Actualizar Datos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentSection('interview')}
                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#8a70d6] to-[#7052c9] hover:from-[#7a60c7] hover:to-[#5e41b5] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#8a70d6]/20"
                      >
                        <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                        <span>Ir a Entrevistas</span>
                      </button>
                    </div>
                  </div>

                  {/* Cálculo previo de incidencias globales y por grado */}
                  {(() => {
                    let totalIncidentsCount = 0
                    let autoSubmittedByFraud = 0
                    const allFlaggedStudents = []

                    students.forEach(s => {
                      const comp = s.completedExams || {}
                      let studentWarnings = 0
                      let hasAutoSubmit = false
                      Object.values(comp).forEach(c => {
                        const count = c.warningsCount || (c.incidents?.length || 0)
                        studentWarnings += count
                        if (c.byTimeout || count >= 3) hasAutoSubmit = true
                      })
                      if (studentWarnings > 0) {
                        totalIncidentsCount += studentWarnings
                        allFlaggedStudents.push(s)
                      }
                      if (hasAutoSubmit) autoSubmittedByFraud++
                    })

                    const gradesDef = [
                      { id: '6', label: '6° Grado', fullTitle: '6° Grado (Educación Básica)' },
                      { id: '7', label: '7° Grado', fullTitle: '7° Grado (Educación Básica)' },
                      { id: '8', label: '8° Grado', fullTitle: '8° Grado (Educación Básica)' },
                      { id: '9', label: '9° Grado', fullTitle: '9° Grado (Tercer Ciclo)' },
                      { id: '10', label: '1° Bachillerato', fullTitle: '1° Bachillerato (10° Grado)' },
                      { id: '11', label: '2° Bachillerato', fullTitle: '2° Bachillerato (11° Grado)' }
                    ]

                    // Filtrar estudiantes para la tabla según los controles A+B
                    const filteredFlaggedStudents = allFlaggedStudents.filter(s => {
                      // Filtro de grado
                      if (fraudGradeFilter !== 'all') {
                        const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
                        let match = false
                        if (fraudGradeFilter === '6') match = gStr.includes('6°') || s.codigoGrado === '06'
                        else if (fraudGradeFilter === '7') match = gStr.includes('7°') || s.codigoGrado === '07'
                        else if (fraudGradeFilter === '8') match = gStr.includes('8°') || s.codigoGrado === '08'
                        else if (fraudGradeFilter === '9') match = gStr.includes('9°') || s.codigoGrado === '09'
                        else if (fraudGradeFilter === '10') match = gStr.includes('10°') || gStr.includes('1° Bach') || s.codigoGrado === '10'
                        else if (fraudGradeFilter === '11') match = gStr.includes('11°') || gStr.includes('2° Bach') || s.codigoGrado === '11' || gStr.includes('12°') || s.codigoGrado === '32'
                        if (!match) return false
                      }

                      // Filtro de sección
                      if (fraudSectionFilter !== 'all' && s.section !== fraudSectionFilter) return false

                      // Total de advertencias del alumno
                      const comp = s.completedExams || {}
                      let warnings = 0
                      let hasAuto = false
                      Object.values(comp).forEach(c => {
                        const count = c.warningsCount || (c.incidents?.length || 0)
                        warnings += count
                        if (c.byTimeout || count >= 3) hasAuto = true
                      })

                      // Filtro de severidad (Semáforo)
                      if (fraudSeverityFilter === 'critical' && warnings < 3 && !hasAuto) return false
                      if (fraudSeverityFilter === 'medium' && warnings !== 2) return false
                      if (fraudSeverityFilter === 'low' && warnings !== 1) return false

                      // Búsqueda
                      if (fraudSearchTerm) {
                        const term = fraudSearchTerm.toLowerCase()
                        const matchName = (s.name || '').toLowerCase().includes(term)
                        const matchCarnet = (s.carnet || '').includes(term)
                        const matchEmail = (s.email || '').toLowerCase().includes(term)
                        if (!matchName && !matchCarnet && !matchEmail) return false
                      }

                      return true
                    })

                    // Paginación para la tabla de Fraudes
                    const totalFraudPages = Math.max(1, Math.ceil(filteredFlaggedStudents.length / fraudPageSize))
                    const paginatedFlaggedStudents = filteredFlaggedStudents.slice(
                      (fraudPage - 1) * fraudPageSize,
                      fraudPage * fraudPageSize
                    )

                    return (
                      <>
                        {/* Tarjetas KPI de Fraude */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="card-academy p-5 border-rose-200/80 bg-gradient-to-br from-white to-rose-50/20 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                                Alumnos Observados
                              </span>
                              <span className="font-heading font-black text-2xl text-rose-900 mt-1 block">
                                {allFlaggedStudents.length}
                              </span>
                              <span className="text-[11px] text-[#8e8a9f]">De {students.length} alumnos totales</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[26px]">person_alert</span>
                            </div>
                          </div>

                          <div className="card-academy p-5 border-amber-200/80 bg-gradient-to-br from-white to-amber-50/20 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                                Total de Salidas Registradas
                              </span>
                              <span className="font-heading font-black text-2xl text-amber-900 mt-1 block">
                                {totalIncidentsCount}
                              </span>
                              <span className="text-[11px] text-[#8e8a9f]">En todas las pruebas digitales</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[26px]">tab_unselected</span>
                            </div>
                          </div>

                          <div className="card-academy p-5 border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/20 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                                Alumnos 100% Limpios
                              </span>
                              <span className="font-heading font-black text-2xl text-emerald-900 mt-1 block">
                                {Math.max(0, students.length - allFlaggedStudents.length)}
                              </span>
                              <span className="text-[11px] text-[#8e8a9f]">Sin alertas ni salidas no autorizadas</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[26px]">verified_user</span>
                            </div>
                          </div>
                        </div>

                        {/* COMPONENTE B: NAVEGADOR DE AUDITORÍA POR GRADO */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-[#585567] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[18px] text-[#7052c9]">domain</span>
                              <span>Estado de Seguridad por Grado</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFraudGradeFilter('all')
                                setFraudPage(1)
                              }}
                              className={`text-xs font-black px-3 py-1 rounded-xl transition-all cursor-pointer ${
                                fraudGradeFilter === 'all'
                                  ? 'bg-[#5446a8] text-white shadow-xs'
                                  : 'bg-white text-[#585567] hover:bg-[#f4f1fd] border border-[#eceaf6]'
                              }`}
                            >
                              Ver Todos los Grados
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {gradesDef.map(g => {
                              // Estudiantes de este grado con incidencias
                              const gradeFlagged = allFlaggedStudents.filter(s => {
                                const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
                                if (g.id === '6') return gStr.includes('6°') || s.codigoGrado === '06'
                                if (g.id === '7') return gStr.includes('7°') || s.codigoGrado === '07'
                                if (g.id === '8') return gStr.includes('8°') || s.codigoGrado === '08'
                                if (g.id === '9') return gStr.includes('9°') || s.codigoGrado === '09'
                                if (g.id === '10') return gStr.includes('10°') || gStr.includes('1° Bach') || s.codigoGrado === '10'
                                if (g.id === '11') return gStr.includes('11°') || gStr.includes('2° Bach') || s.codigoGrado === '11' || gStr.includes('12°') || s.codigoGrado === '32'
                                return false
                              })

                              const isSelected = fraudGradeFilter === g.id
                              const count = gradeFlagged.length

                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => {
                                    setFraudGradeFilter(isSelected ? 'all' : g.id)
                                    setFraudPage(1)
                                  }}
                                  className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer border relative flex flex-col justify-between ${
                                    isSelected
                                      ? 'bg-[#5446a8] text-white border-[#5446a8] shadow-md ring-2 ring-[#e9e3ff]'
                                      : count > 0
                                      ? 'bg-rose-50/50 hover:bg-rose-50 text-[#2d2c38] border-rose-200'
                                      : 'bg-white hover:bg-[#f8f7fc] text-[#2d2c38] border-[#eceaf6]'
                                  }`}
                                >
                                  <div>
                                    <span className={`text-[10px] font-black uppercase block ${isSelected ? 'text-white/80' : 'text-[#8e8a9f]'}`}>
                                      {g.label}
                                    </span>
                                    <span className="font-heading font-black text-lg block mt-0.5">
                                      {count} {count === 1 ? 'Alerta' : 'Alertas'}
                                    </span>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-bold">
                                    {count === 0 ? (
                                      <span className={`flex items-center gap-1 ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                        Limpio
                                      </span>
                                    ) : (
                                      <span className={`flex items-center gap-1 ${isSelected ? 'text-rose-200' : 'text-rose-700'}`}>
                                        <span className="material-symbols-outlined text-[13px]">warning</span>
                                        Observado
                                      </span>
                                    )}
                                    <span className="material-symbols-outlined text-[14px]">
                                      {isSelected ? 'expand_less' : 'arrow_forward'}
                                    </span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* COMPONENTE A: BARRA DE FILTROS ÁGILES (SEMÁFORO DE SEVERIDAD + SECCIÓN + BUSCADOR) */}
                        <div className="card-academy p-4 px-5 space-y-3 bg-white">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Semáforo de Severidad */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
                                Severidad:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFraudSeverityFilter('all')
                                  setFraudPage(1)
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  fraudSeverityFilter === 'all'
                                    ? 'bg-[#2d2c38] text-white shadow-xs'
                                    : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                                }`}
                              >
                                Todas ({allFlaggedStudents.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFraudSeverityFilter('critical')
                                  setFraudPage(1)
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                  fraudSeverityFilter === 'critical'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                                title="3 o más salidas, o examen entregado automáticamente por fraude"
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                                <span>🔴 Crítica (3+ o Bloqueo)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFraudSeverityFilter('medium')
                                  setFraudPage(1)
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                  fraudSeverityFilter === 'medium'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                                <span>🟠 Media (2 salidas)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFraudSeverityFilter('low')
                                  setFraudPage(1)
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                  fraudSeverityFilter === 'low'
                                    ? 'bg-yellow-500 text-white shadow-xs'
                                    : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                                <span>🟡 Leve (1 salida)</span>
                              </button>
                            </div>

                            {/* Buscador Rápido */}
                            <div className="relative w-full md:w-64">
                              <input
                                type="text"
                                value={fraudSearchTerm}
                                onChange={(e) => {
                                  setFraudSearchTerm(e.target.value)
                                  setFraudPage(1)
                                }}
                                placeholder="Buscar carnet o nombre..."
                                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#eceaf6] text-xs focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 bg-[#f8f7fc] text-[#2d2c38]"
                              />
                              <span className="material-symbols-outlined text-[17px] text-[#8e8a9f] absolute left-2.5 top-1/2 -translate-y-1/2">
                                search
                              </span>
                            </div>
                          </div>

                          {/* Fila secundaria: Sección + Botón de Acción Masiva */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-[#eceaf6]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-black text-[#8e8a9f] uppercase tracking-wider mr-1">
                                Sección:
                              </span>
                              {['all', 'A', 'B', 'C', 'D'].map(sec => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => {
                                    setFraudSectionFilter(sec)
                                    setFraudPage(1)
                                  }}
                                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    fraudSectionFilter === sec
                                      ? 'bg-[#5446a8] text-white shadow-xs'
                                      : 'bg-[#f8f7fc] text-[#585567] hover:bg-[#f4f1fd] border border-[#e2e0ed]'
                                  }`}
                                >
                                  {sec === 'all' ? 'Todas' : sec}
                                </button>
                              ))}

                              {fraudGradeFilter !== 'all' && (
                                <span className="ml-2 px-2.5 py-0.5 rounded-lg bg-[#e9e3ff] text-[#5446a8] text-[11px] font-black">
                                  Filtrando: {gradesDef.find(g => g.id === fraudGradeFilter)?.label}
                                </span>
                              )}
                            </div>

                            {/* Botón de Acción Masiva: Resetear Alertas de la Vista Filtrada */}
                            {filteredFlaggedStudents.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleBatchClearFraud(filteredFlaggedStudents, fraudGradeFilter !== 'all' ? `del ${gradesDef.find(g => g.id === fraudGradeFilter)?.label}` : 'los alumnos filtrados')}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-black border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                                title="Limpiar todas las alertas de fraude para los alumnos visibles en este filtro"
                              >
                                <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                                <span>Limpiar Alertas de esta Lista ({filteredFlaggedStudents.length})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* TABLA DE AUDITORÍA DETALLADA */}
                        <div className="card-academy overflow-hidden bg-white shadow-sm">
                          <div className="p-4 px-6 border-b border-[#eceaf6] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-white to-[#f4f1fd]/40">
                            <div className="flex items-center gap-2">
                              <h3 className="font-heading font-black text-sm text-[#2d2c38]">
                                Bitácora de Estudiantes Observados ({filteredFlaggedStudents.length})
                              </h3>
                              <span className="text-[11px] text-[#8e8a9f]">
                                (Despliega la ficha o pulsa "Ver Registro")
                              </span>
                            </div>
                            <span className="text-xs font-black text-[#5446a8] bg-[#e9e3ff] px-3 py-1 rounded-full shadow-xs self-start sm:self-auto">
                              Página {fraudPage} de {totalFraudPages}
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs md:text-sm">
                              <thead>
                                <tr className="border-b border-[#eceaf6] text-[11px] font-black uppercase text-[#8e8a9f] bg-[#fbfbfb]">
                                  <th className="py-3.5 px-4 font-black">Estudiante</th>
                                  <th className="py-3.5 px-3 text-center font-black">Grado</th>
                                  <th className="py-3.5 px-3 text-center font-black">Secc.</th>
                                  <th className="py-3.5 px-4 font-black">Docente Titular</th>
                                  <th className="py-3.5 px-4 text-center font-black">Severidad / Alertas</th>
                                  <th className="py-3.5 px-4 text-center font-black">Incidencias</th>
                                  <th className="py-3.5 px-4 text-right font-black">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#eceaf6]/60">
                                {paginatedFlaggedStudents.length === 0 ? (
                                  <tr>
                                    <td colSpan="7" className="py-14 text-center text-[#8e8a9f] text-xs italic">
                                      <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-[36px] text-emerald-500">check_circle</span>
                                        <span className="font-bold text-[#2d2c38]">Sin incidencias con los criterios seleccionados</span>
                                        <span className="text-[#8e8a9f]">No se encontraron alumnos con alertas para este grado, sección o nivel de severidad.</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedFlaggedStudents.map(s => {
                                    const completed = s.completedExams || {}
                                    let totalWarnings = 0
                                    let hasAutoSubmit = false
                                    const examBreakdown = []

                                    Object.entries(completed).forEach(([eid, edata]) => {
                                      const count = edata.warningsCount || (edata.incidents?.length || 0)
                                      if (count > 0 || edata.byTimeout) {
                                        totalWarnings += count
                                        if (edata.byTimeout || count >= 3) hasAutoSubmit = true
                                        const cleanTitle = edata.examTitle || (eid.toLowerCase().includes('listening') ? 'Listening' : eid)
                                        examBreakdown.push({
                                          id: eid,
                                          title: cleanTitle,
                                          count,
                                          byTimeout: edata.byTimeout,
                                          score: edata.score,
                                          scorePercent: edata.scorePercent,
                                          completedAt: edata.completedAt,
                                          incidents: edata.incidents || []
                                        })
                                      }
                                    })

                                    const isCritical = totalWarnings >= 3 || hasAutoSubmit
                                    const isMedium = totalWarnings === 2
                                    const isLow = totalWarnings === 1
                                    const isExpanded = expandedFraudStudentId === (s.id || s.email || s.carnet)

                                    return (
                                      <React.Fragment key={s.id || s.email || s.carnet}>
                                        <tr className={`table-academy-row transition-colors ${
                                          isExpanded ? 'bg-amber-50/50' : isCritical ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-[#fbfafd]'
                                        }`}>
                                          {/* Columna Estudiante */}
                                          <td className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                              <button
                                                type="button"
                                                onClick={() => setExpandedFraudStudentId(isExpanded ? null : (s.id || s.email || s.carnet))}
                                                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                                  isExpanded ? 'bg-[#5446a8] text-white shadow-xs rotate-180' : 'bg-[#f4f1fd] text-[#5446a8] hover:bg-[#e9e3ff]'
                                                }`}
                                                title={isExpanded ? 'Cerrar sub-tabla de pruebas' : 'Ver sub-tabla con el detalle de pruebas e incidencias'}
                                              >
                                                <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                              </button>
                                              <div>
                                                <div className="font-extrabold text-[#2d2c38]">{s.name}</div>
                                                <div className="text-[11px] text-[#8e8a9f] font-mono flex items-center gap-1.5">
                                                  <span className="font-bold text-[#585567]">{s.carnet || 'S/C'}</span>
                                                  <span>•</span>
                                                  <span className="truncate max-w-xs">{s.email}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </td>

                                          <td className="py-3 px-3 text-center whitespace-nowrap">
                                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#f4f1fd] font-black text-xs text-[#5446a8] border border-[#e2e0ed]">
                                              {s.grade || s.codigoGrado || '-'}
                                            </span>
                                          </td>

                                          <td className="py-3 px-3 text-center font-black text-xs text-[#585567] whitespace-nowrap">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100">
                                              {s.section || 'A'}
                                            </span>
                                          </td>

                                          <td className="py-3 px-4 text-[#2d2c38] font-medium text-xs whitespace-nowrap">
                                            {s.assignedTeacher ? (
                                              <span className="inline-flex items-center gap-1 text-xs text-[#585567]">
                                                <span>👨‍🏫</span>
                                                <span>{s.assignedTeacher}</span>
                                              </span>
                                            ) : (
                                              <span className="text-[#8e8a9f] italic">Sin asignar</span>
                                            )}
                                          </td>

                                          {/* Severidad y Semáforo */}
                                          <td className="py-3 px-4 text-center whitespace-nowrap">
                                            {isCritical ? (
                                              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[15px]">gpp_bad</span>
                                                <span>{totalWarnings} (Crítica / Bloqueo)</span>
                                              </span>
                                            ) : isMedium ? (
                                              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                <span>{totalWarnings} salidas (Media)</span>
                                              </span>
                                            ) : (
                                              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-yellow-50 text-yellow-800 border border-yellow-300 inline-flex items-center gap-1 shadow-2xs">
                                                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                                <span>{totalWarnings} salida (Leve)</span>
                                              </span>
                                            )}
                                          </td>

                                          {/* Resumen Compacto: Botón para abrir Sub-Tabla */}
                                          <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <button
                                              type="button"
                                              onClick={() => setExpandedFraudStudentId(isExpanded ? null : (s.id || s.email || s.carnet))}
                                              className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                                isExpanded
                                                  ? 'bg-[#5446a8] text-white shadow-xs'
                                                  : 'bg-[#f4f1fd] hover:bg-[#e9e3ff] text-[#5446a8] border border-[#d8ceff]'
                                              }`}
                                            >
                                              <span className="material-symbols-outlined text-[15px]">table_rows</span>
                                              <span>{examBreakdown.length} {examBreakdown.length === 1 ? 'Prueba' : 'Pruebas'}</span>
                                              <span className="text-[10px] opacity-80">({totalWarnings} sal.)</span>
                                            </button>
                                          </td>

                                          {/* Acciones */}
                                          <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => handleClearFraud(s, null)}
                                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                                title="Resetear y limpiar las alertas de fraude y salidas de pestaña de este alumno"
                                              >
                                                <span className="material-symbols-outlined text-[15px]">cleaning_services</span>
                                                <span>Reset Fraude</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleUnlockExam(s, null)}
                                                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                                title="Habilitar / Desbloquear exámenes para este alumno"
                                              >
                                                <span className="material-symbols-outlined text-[15px]">lock_open</span>
                                                <span>Desbloquear</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setSelectedStudentSecurityDetail(s)}
                                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8a70d6] to-[#7052c9] hover:from-[#7a60c7] hover:to-[#5e41b5] text-white text-xs font-black transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                              >
                                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                                                <span>Ver Registro</span>
                                              </button>
                                            </div>
                                          </td>
                                        </tr>

                                        {/* SUB-TABLA INTEGRADA DE INCIDENCIAS POR PRUEBA */}
                                        {isExpanded && (
                                          <tr className="bg-slate-50/80 border-b border-[#ffd5df]">
                                            <td colSpan="7" className="p-4 px-6">
                                              <div className="rounded-2xl bg-white border border-[#eceaf6] shadow-md overflow-hidden">
                                                {/* Header de la Sub-Tabla */}
                                                <div className="p-3.5 px-5 bg-gradient-to-r from-rose-50/70 via-white to-[#f4f1fd]/50 border-b border-[#eceaf6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[18px] text-rose-600">table_chart</span>
                                                    <h4 className="text-xs font-black text-[#2d2c38] uppercase">
                                                      Sub-Tabla de Pruebas Observadas · {s.name} ({s.carnet || 'S/C'})
                                                    </h4>
                                                  </div>
                                                  <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-[#8e8a9f]">Total acumulado:</span>
                                                    <span className="font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                                                      {totalWarnings} salidas de pestaña
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* Contenido de la Sub-Tabla */}
                                                <div className="overflow-x-auto">
                                                  <table className="w-full text-left text-xs">
                                                    <thead>
                                                      <tr className="bg-[#fbfafd] border-b border-[#eceaf6] text-[10px] font-black uppercase text-[#8e8a9f]">
                                                        <th className="py-2.5 px-4 font-black">Prueba Digital</th>
                                                        <th className="py-2.5 px-3 text-center font-black">Salidas</th>
                                                        <th className="py-2.5 px-3 text-center font-black">Estado / Causa</th>
                                                        <th className="py-2.5 px-4 font-black">Horarios Registrados</th>
                                                        <th className="py-2.5 px-4 text-right font-black">Acción por Prueba</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#eceaf6]/60">
                                                      {examBreakdown.map((ex, idx) => (
                                                        <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                                                          {/* Prueba */}
                                                          <td className="py-3 px-4 font-bold text-[#2d2c38]">
                                                            <div className="flex items-center gap-2">
                                                              <span className="material-symbols-outlined text-[16px] text-[#7052c9]">quiz</span>
                                                              <div>
                                                                <span className="font-extrabold text-xs text-[#2d2c38]">{ex.title}</span>
                                                                <span className="text-[10px] text-[#8e8a9f] block font-mono">ID: {ex.id}</span>
                                                              </div>
                                                            </div>
                                                          </td>

                                                          {/* Contador de Salidas */}
                                                          <td className="py-3 px-3 text-center whitespace-nowrap">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                                                              ex.count >= 3
                                                                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                                                : ex.count === 2
                                                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                                : 'bg-yellow-100 text-yellow-900 border-yellow-300'
                                                            }`}>
                                                              {ex.count} salida(s)
                                                            </span>
                                                          </td>

                                                          {/* Estado / Bloqueo */}
                                                          <td className="py-3 px-3 text-center whitespace-nowrap">
                                                            {ex.byTimeout || ex.count >= 3 ? (
                                                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">lock</span>
                                                                <span>Auto-Entregado</span>
                                                              </span>
                                                            ) : (
                                                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                Advertencia de foco
                                                              </span>
                                                            )}
                                                          </td>

                                                          {/* Bitácora de Horas */}
                                                          <td className="py-3 px-4">
                                                            {ex.incidents && ex.incidents.length > 0 ? (
                                                              <div className="flex flex-wrap gap-1 max-w-sm">
                                                                {ex.incidents.map((inc, iIdx) => (
                                                                  <span key={iIdx} className="px-2 py-0.5 rounded bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed] font-mono text-[10px]">
                                                                    #{inc.count || iIdx + 1}: {inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString('es-SV') : 'Detectada'}
                                                                  </span>
                                                                ))}
                                                              </div>
                                                            ) : (
                                                              <span className="text-[11px] text-[#8e8a9f] italic">
                                                                Registrada durante la sesión de examen.
                                                              </span>
                                                            )}
                                                          </td>

                                                          {/* Botón para perdonar solo esta prueba */}
                                                          <td className="py-3 px-4 text-right whitespace-nowrap">
                                                            <button
                                                              type="button"
                                                              onClick={() => handleClearFraud(s, ex.id)}
                                                              className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-800 text-[11px] font-bold border border-rose-200 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                                              title={`Limpiar y perdonar alertas únicamente para ${ex.title}`}
                                                            >
                                                              <span className="material-symbols-outlined text-[14px]">cleaning_services</span>
                                                              <span>Limpiar esta prueba</span>
                                                            </button>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>

                                                {/* Footer de la Sub-Tabla */}
                                                <div className="p-3 px-5 bg-[#faf9fc] border-t border-[#eceaf6] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                  <div className="text-[#8e8a9f]">
                                                    Docente asignado: <strong className="text-[#2d2c38]">{s.assignedTeacher || 'Sin asignar'}</strong> · Sección {s.section || 'A'}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleClearFraud(s, null)}
                                                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                                    >
                                                      <span className="material-symbols-outlined text-[15px]">cleaning_services</span>
                                                      <span>Resetear Todas las Pruebas</span>
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => setSelectedStudentSecurityDetail(s)}
                                                      className="px-3 py-1.5 rounded-xl bg-[#5446a8] hover:bg-[#43368b] text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                                    >
                                                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                                      <span>Ver Auditoría Completa</span>
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* PAGINACIÓN DE FRAUDES */}
                          <div className="p-4 px-6 border-t border-[#eceaf6] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                            <span className="text-xs font-semibold text-[#8e8a9f]">
                              Página <strong className="text-[#2d2c38] font-black">{fraudPage}</strong> de <strong className="text-[#2d2c38] font-black">{totalFraudPages}</strong> ({filteredFlaggedStudents.length} con alertas)
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={fraudPage <= 1}
                                onClick={() => setFraudPage(1)}
                                className="px-3 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f4f1fd] disabled:opacity-30 cursor-pointer"
                              >
                                «
                              </button>
                              <button
                                type="button"
                                disabled={fraudPage <= 1}
                                onClick={() => setFraudPage(p => Math.max(1, p - 1))}
                                className="px-3.5 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f4f1fd] disabled:opacity-30 cursor-pointer"
                              >
                                Anterior
                              </button>

                              <div className="flex items-center gap-1 mx-1">
                                {Array.from({ length: Math.min(5, totalFraudPages) }, (_, i) => {
                                  let pageNum = fraudPage
                                  if (totalFraudPages <= 5) pageNum = i + 1
                                  else if (fraudPage <= 3) pageNum = i + 1
                                  else if (fraudPage >= totalFraudPages - 2) pageNum = totalFraudPages - 4 + i
                                  else pageNum = fraudPage - 2 + i

                                  return (
                                    <button
                                      key={pageNum}
                                      type="button"
                                      onClick={() => setFraudPage(pageNum)}
                                      className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer ${
                                        fraudPage === pageNum
                                          ? 'bg-[#5446a8] text-white shadow-xs'
                                          : 'text-[#585567] hover:bg-[#f4f1fd]'
                                      }`}
                                    >
                                      {pageNum}
                                    </button>
                                  )
                                })}
                              </div>

                              <button
                                type="button"
                                disabled={fraudPage >= totalFraudPages}
                                onClick={() => setFraudPage(p => Math.min(totalFraudPages, p + 1))}
                                className="px-3.5 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f4f1fd] disabled:opacity-30 cursor-pointer"
                              >
                                Siguiente
                              </button>
                              <button
                                type="button"
                                disabled={fraudPage >= totalFraudPages}
                                onClick={() => setFraudPage(totalFraudPages)}
                                className="px-3 py-1.5 rounded-xl border border-[#e2e0ed] text-xs font-black text-[#585567] hover:bg-[#f4f1fd] disabled:opacity-30 cursor-pointer"
                              >
                                »
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* SECCIÓN 3: CONSTRUCTOR WIZARD */}
              {/* SECCIÓN: BANCO DE PREGUNTAS ORALES (A1 - C1) */}
              {currentSection === 'interview_questions' && (
                <InterviewQuestionsBankManager />
              )}

              {/* SECCIÓN DEDICADA: PANEL DE CONTROL DE PRUEBAS DIGITALES, HABILITACIÓN Y PAUSA POR GRADOS */}
              {currentSection === 'exam_dispatch' && (
                <GradeDispatchHub
                  students={students}
                  dispatchConfig={dispatchConfig}
                  onSetGradeStatus={async (grade, examType, status) => {
                    try {
                      const teacherName = currentTeacher?.name || currentTeacher?.email || 'Docente'
                      const teacherEmail = currentTeacher?.email || ''
                      const updated = await setGradeExamStatus(grade, examType, status, teacherName, teacherEmail)
                      setDispatchConfig(updated)
                    } catch (e) {
                      alert('Error al actualizar estado del grado: ' + e.message)
                    }
                  }}
                  onSetStudentStatus={async (studentEmail, examType, status) => {
                    try {
                      const updated = await setStudentExamStatus(studentEmail, examType, status, currentTeacher?.name || currentTeacher?.email || 'Docente')
                      setDispatchConfig(updated)
                    } catch (e) {
                      alert('Error al actualizar estado del alumno: ' + e.message)
                    }
                  }}
                  onResetGradeOverrides={async (grade, studentEmails) => {
                    try {
                      const updated = await resetGradeExamOverrides(grade, studentEmails, currentTeacher?.name || currentTeacher?.email || 'Docente')
                      setDispatchConfig(updated)
                    } catch (e) {
                      alert('Error al restablecer excepciones: ' + e.message)
                    }
                  }}
                  onCallInterviewStudent={(st) => {
                    handleStartInterview(st)
                    setCurrentSection('interview')
                  }}
                  onUnlockStudentExam={handleUnlockExam}
                  onViewStudentSecurity={(st) => setSelectedStudentSecurityDetail(st)}
                  onToggleStudentLevelVisibility={async (grade, isVisible) => {
                    try {
                      const teacherName = currentTeacher?.name || currentTeacher?.email || 'Docente'
                      const updated = await setGradeStudentLevelVisibility(grade, isVisible, teacherName)
                      setDispatchConfig(updated)
                    } catch (e) {
                      alert('Error al actualizar visibilidad de nivel para el grado: ' + e.message)
                    }
                  }}
                  currentTeacher={currentTeacher}
                />
              )}

              {/* SECCIÓN 3: CONSTRUCTOR DE EXAMEN */}
              {currentSection === 'builder' && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
                  <ExamBuilder onPublished={() => setCurrentSection('interview')} />
                </div>
              )}

              {/* SECCIÓN NUEVA: PONDERACIONES Y CORTES 2026 */}
              {currentSection === 'diagnostic_config' && (
                <DiagnosticConfigManager
                  canEdit={true}
                  onConfigSaved={(updatedCfg) => {
                    setDiagnosticConfig(updatedCfg)
                  }}
                />
              )}

              {/* SECCIÓN 4: MI PERFIL DOCENTE */}
              {currentSection === 'profile' && (
                <TeacherProfile
                  user={currentTeacher}
                  onProfileUpdated={(updated) => {
                    setCurrentTeacher(updated)
                    onUpdateCurrentUser?.(updated)
                    try {
                      const cur = JSON.parse(localStorage.getItem('el_session_user') || '{}')
                      localStorage.setItem('el_session_user', JSON.stringify({ ...cur, ...updated }))
                    } catch (e) {
                      console.warn(e)
                    }
                  }}
                />
              )}

              {/* MODAL DETALLADO DE AUDITORÍA Y SEGURIDAD / FRAUDE */}
              {selectedStudentSecurityDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                  <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp text-left">
                    {/* Header modal */}
                    <div className="p-5 bg-gradient-to-r from-rose-900 to-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-rose-300">
                          <span className="material-symbols-outlined text-[24px]">security</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading font-black text-base md:text-lg">
                              Bitácora de Seguridad del Alumno
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/30 text-rose-200 border border-rose-400/30">
                              Antifraude
                            </span>
                          </div>
                          <p className="text-xs text-rose-200/80">
                            {selectedStudentSecurityDetail.name} · Carnet: {selectedStudentSecurityDetail.carnet || 'N/A'} · Grado: {selectedStudentSecurityDetail.grade || selectedStudentSecurityDetail.codigoGrado || '-'} {selectedStudentSecurityDetail.section || ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedStudentSecurityDetail(null)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>

                    {/* Contenido con listado de incidencias y tests */}
                    <div className="p-6 overflow-y-auto space-y-5 flex-1">
                      {/* Resumen */}
                      {(() => {
                        const completed = selectedStudentSecurityDetail.completedExams || {}
                        const examKeys = Object.keys(completed)
                        const totalWarnings = Object.values(completed).reduce(
                          (acc, c) => acc + (c.warningsCount || (c.incidents?.length || 0)),
                          0
                        )

                        return (
                          <>
                            <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-rose-600 text-[28px]">report_problem</span>
                                <div>
                                  <span className="text-xs font-black text-rose-900 block">
                                    {totalWarnings > 0
                                      ? `${totalWarnings} incidencia(s) detectadas en los tests digitales`
                                      : 'Examen completado con total integridad (sin alertas)'}
                                  </span>
                                  <span className="text-[11px] text-rose-700">
                                    {totalWarnings >= 3
                                      ? '⚠️ El alumno alcanzó el umbral máximo de advertencias durante la sesión.'
                                      : totalWarnings > 0
                                      ? 'Se registraron salidas de foco o cambios de pestaña durante el examen.'
                                      : 'El alumno permaneció dentro de la pestaña en todo momento.'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-black text-rose-800 bg-white px-3 py-1 rounded-xl border border-rose-200 self-start sm:self-auto">
                                {examKeys.length} test(s) presentados
                              </span>
                            </div>

                            {/* Desglose por test */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                Desglose de Pruebas y Eventos
                              </h4>

                              {examKeys.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 italic bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                                  El alumno aún no ha enviado ningún test digital.
                                </div>
                              ) : (
                                examKeys.map(k => {
                                  const data = completed[k] || {}
                                  const warnings = data.warningsCount || (data.incidents?.length || 0)
                                  const incidentsList = data.incidents || []

                                  return (
                                    <div key={k} className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="font-heading font-bold text-sm text-gray-900 uppercase">
                                            {data.examTitle || `Test: ${k}`}
                                          </span>
                                          {data.byTimeout && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                                              Auto-enviado por límite
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {data.score !== undefined && (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                                              Puntaje: {data.score}% ({data.correctCount || 0}/{data.totalQuestions || 0})
                                            </span>
                                          )}
                                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                                            warnings > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          }`}>
                                            {warnings > 0 ? `${warnings} salida(s)` : 'Limpio ✓'}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="text-[11px] text-gray-500 flex flex-wrap items-center justify-between gap-2">
                                        <span>Fecha envío: {data.completedAt ? new Date(data.completedAt).toLocaleString('es-SV') : 'Registrado'}</span>
                                        <div className="flex items-center gap-2">
                                          {/* Botón para Resetear Alertas de Fraude si tiene advertencias */}
                                          {warnings > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => handleClearFraud(selectedStudentSecurityDetail, k)}
                                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                              title="Limpiar y resetear a 0 las advertencias de fraude de este examen (conserva la nota)"
                                            >
                                              <span className="material-symbols-outlined text-[14px]">cleaning_services</span>
                                              <span>Resetear Fraude</span>
                                            </button>
                                          )}

                                          {/* Botón para Resetear / Desbloquear este examen */}
                                          <button
                                            type="button"
                                            onClick={() => handleUnlockExam(selectedStudentSecurityDetail, k)}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                            title="Resetear y habilitar este examen para que el alumno pueda realizarlo de nuevo"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                                            <span>Resetear Actividad ({k.toLowerCase().includes('listening') ? 'Listening' : 'Plataforma'})</span>
                                          </button>

                                          {/* Botón para ver u ocultar respuestas de preguntas */}
                                          {data.questionResponses?.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => setExpandedExamAnswers(prev => ({ ...prev, [k]: !prev[k] }))}
                                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                                            >
                                              <span className="material-symbols-outlined text-[14px]">
                                                {expandedExamAnswers[k] ? 'visibility_off' : 'quiz'}
                                              </span>
                                              <span>{expandedExamAnswers[k] ? 'Ocultar Preguntas' : `Ver Respuestas (${data.questionResponses.length})`}</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Listado de preguntas y respuestas del alumno para emitir veredicto docente */}
                                      {expandedExamAnswers[k] && data.questionResponses && (
                                        <div className="pt-2 border-t border-indigo-100 bg-indigo-50/30 p-3 rounded-xl space-y-2.5">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black uppercase text-indigo-950 flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[16px] text-indigo-600">fact_check</span>
                                              <span>Respuestas por Reactivo (Auditoría para Veredicto Docente)</span>
                                            </span>
                                            <span className="text-[10px] font-bold text-indigo-600">
                                              {data.correctCount || 0} de {data.questionResponses.length} correctas
                                            </span>
                                          </div>

                                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {data.questionResponses.map((qr, qIdx) => (
                                              <div
                                                key={qIdx}
                                                className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                                                  qr.isCorrect
                                                    ? 'bg-white border-emerald-200'
                                                    : 'bg-white border-rose-200'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                                      qr.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                    }`}>
                                                      #{qr.questionIndex || qIdx + 1}
                                                    </span>
                                                    <span className="font-bold text-gray-800">
                                                      {qr.prompt || qr.statement || 'Pregunta de evaluación'}
                                                    </span>
                                                  </div>
                                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                                    qr.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                  }`}>
                                                    {qr.isCorrect ? 'Correcta ✓' : 'Incorrecta ✗'}
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-100">
                                                  <div>
                                                    <span className="text-gray-400 block font-medium">Respuesta del Alumno:</span>
                                                    <span className={`font-semibold ${qr.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                      {qr.studentAnswer != null
                                                        ? (typeof qr.studentAnswer === 'object' ? JSON.stringify(qr.studentAnswer) : String(qr.studentAnswer))
                                                        : '(Sin responder)'}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-gray-400 block font-medium">Respuesta Correcta / Clave:</span>
                                                    <span className="font-semibold text-gray-700">
                                                      {qr.expectedAnswer ? String(qr.expectedAnswer) : 'N/A'}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Lista de incidentes detallados si existen */}
                                      {incidentsList.length > 0 && (
                                        <div className="pt-2 border-t border-gray-100 space-y-2">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                            Línea de tiempo de eventos:
                                          </span>
                                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {incidentsList.map((inc, incIdx) => (
                                              <div key={incIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                  <span className="material-symbols-outlined text-rose-500 text-[16px]">
                                                    {inc.type === 'tab_switch' ? 'tab_unselected' : 'open_in_browser'}
                                                  </span>
                                                  <div>
                                                    <span className="font-semibold text-gray-800 block">
                                                      {inc.description || 'Salida de la ventana del examen'}
                                                    </span>
                                                    {inc.questionIndex && (
                                                      <span className="text-[10px] text-gray-400">
                                                        Ocurrió en Pregunta #{inc.questionIndex}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-400 shrink-0">
                                                  {inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString('es-SV') : ''}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </>
                        )
                      })()}
                    </div>

                    {/* Footer modal */}
                    <div className="p-4 bg-slate-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleClearFraud(selectedStudentSecurityDetail, null)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Limpiar todas las alertas e incidencias de fraude de este alumno"
                        >
                          <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                          <span>Resetear Alertas de Fraude</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUnlockExam(selectedStudentSecurityDetail, null)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Desbloquear y habilitar todos los tests digitales para este alumno"
                        >
                          <span className="material-symbols-outlined text-[16px]">lock_open</span>
                          <span>Habilitar Todos los Tests Digitales</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleResetStudent(selectedStudentSecurityDetail)
                            setSelectedStudentSecurityDetail(null)
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Permitir que el alumno vuelva a ser evaluado o repetir"
                        >
                          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                          <span>Reiniciar Nivel Oficial</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedStudentSecurityDetail(null)}
                        className="px-6 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 360° DE VEREDICTO FINAL Y ASIGNACIÓN DE NIVEL */}
              {selectedVerdictStudent && (
                <FinalVerdictModal
                  student={selectedVerdictStudent}
                  oralEvaluation={evaluations.find(e => (e.studentEmail || '').toLowerCase() === (selectedVerdictStudent.email || '').toLowerCase())}
                  diagnosticConfig={diagnosticConfig}
                  currentTeacher={currentTeacher}
                  onSaveVerdict={handleSaveFinalVerdict}
                  onClose={() => setSelectedVerdictStudent(null)}
                />
              )}

              {/* MODAL DE ACTA OFICIAL IMPRIMIBLE / VISTA PREVIA (PDF / IMPRESIÓN) */}
              {actaToPrint && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto animate-fadeIn">
                  <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200">
                    {/* Header de la ventana de vista previa (no se imprime) */}
                    <div className="bg-gradient-to-r from-[#1d1b32] via-[#2d2454] to-[#5446a8] p-4 sm:p-5 text-white flex items-center justify-between no-print shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[24px] text-amber-300">description</span>
                        </div>
                        <div>
                          <h3 className="font-heading font-black text-base sm:text-lg">
                            Acta Oficial de Ubicación y Evaluación 2026
                          </h3>
                          <p className="text-xs text-indigo-200">
                            Colegio Salesiano San José • Vista previa de impresión oficial ({actaToPrint.totalStudents} estudiantes)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={triggerBrowserPrint}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">print</span>
                          <span>Imprimir / Guardar PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActaToPrint(null)}
                          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>
                    </div>

                    {/* Contenedor del documento imprimible oficial */}
                    <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white print-container font-sans text-gray-800">
                      {/* Membrete Institucional Oficial */}
                      <div className="border-b-2 border-gray-800 pb-5 mb-6 text-center">
                        <div className="text-[11px] font-black uppercase tracking-widest text-indigo-900 mb-1">
                          REPÚBLICA DE EL SALVADOR • MINISTERIO DE EDUCACIÓN, CIENCIA Y TECNOLOGÍA
                        </div>
                        <h1 className="font-serif font-black text-xl sm:text-2xl text-gray-900 tracking-wide uppercase">
                          COLEGIO SALESIANO SAN JOSÉ
                        </h1>
                        <div className="text-xs font-semibold uppercase text-gray-600 mt-1">
                          DEPARTAMENTO DE IDIOMAS EXTRANJEROS • EVALUACIÓN DIAGNÓSTICA DE INGLÉS 2026
                        </div>
                        <div className="inline-block mt-3 px-4 py-1 rounded-full bg-gray-100 text-gray-800 font-extrabold text-xs border border-gray-300 tracking-wide uppercase">
                          ACTA OFICIAL DE UBICACIÓN Y COMPETENCIAS MCER
                        </div>
                      </div>

                      {/* Metadatos del Acta */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs mb-6">
                        <div>
                          <span className="block text-[10px] font-bold text-gray-400 uppercase">Grado / Nivel:</span>
                          <span className="font-bold text-gray-900">{actaToPrint.grade}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-gray-400 uppercase">Filtro de Nivel:</span>
                          <span className="font-bold text-gray-900">{actaToPrint.level}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-gray-400 uppercase">Docente / Evaluador:</span>
                          <span className="font-bold text-gray-900">{actaToPrint.teacher}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-gray-400 uppercase">Fecha de Emisión:</span>
                          <span className="font-mono text-gray-900 font-semibold">{new Date(actaToPrint.generatedAt).toLocaleDateString('es-SV')}</span>
                        </div>
                      </div>

                      {/* Resumen de Distribución de Grupos según Matriz Oficial en el Acta */}
                      <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-white">
                        <div className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
                          Distribución de Ubicación Oficial en Matriz (Libros y Grupos):
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {['Básico (0-40%)', 'Intermedio (41-70%)', 'Avanzado (≥71%)'].map((catLabel, idx) => {
                            const catKey = idx === 0 ? 'basic' : idx === 1 ? 'intermediate' : 'advanced'
                            const count = actaToPrint.items.filter(it => getEvaluationPlacementData(it).category === catKey).length
                            return (
                              <div key={catKey} className="px-3 py-1 rounded-lg bg-gray-100 border border-gray-300 font-semibold text-gray-800">
                                <strong>{catLabel}:</strong> {count} alumnos ({actaToPrint.items.length ? Math.round((count / actaToPrint.items.length) * 100) : 0}%)
                              </div>
                            )
                          })}
                          <div className="ml-auto font-black text-gray-900">
                            Total Registros: {actaToPrint.items.length}
                          </div>
                        </div>
                      </div>

                      {/* Tabla del Acta Oficial */}
                      <div className="border border-gray-300 rounded-lg overflow-hidden mb-8">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-300 text-[10px] font-black uppercase text-gray-700">
                              <th className="py-2.5 px-3 w-10 text-center">N°</th>
                              <th className="py-2.5 px-3">Carnet</th>
                              <th className="py-2.5 px-3">Nombre Completo del Estudiante</th>
                              <th className="py-2.5 px-3 text-center">Grado / Secc.</th>
                              <th className="py-2.5 px-3 text-center">Nivel Matriz (Grupo)</th>
                              <th className="py-2.5 px-3 text-center">Puntaje Global (%)</th>
                              <th className="py-2.5 px-3 text-center">MCER</th>
                              <th className="py-2.5 px-3">Docente Evaluador</th>
                              <th className="py-2.5 px-3 text-center">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {actaToPrint.items.map((it, idx) => {
                              const p = getEvaluationPlacementData(it)
                              return (
                                <tr key={it.id || idx} className="hover:bg-gray-50/50">
                                  <td className="py-2 px-3 text-center font-mono text-gray-500">{idx + 1}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-gray-700">{it.studentCarnet || 'N/A'}</td>
                                  <td className="py-2 px-3 font-semibold text-gray-900">{it.studentName}</td>
                                  <td className="py-2 px-3 text-center text-gray-700">{it.grade} - {it.section}</td>
                                  <td className="py-2 px-3 text-center font-black">
                                    <span className="px-2 py-0.5 rounded border border-gray-400 bg-gray-50 text-gray-900 font-mono">
                                      {p.group}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono font-bold text-gray-800">
                                    {p.scorePercent}%
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono text-gray-600">
                                    {p.cefr}
                                  </td>
                                  <td className="py-2 px-3 text-gray-700 text-[11px] truncate max-w-xs">{it.teacherName || it.teacherEmail || 'Docente'}</td>
                                  <td className="py-2 px-3 text-center text-gray-500 font-mono text-[11px]">
                                    {it.completedAt ? new Date(it.completedAt).toLocaleDateString('es-SV') : 'Hoy'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Cláusula de Validez y Bloque de Firmas Oficiales */}
                      <div className="mt-12 pt-6 border-t border-gray-300 text-xs text-gray-600">
                        <p className="text-center italic text-[11px] mb-12">
                          Se hace constar que los resultados anteriores corresponden a la evaluación diagnóstica estandarizada, aplicada conforme al Marco Común Europeo de Referencia (MCER).
                        </p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-center pt-8">
                          <div>
                            <div className="border-t border-gray-500 pt-2 font-bold text-gray-800">
                              {actaToPrint.teacher}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase">Docente Evaluador / Titular</div>
                          </div>
                          <div>
                            <div className="border-t border-gray-500 pt-2 font-bold text-gray-800">
                              Coordinación Pedagógica
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase">Área de Inglés & Bilingüismo</div>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <div className="border-t border-gray-500 pt-2 font-bold text-gray-800">
                              Dirección Académica
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase">Colegio Salesiano San José</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer del Modal (no se imprime) */}
                    <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between no-print">
                      <span className="text-xs text-gray-500">
                        Presiona <strong>"Imprimir / Guardar PDF"</strong> para abrir el diálogo del navegador y guardar en formato PDF oficial.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={triggerBrowserPrint}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#5446a8] text-white font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[17px]">print</span>
                          <span>Imprimir Acta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActaToPrint(null)}
                          className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-black text-white font-bold text-xs transition-all cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL EDITOR / COMPOSER DE MENSAJE PARA MICROSOFT TEAMS */}
              {teamsModalData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                  <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-gray-200 animate-scaleUp flex flex-col">
                    {/* Header del modal con branding Teams */}
                    <div className="bg-[#464eb8] p-5 text-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-xl shadow-xs">
                          💬
                        </div>
                        <div>
                          <h3 className="font-heading font-black text-base text-white">
                            Notificar Resultado por Microsoft Teams
                          </h3>
                          <p className="text-xs text-indigo-100">
                            Para: <strong>{teamsModalData.studentName}</strong> ({teamsModalData.studentEmail})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTeamsModalData(null)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>

                    {/* Resumen de Ubicación y Nivel Institucional */}
                    <div className="p-5 space-y-4 flex-1 bg-slate-50">
                      <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 flex items-center justify-between shadow-2xs">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Nivel Matriz Asignado ({teamsModalData.grade})
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-heading font-black text-xl text-[#464eb8]">
                              {teamsModalData.groupLevel}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                              {teamsModalData.categoryLabel} ({teamsModalData.scorePercent}%)
                            </span>
                            {teamsModalData.cefrLevel && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200">
                                MCER: {teamsModalData.cefrLevel}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            Destino Teams
                          </span>
                          <span className="text-xs font-mono font-bold text-gray-700 truncate max-w-[180px] block">
                            {teamsModalData.studentEmail}
                          </span>
                        </div>
                      </div>

                      {/* Área editable de mensaje */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#464eb8]">edit_note</span>
                            <span>Mensaje a Enviar (Puedes editarlo a tu gusto antes de despacharlo):</span>
                          </label>
                          <span className="text-[10px] text-gray-400">
                            {teamsModalData.message.length} caracteres
                          </span>
                        </div>

                        <textarea
                          rows={7}
                          value={teamsModalData.message}
                          onChange={(e) => setTeamsModalData(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Escribe el mensaje personalizado..."
                          className="w-full p-3.5 rounded-2xl border border-gray-300 focus:border-[#464eb8] focus:ring-2 focus:ring-[#464eb8]/20 text-xs text-gray-800 leading-relaxed font-sans bg-white resize-none outline-none shadow-inner"
                        />
                      </div>

                      <div className="text-[11px] text-gray-500 bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
                        <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">info</span>
                        <span>
                          Al presionar <strong>"Enviar vía Teams"</strong>, se abrirá Microsoft Teams (Web o App de escritorio) directamente en la conversación privada con el estudiante con este mensaje listo para enviar.
                        </span>
                      </div>
                    </div>

                    {/* Footer con botones de acción */}
                    <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setTeamsModalData(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const name = teamsModalData.studentName
                            const teacher = currentTeacher?.name || user?.name || 'English Department Teacher'
                            const grp = teamsModalData.groupLevel
                            const cat = teamsModalData.categoryLabel
                            setTeamsModalData(prev => ({
                              ...prev,
                              message: `Hello ${name},\n\nGreetings from Prof. ${teacher} from the Foreign Languages Department at Colegio Salesiano San José.\n\nI am sharing the official results of your English Diagnostic Assessment 2026:\n• Official Assigned Level: **${grp}** (${cat})\n• Target Grade: ${teamsModalData.grade}\n\nCongratulations on your effort, dedication, and commitment during this diagnostic process! Keep giving your best.`
                            }))
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-[#464eb8] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer"
                          title="Restablecer plantilla en inglés con los datos oficiales"
                        >
                          Restablecer Plantilla (Inglés)
                        </button>

                        <button
                          type="button"
                          onClick={handleSendTeamsMessage}
                          className="px-5 py-2 rounded-xl bg-[#464eb8] hover:bg-[#3b429f] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>💬</span>
                          <span>Abrir Chat en Teams</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  )
}
