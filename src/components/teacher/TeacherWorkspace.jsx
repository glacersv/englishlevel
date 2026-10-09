import React, { useState, useEffect } from 'react'
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
  setStudentExamStatus,
  resetGradeExamOverrides,
  unlockStudentExam,
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
  const [gradePill, setGradePill] = useState('all')
  const [sectionPill, setSectionPill] = useState('all')
  const [modalityPill, setModalityPill] = useState('all') // 'all' | 'General' | 'Técnico'
  const [levelPill, setLevelPill] = useState('all')
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

  // Desbloquear / Re-habilitar test específico de un alumno (por fraude o reintento)
  const handleUnlockExam = async (student, examId = null) => {
    const msg = examId
      ? `¿Deseas habilitar y desbloquear el test "${examId}" para ${student.name}?\n\nEl alumno podrá volver a ingresar y continuar la prueba.`
      : `¿Deseas desbloquear y reiniciar los exámenes digitales para ${student.name}?`
    if (!confirm(msg)) return
    try {
      await unlockStudentExam(student.email, examId)
      await loadData()
      // Actualizar el modal si está abierto
      if (selectedStudentSecurityDetail?.email === student.email) {
        const updatedStudent = { ...selectedStudentSecurityDetail }
        const comp = { ...(updatedStudent.completedExams || {}) }
        if (examId) delete comp[examId]
        else for (let k of Object.keys(comp)) delete comp[k]
        updatedStudent.completedExams = comp
        setSelectedStudentSecurityDetail(updatedStudent)
      }
      alert('✓ Test habilitado y desbloqueado exitosamente para el estudiante.')
    } catch (e) {
      console.error('Error al desbloquear examen:', e)
      alert('Error al desbloquear examen: ' + e.message)
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

    // Filtro de grado
    let matchGrade = true
    if (gradePill !== 'all') {
      const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
      if (gradePill === '6') matchGrade = gStr.includes('6°') || s.codigoGrado === '06'
      else if (gradePill === '7') matchGrade = gStr.includes('7°') || s.codigoGrado === '07'
      else if (gradePill === '8') matchGrade = gStr.includes('8°') || s.codigoGrado === '08'
      else if (gradePill === '9') matchGrade = gStr.includes('9°') || s.codigoGrado === '09'
      else if (gradePill === '10') matchGrade = gStr.includes('10°') || gStr.includes('1° Bachillerato') || s.codigoGrado === '10'
      else if (gradePill === '11') matchGrade = gStr.includes('11°') || gStr.includes('2° Bachillerato') || s.codigoGrado === '11'
      else if (gradePill === '12') matchGrade = gStr.includes('12°') || gStr.includes('3° Bachillerato') || s.codigoGrado === '32'
      else matchGrade = gStr.includes(gradePill)
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

  // Filtrado de Evaluaciones en Sección Resultados
  const filteredEvaluations = evaluations.filter(ev => {
    // Nivel
    if (resultsLevelFilter !== 'all' && (ev.finalLevel || '').toUpperCase() !== resultsLevelFilter.toUpperCase()) {
      return false
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
        (ev.teacherName && ev.teacherName.toLowerCase().includes(s))
      if (!match) return false
    }
    return true
  })

  const resultsTotalPages = Math.ceil(filteredEvaluations.length / resultsPageSize) || 1
  const paginatedEvaluations = filteredEvaluations.slice((resultsPage - 1) * resultsPageSize, resultsPage * resultsPageSize)

  // Métricas del Dashboard de Resultados
  const levelCounts = evaluations.reduce((acc, ev) => {
    const lvl = (ev.finalLevel || 'Otros').toUpperCase()
    acc[lvl] = (acc[lvl] || 0) + 1
    return acc
  }, {})

  const totalEvaluatedTime = evaluations.reduce((sum, ev) => sum + (ev.totalDurationSeconds || 0), 0)
  const avgDurationMinutes = evaluations.length ? Math.round(totalEvaluatedTime / evaluations.length / 60) : 0

  // Total de alumnos con incidencias registradas
  const totalStudentsWithIncidents = students.filter(s => {
    const c = s.completedExams || {}
    return Object.values(c).reduce((acc, x) => acc + (x.warningsCount || (x.incidents?.length || 0)), 0) > 0
  }).length

  const isAnalyticsEnabled = coordinationModules?.analytics?.enabled !== false

  const menuItems = [
    { key: 'interview', label: 'Entrevista Oral (A1-C1)', icon: 'record_voice_over', badge: `${students.length}` },
    { key: 'final_verdict', label: 'Veredicto Final (360°)', icon: 'gavel', badge: `${students.filter(s => Boolean(s.assignedLevel)).length}/${students.length}` },
    ...(isAnalyticsEnabled ? [{ key: 'analytics', label: 'Dashboard Analítico', icon: 'analytics', badge: `${students.filter(s => Boolean(s.assignedLevel)).length} eval.` }] : []),
    { key: 'security_audit', label: 'Alertas de Fraude y Pestaña', icon: 'security', badge: totalStudentsWithIncidents > 0 ? `${totalStudentsWithIncidents} alertas` : null },
    { key: 'interview_questions', label: 'Banco de Preguntas Orales', icon: 'quiz' },
    { key: 'exam_dispatch', label: 'Despacho por Grados (Control)', icon: 'hub', badge: 'En Vivo' },
    { key: 'results', label: 'Resultados y Niveles', icon: 'military_tech', badge: `${evaluations.length}` },
    { key: 'builder', label: 'Batería y Tests MCER', icon: 'auto_stories' },
    { key: 'diagnostic_config', label: 'Ponderaciones y Cortes 2026', icon: 'tune' },
    { key: 'profile', label: 'Mi Perfil Docente', icon: 'account_circle' },
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
        <header className="h-16 px-6 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-extrabold text-lg text-on-surface">
              {menuItems.find(m => m.key === currentSection)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {activeInterviewStudent && (
              <button
                type="button"
                onClick={() => setActiveInterviewStudent(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Salir de la evaluación actual y volver a la lista de alumnos / niveles"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Restaurar / Ver Niveles</span>
              </button>
            )}

            {onSwitchToAdminView && (
              <button
                onClick={onSwitchToAdminView}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-all border border-indigo-200 cursor-pointer"
                title="Volver a la consola de Coordinación / Administración"
              >
                <span className="material-symbols-outlined text-[16px] text-[#2528b7]">admin_panel_settings</span>
                <span className="hidden sm:inline">Panel Admin/Coord</span>
              </button>
            )}

            <button
              onClick={onSwitchToStudentView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
              Vista de Alumno
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all border border-red-200 cursor-pointer"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[96rem] w-full mx-auto">
          
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
                <div className="space-y-6">
                  {/* Tarjeta de bienvenida del docente */}
                  <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={currentTeacher?.photoUrl || teacherAvatar}
                        onError={(e) => { e.currentTarget.src = teacherAvatar }}
                        alt={currentTeacher?.name || user?.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 bg-slate-100"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-heading font-extrabold text-xl text-on-surface">
                            {currentTeacher?.name || user?.name}
                          </h2>
                          <button
                            type="button"
                            onClick={() => setCurrentSection('profile')}
                            className="text-xs text-primary hover:underline font-bold flex items-center gap-0.5"
                            title="Editar mis datos personales y foto"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            <span>Editar Perfil</span>
                          </button>
                        </div>
                        <p className="text-xs text-on-surface-variant font-mono">
                          {user?.email} · {currentTeacher?.specialty || 'Consola de Entrevista Diagnóstica Oral (A1 - C1)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentSection('builder')}
                          className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                          title="Ver y probar la batería oficial de tests estandarizados (Listening, Scramble 20, Reading, Cloze)"
                        >
                          <span className="material-symbols-outlined text-[17px]">auto_stories</span>
                          <span>Batería de Tests MCER (4)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCurrentSection('diagnostic_config')}
                          className="px-3.5 py-2 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all border border-outline-variant/40 flex items-center gap-1.5 cursor-pointer"
                          title="Ver y configurar ponderaciones de entrevista (40%) y plataforma (60%)"
                        >
                          <span className="material-symbols-outlined text-[17px] text-[#2528b7]">tune</span>
                          <span className="hidden md:inline">Ponderaciones 2026</span>
                        </button>
                      </div>

                      <div className="text-right pl-2 border-l border-gray-200">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Estudiantes</span>
                        <span className="font-heading font-extrabold text-2xl text-[#2528b7]">{students.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE BOTONES OVALADOS PARA GRADOS, SECCIONES Y ESTADO */}
                  <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/30 shadow-sm space-y-3">
                    {/* Fila 1: Botones Ovalados de Grado */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                        Grado:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setGradePill('all')
                          setCurrentPage(1)
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                          gradePill === 'all'
                            ? 'bg-[#2528b7] text-white shadow-sm'
                            : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                        }`}
                      >
                        Todos
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
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setGradePill(g.id)
                              setCurrentPage(1)
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                              gradePill === g.id
                                ? 'bg-[#2528b7] text-white shadow-sm ring-2 ring-indigo-200'
                                : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        )
                      })}
                    </div>

                    {/* Fila 2: Filtro por Docente Titular y Nivel Institucional Asignado */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">school</span>
                        Docente:
                      </span>
                      {[
                        { id: 'all', label: 'Todos los Docentes' },
                        { id: 'ronald', label: 'Ronald Cardona', short: 'Teacher Ronald' },
                        { id: 'silvia', label: 'Silvia Herrera', short: 'Teacher Silvia' },
                        { id: 'nelsi', label: 'Nelsi Ramos', short: 'Teacher Nelsi' },
                        { id: 'edgar', label: 'Edgar Pacheco', short: 'Teacher Edgar' }
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTeacherFilter(t.id)
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                            teacherFilter === t.id
                              ? 'bg-[#2528b7] text-white shadow-sm ring-2 ring-indigo-200'
                              : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{t.short || t.label}</span>
                          {t.id !== 'all' && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              teacherFilter === t.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {students.filter(s => (s.assignedTeacher || '').toLowerCase().includes(t.id)).length}
                            </span>
                          )}
                        </button>
                      ))}

                      <span className="text-gray-300 mx-1 hidden md:inline">|</span>

                      {/* Filtro por Nivel Institucional CSSJ */}
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                        Nivel:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLevelPill('all')
                          setCurrentPage(1)
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          levelPill === 'all' ? 'bg-gray-900 text-white' : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                        }`}
                      >
                        Todos
                      </button>
                      {['L1-A', 'L1-B', 'L2', 'L2-A', 'L2-B', 'L3', 'L3-A', 'L3-B', 'L4-A', 'L5-A'].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            setLevelPill(lvl)
                            setCurrentPage(1)
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                            levelPill === lvl
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>

                    {/* Fila 3: Botones Ovalados de Sección, Estado y Búsqueda */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                          Sección:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSectionPill('all')
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            sectionPill === 'all'
                              ? 'bg-indigo-900 text-white shadow-sm'
                              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
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
                            className={`w-8 h-8 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                              sectionPill === sec
                                ? 'bg-indigo-900 text-white shadow-sm ring-2 ring-indigo-200'
                                : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                            }`}
                            title={`Sección ${sec}`}
                          >
                            {sec}
                          </button>
                        ))}

                        <span className="text-gray-300 mx-1 hidden sm:inline">|</span>

                        {/* Especialidad de Bachillerato: General / Técnico */}
                        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                          Bachillerato:
                        </span>
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'General', label: 'General' },
                          { id: 'Técnico', label: 'Técnico' }
                        ].map(mod => (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => {
                              setModalityPill(mod.id)
                              setCurrentPage(1)
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                              modalityPill === mod.id
                                ? mod.id === 'Técnico'
                                  ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-200'
                                  : mod.id === 'General'
                                  ? 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-200'
                                  : 'bg-gray-900 text-white shadow-sm'
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                          >
                            {mod.label}
                          </button>
                        ))}

                        <span className="text-gray-300 mx-1 hidden sm:inline">|</span>

                        {/* Estado de Evaluación */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusToggle('all')
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              statusToggle === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 bg-gray-100'
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
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              statusToggle === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 bg-gray-100'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Por Evaluar ({students.filter(s => !s.assignedLevel).length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusToggle('completed')
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              statusToggle === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 bg-gray-100'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Completados ({students.filter(s => Boolean(s.assignedLevel)).length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatusToggle('incidents')
                              setCurrentPage(1)
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              statusToggle === 'incidents' ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                            }`}
                            title="Ver alumnos con salidas de pestaña o alertas de fraude registradas"
                          >
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            <span>Con Alertas ({students.filter(s => {
                              const c = s.completedExams || {}
                              return Object.values(c).reduce((acc, x) => acc + (x.warningsCount || (x.incidents?.length || 0)), 0) > 0
                            }).length})</span>
                          </button>
                        </div>
                      </div>

                      {/* Buscador Rápido y Reset General */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-56">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value)
                              setCurrentPage(1)
                            }}
                            placeholder="Nombre o carnet..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#2528b7]/30"
                          />
                          <span className="material-symbols-outlined text-[16px] text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2">
                            search
                          </span>
                        </div>

                        {/* Botón para resetear todos los niveles en pruebas */}
                        <button
                          type="button"
                          onClick={handleResetAll}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                          title="Resetear los niveles oficiales de todos los alumnos (modo pruebas)"
                        >
                          <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                          <span className="hidden md:inline">Resetear Evaluaciones</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Alumnos Paginada */}
                  <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-heading font-bold text-sm text-gray-900">
                        Alumnos en Lista ({filteredStudents.length})
                      </h3>
                      <span className="text-[11px] text-gray-500">
                        Pulsa <strong>"Llamar / Evaluar"</strong> para abrir las 3 preguntas orales del nivel.
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 bg-white">
                            <th className="py-3 px-3">Carnet</th>
                            <th className="py-3 px-3">Estudiante</th>
                            <th className="py-3 px-3 text-center">Grado</th>
                            <th className="py-3 px-3 text-center">Secc.</th>
                            <th className="py-3 px-3 text-center">Especialidad</th>
                            <th className="py-3 px-3">Docente</th>
                            <th className="py-3 px-3 text-center">Nivel Actual</th>
                            <th className="py-3 px-3 text-center">Nivel Obtenido</th>
                            <th className="py-3 px-3 text-center">Bitácora Tests</th>
                            <th className="py-3 px-3 text-center">Acceso</th>
                            <th className="py-3 px-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedStudents.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="py-12 text-center text-gray-400 text-xs italic">
                                No se encontraron alumnos con los criterios seleccionados.
                              </td>
                            </tr>
                          ) : (
                            paginatedStudents.map((s) => {
                              const hasLevel = Boolean(s.assignedLevel)
                              // Grado conciso: 6°, 7°, 8°, 9°, 10°, 11°, 12°
                              const displayGrade = s.codigoGrado ? `${parseInt(s.codigoGrado, 10)}°` : (s.grade || '').match(/\d+/)?.[0] ? `${(s.grade || '').match(/\d+/)[0]}°` : s.grade

                              return (
                                <tr key={s.carnet || s.email} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="py-3.5 px-3 font-mono font-bold text-gray-700">{s.carnet || 'N/A'}</td>
                                  <td className="py-3.5 px-3 font-semibold text-gray-900">
                                    <div className="flex items-center gap-1.5">
                                      <span>{s.name}</span>
                                      {s.selfReportedLevel && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold" title="Auto-reportado">
                                          Auto: {s.selfReportedLevel}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-gray-400 font-mono font-normal truncate max-w-xs">{s.email}</div>
                                  </td>

                                  {/* Columna: Grado (6°, 7°, 8°, 9°, 10°, 11°) */}
                                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 font-black text-xs text-slate-800 border border-slate-200 shadow-2xs">
                                      {displayGrade}
                                    </span>
                                  </td>

                                  {/* Columna: Sección (A, B, C...) */}
                                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 font-black text-xs text-indigo-700 border border-indigo-200 shadow-2xs">
                                      {s.section || 'A'}
                                    </span>
                                  </td>

                                  {/* Columna: Especialidad (General / Técnico / N/A) */}
                                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                    {s.especialidad ? (
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] uppercase tracking-wider border shadow-2xs ${
                                        s.especialidad === 'Técnico'
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}>
                                        {s.especialidad}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs font-semibold">-</span>
                                    )}
                                  </td>

                                  {/* Columna: Docente */}
                                  <td className="py-3.5 px-3 whitespace-nowrap">
                                    {s.assignedTeacher ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                                        <span>👨‍🏫</span>
                                        <span>{s.assignedTeacher}</span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs italic">Sin asignar</span>
                                    )}
                                  </td>

                                  {/* Columna: Nivel Actual (Inicial) */}
                                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                    {((s.grade || '').includes('6°') || s.codigoGrado === '06' || s.codigoGrado === '6') ? (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200" title="Sexto grado no tiene nivel previo; el nivel se le asignará al iniciar 7° grado según esta evaluación.">
                                        Asignación 7°
                                      </span>
                                    ) : s.currentLevel && s.currentLevel !== 'Sin Nivel' ? (
                                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                        {s.currentLevel}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </td>

                                  {/* Columna: Nivel Obtenido (Oficial) */}
                                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                    {hasLevel ? (
                                      <div className="inline-flex items-center gap-1">
                                        <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-indigo-600 text-white shadow-sm">
                                          {s.assignedLevel}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleResetStudent(s)}
                                          className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                          title={`Resetear nivel de ${s.name} a Sin Evaluar`}
                                        >
                                          <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Sin Evaluar
                                      </span>
                                    )}
                                  </td>

                                  {/* Columna: Bitácora Tests y Advertencias de Seguridad */}
                                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                    {(() => {
                                      const completed = s.completedExams || {}
                                      const examsDoneCount = Object.keys(completed).length
                                      const totalWarnings = Object.values(completed).reduce(
                                        (acc, c) => acc + (c.warningsCount || 0),
                                        0
                                      )

                                      if (examsDoneCount === 0) {
                                        return (
                                          <span className="text-[11px] text-gray-400 font-medium">
                                            Pendiente
                                          </span>
                                        )
                                      }

                                      return (
                                        <div className="inline-flex flex-col items-center gap-1">
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                            {examsDoneCount} test(s)
                                          </span>
                                          {totalWarnings > 0 ? (
                                            <button
                                              type="button"
                                              onClick={() => setSelectedStudentSecurityDetail(s)}
                                              className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs hover:scale-105"
                                              title="Ver bitácora detallada de fraudes y salidas de pestaña"
                                            >
                                              <span className="material-symbols-outlined text-[13px] text-rose-600">warning</span>
                                              <span>{totalWarnings} salida(s)</span>
                                              <span className="material-symbols-outlined text-[12px] opacity-70">open_in_new</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setSelectedStudentSecurityDetail(s)}
                                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 cursor-pointer transition-colors"
                                              title="Sin alertas. Clic para ver historial de tests completados."
                                            >
                                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                              <span>Limpio</span>
                                            </button>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {(() => {
                                      const isActive = s.status === 'active'
                                      // Verificar si el alumno le pertenece al docente conectado
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
                                         ((userEmail.includes('edgar') || userEmail.includes('pacheco')) && (studentTeacher.includes('edgar') || studentTeacher.includes('pacheco') || studentTeacherEmail.includes('edgar')))

                                      return (
                                        <button
                                          type="button"
                                          disabled={!isMyStudent}
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            if (isMyStudent) handleToggleStatus(s.email, s.status)
                                          }}
                                          className={`inline-flex items-center gap-2 select-none px-2.5 py-1.5 rounded-xl border transition-all ${
                                            !isMyStudent
                                              ? 'cursor-not-allowed opacity-40 bg-gray-50 border-gray-200'
                                              : isActive
                                                ? 'cursor-pointer bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/70 shadow-2xs'
                                                : 'cursor-pointer bg-slate-100 border-slate-200 hover:bg-slate-200/70 shadow-2xs'
                                          }`}
                                          title={!isMyStudent ? `Alumno asignado a ${s.assignedTeacher || 'otro docente'}` : (isActive ? 'Clic para pausar / desactivar acceso' : 'Clic para activar alumno')}
                                        >
                                          <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-all duration-200 pointer-events-none ${
                                            isActive ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                                          }`}>
                                            <div className="bg-white w-3.5 h-3.5 rounded-full shadow-sm"></div>
                                          </div>
                                          <span className={`text-[11px] font-extrabold pointer-events-none tracking-wide ${
                                            isActive ? 'text-emerald-800' : 'text-gray-500'
                                          }`}>
                                            {isActive ? 'Activo' : 'Pausado'}
                                          </span>
                                        </button>
                                      )
                                    })()}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    {(() => {
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

                                      return (
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => onSwitchToStudentView?.(s)}
                                            className="p-2 rounded-xl text-gray-500 hover:text-[#2528b7] hover:bg-indigo-50 transition-colors cursor-pointer"
                                            title={`Ver portal como ${s.name}`}
                                          >
                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                          </button>
                                          {s.canEvaluate === false ? (
                                            <span
                                              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-[11px] flex items-center gap-1 border border-slate-200 select-none"
                                              title="Los alumnos de 11° General ya completaron su proceso o no se evalúan este año"
                                            >
                                              <span className="material-symbols-outlined text-[14px] text-slate-400">check_circle</span>
                                              <span>No se evalúa</span>
                                            </span>
                                          ) : isMyStudent ? (
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => setSelectedVerdictStudent(s)}
                                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                                                title="Revisar notas consolidadas (plataforma + oral) y emitir veredicto final"
                                              >
                                                <span className="material-symbols-outlined text-[15px]">gavel</span>
                                                <span>Veredicto</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleStartInterview(s)}
                                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#4f46e5] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                                              >
                                                <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                                                <span>{hasLevel ? 'Reevaluar' : 'Llamar'}</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => setSelectedVerdictStudent(s)}
                                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                                                title="Consultar notas consolidadas y veredicto"
                                              >
                                                <span className="material-symbols-outlined text-[15px]">gavel</span>
                                                <span>Veredicto</span>
                                              </button>
                                              <span
                                                className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-xs flex items-center gap-1 cursor-not-allowed select-none"
                                                title={`Solo puede ser evaluado por ${s.assignedTeacher || 'su docente titular'}`}
                                              >
                                                <span className="material-symbols-outlined text-[15px]">lock</span>
                                                <span>Otro Docente</span>
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINACIÓN */}
                    <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                      <span className="text-xs text-gray-500">
                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredStudents.length} total)
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(1)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
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
                                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                  currentPage === pageNum
                                    ? 'bg-[#2528b7] text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
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
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          Siguiente
                        </button>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          »
                        </button>
                      </div>
                    </div>

                  </div>
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
                  <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/30 shadow-sm space-y-3">
                    {/* Fila 1: Botones Ovalados de Grado */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                        Grado:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setGradePill('all')
                          setCurrentPage(1)
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                          gradePill === 'all'
                            ? 'bg-[#2528b7] text-white shadow-sm'
                            : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
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
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setGradePill(g.id)
                              setCurrentPage(1)
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                              gradePill === g.id
                                ? 'bg-[#2528b7] text-white shadow-sm ring-2 ring-indigo-200'
                                : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                            }`}
                          >
                            {shortLabel}
                          </button>
                        )
                      })}
                    </div>

                    {/* Fila 2: Filtro por Docente Titular */}
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                      <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">school</span>
                        Maestro:
                      </span>
                      {[
                        { id: 'all', label: 'Todos los Maestros' },
                        { id: 'ronald', label: 'Ronald Cardona', short: 'Teacher Ronald' },
                        { id: 'silvia', label: 'Silvia Herrera', short: 'Teacher Silvia' },
                        { id: 'nelsi', label: 'Nelsi Ramos', short: 'Teacher Nelsi' },
                        { id: 'edgar', label: 'Edgar Pacheco', short: 'Teacher Edgar' }
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTeacherFilter(t.id)
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                            teacherFilter === t.id
                              ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-200'
                              : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{t.short || t.label}</span>
                          {t.id !== 'all' && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              teacherFilter === t.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {students.filter(s => (s.assignedTeacher || '').toLowerCase().includes(t.id)).length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Fila 3: Filtro por Sección, Estado de Veredicto y Buscador */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Secciones */}
                        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
                          Sección:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSectionPill('all')
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            sectionPill === 'all'
                              ? 'bg-indigo-900 text-white shadow-sm'
                              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
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
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              sectionPill === sec
                                ? 'bg-indigo-900 text-white shadow-sm ring-2 ring-indigo-200'
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                          >
                            Sección {sec}
                          </button>
                        ))}

                        <span className="text-gray-300 mx-1 hidden sm:inline">|</span>

                        {/* Filtro por Estado de Veredicto */}
                        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mr-1">
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
                            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              statusToggle === st.id
                                ? `${st.color || 'bg-gray-800'} text-white shadow-xs`
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
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
                          className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                          search
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabla Principal de la Mesa de Veredicto */}
                  <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                      <div>
                        <h3 className="font-heading font-extrabold text-base text-gray-900 flex items-center gap-2">
                          <span>Nómina para Veredicto Definitivo</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">
                            {filteredStudents.length} alumnos filtrados
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Calculando con ponderaciones dinámicas: <strong>{diagnosticConfig?.weights?.platform ?? 60}% Plataforma</strong> + <strong>{diagnosticConfig?.weights?.oral ?? 40}% Oral</strong>.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentSection('diagnostic_config')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-300 cursor-pointer self-start sm:self-auto"
                        title="Modificar ponderaciones y cortes institucionales"
                      >
                        <span className="material-symbols-outlined text-[16px] text-teal-700">tune</span>
                        <span>Configurar Ponderaciones</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-100/70 text-[11px] font-black text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4">Alumno / Carnet</th>
                            <th className="py-3 px-3">Grado / Sec.</th>
                            <th className="py-3 px-3 text-center">Nivel Previo (Antes)</th>
                            <th className="py-3 px-3 text-center">Plataforma ({diagnosticConfig?.weights?.platform ?? 60}%)</th>
                            <th className="py-3 px-3 text-center">Oral ({diagnosticConfig?.weights?.oral ?? 40}%)</th>
                            <th className="py-3 px-3 text-center">Nota Global</th>
                            <th className="py-3 px-3 text-center">Nivel Oficial (Asignado)</th>
                            <th className="py-3 px-3 text-center">Evolución</th>
                            <th className="py-3 px-3">Maestro Asignado</th>
                            <th className="py-3 px-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {paginatedStudents.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="text-center py-12 text-gray-400 font-medium">
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
                                <tr key={s.id || s.carnet} className="hover:bg-slate-50/80 transition-colors">
                                  {/* Alumno */}
                                  <td className="py-3 px-4">
                                    <div className="font-extrabold text-gray-900">{s.name}</div>
                                    <div className="text-[11px] text-gray-500 font-mono">{s.carnet} • {s.email}</div>
                                  </td>

                                  {/* Grado y Sección */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700">
                                      {s.grade || s.codigoGrado || '-'} {s.section || ''}
                                    </span>
                                  </td>

                                  {/* Nivel Previo (Antes) */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    {isSixth ? (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                        Asignación 7°
                                      </span>
                                    ) : s.currentLevel && s.currentLevel !== 'Sin Nivel' ? (
                                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
                                        {s.currentLevel}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </td>

                                  {/* Plataforma con % dinámico */}
                                  <td className="py-3 px-3 text-center">
                                    {examEntries.length > 0 ? (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                        {platformPercent}%
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-gray-400 italic">Pendiente</span>
                                    )}
                                  </td>

                                  {/* Oral con % dinámico */}
                                  <td className="py-3 px-3 text-center">
                                    {oralEval || s.oralInterviewScore != null || s.oralScorePercent != null ? (
                                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                                        {oralPercent}%
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-gray-400 italic">Sin evaluar</span>
                                    )}
                                  </td>

                                  {/* Nota Global Ponderada */}
                                  <td className="py-3 px-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                                      globalWeightedScore >= (diagnosticConfig?.cutoffs?.intermediateMax || 75)
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : globalWeightedScore >= (diagnosticConfig?.cutoffs?.basicMax || 45)
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}>
                                      {globalWeightedScore}%
                                    </span>
                                  </td>

                                  {/* Nivel Asignado Oficial (Veredicto) */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    {hasOfficial ? (
                                      <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
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
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200" title={`Ajuste pedagógico de ${prevLevel} a ${newLevel}`}>
                                          <span className="material-symbols-outlined text-[13px] text-slate-500">sync_alt</span>
                                          <span>Ajustado</span>
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-gray-300 text-xs">-</span>
                                    )}
                                  </td>

                                  {/* Maestro Asignado */}
                                  <td className="py-3 px-3 whitespace-nowrap text-gray-700 text-xs">
                                    {s.assignedTeacher ? (
                                      <span className="inline-flex items-center gap-1 font-semibold">
                                        <span>👨‍🏫</span>
                                        <span>{s.assignedTeacher}</span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 italic">Sin asignar</span>
                                    )}
                                  </td>

                                  {/* Acción */}
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedVerdictStudent(s)}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs transition-all ${
                                        hasOfficial
                                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
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
                    <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                      <span className="text-xs text-gray-500">
                        Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredStudents.length} total)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(1)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          Anterior
                        </button>
                        <span className="px-3 py-1.5 text-xs font-extrabold text-[#2528b7]">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          Siguiente
                        </button>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
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
                  isTeacherView={true}
                  teacherName={currentTeacher?.name || user?.name || ''}
                />
              )}

              {/* SECCIÓN 2: RESULTADOS Y NIVELES (DASHBOARD COMPLETO) */}
              {currentSection === 'results' && (
                <div className="space-y-6">
                  {/* KPI DASHBOARD CARDS */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {/* Tarjeta Total Evaluados */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Evaluados</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#2528b7] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-gray-900">{evaluations.length}</span>
                        <span className="text-[11px] text-gray-400 block mt-0.5">de {students.length} alumnos</span>
                      </div>
                    </div>

                    {/* Tarjeta Nivel A1 */}
                    <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Nivel A1</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-emerald-800">{levelCounts['A1'] || 0}</span>
                        <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
                          {evaluations.length ? Math.round(((levelCounts['A1'] || 0) / evaluations.length) * 100) : 0}% del total
                        </span>
                      </div>
                    </div>

                    {/* Tarjeta Nivel A2 */}
                    <div className="bg-white rounded-2xl p-4 border border-cyan-100 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">Nivel A2</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-cyan-800">{levelCounts['A2'] || 0}</span>
                        <span className="text-[11px] text-cyan-600 font-medium block mt-0.5">
                          {evaluations.length ? Math.round(((levelCounts['A2'] || 0) / evaluations.length) * 100) : 0}% del total
                        </span>
                      </div>
                    </div>

                    {/* Tarjeta Nivel B1 */}
                    <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Nivel B1</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-blue-800">{levelCounts['B1'] || 0}</span>
                        <span className="text-[11px] text-blue-600 font-medium block mt-0.5">
                          {evaluations.length ? Math.round(((levelCounts['B1'] || 0) / evaluations.length) * 100) : 0}% del total
                        </span>
                      </div>
                    </div>

                    {/* Tarjeta Nivel B2 / C1 */}
                    <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Nivel B2 / C1</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-purple-800">
                          {(levelCounts['B2'] || 0) + (levelCounts['C1'] || 0)}
                        </span>
                        <span className="text-[11px] text-purple-600 font-medium block mt-0.5">Avanzados</span>
                      </div>
                    </div>

                    {/* Tarjeta Tiempo Promedio */}
                    <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Duración Prom.</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px]">timer</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="font-heading font-black text-2xl text-amber-900">
                          {avgDurationMinutes > 0 ? `${avgDurationMinutes} min` : `${Math.round(totalEvaluatedTime / (evaluations.length || 1))}s`}
                        </span>
                        <span className="text-[11px] text-amber-600 font-medium block mt-0.5">por entrevista oral</span>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE FILTROS Y BÚSQUEDA */}
                  <div className="bg-white rounded-3xl p-5 border border-outline-variant/30 shadow-xs space-y-3.5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h2 className="font-heading font-black text-base text-gray-900 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#2528b7] text-[22px]">bar_chart</span>
                          <span>Panel de Resultados y Niveles Oficiales</span>
                        </h2>
                        <p className="text-xs text-gray-500">
                          Filtra por nivel asignado, grado o docente evaluador y haz clic en <strong>"Ver Detalles"</strong> para auditar cada criterio de la rúbrica.
                        </p>
                      </div>

                      {/* Buscador de alumnos en resultados */}
                      <div className="relative w-full md:w-72">
                        <input
                          type="text"
                          value={resultsSearch}
                          onChange={(e) => {
                            setResultsSearch(e.target.value)
                            setResultsPage(1)
                          }}
                          placeholder="Buscar por nombre, carnet..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#2528b7]/30 bg-gray-50/50"
                        />
                        <span className="material-symbols-outlined text-[18px] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">
                          search
                        </span>
                      </div>
                    </div>

                    {/* SELECTORES DE FILTRO RÁPIDO */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                      {/* Filtro por Nivel Oficial */}
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-gray-200/70">
                        <span className="text-[10px] font-bold text-gray-500 uppercase px-2">Nivel:</span>
                        {['all', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              setResultsLevelFilter(lvl)
                              setResultsPage(1)
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              resultsLevelFilter === lvl
                                ? 'bg-[#2528b7] text-white shadow-xs'
                                : 'text-gray-600 hover:bg-white hover:text-gray-900'
                            }`}
                          >
                            {lvl === 'all' ? 'Todos' : lvl}
                          </button>
                        ))}
                      </div>

                      {/* Filtro por Grado */}
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-gray-200/70">
                        <span className="text-[10px] font-bold text-gray-500 uppercase px-2">Grado:</span>
                        {['all', '6', '7', '8', '9', '10', '11'].map((gr) => (
                          <button
                            key={gr}
                            type="button"
                            onClick={() => {
                              setResultsGradeFilter(gr)
                              setResultsPage(1)
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              resultsGradeFilter === gr
                                ? 'bg-indigo-900 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-white hover:text-gray-900'
                            }`}
                          >
                            {gr === 'all' ? 'Todos' : `${gr}°`}
                          </button>
                        ))}
                      </div>

                      {/* Filtro por Docente Evaluador */}
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-gray-200/70">
                        <span className="text-[10px] font-bold text-gray-500 uppercase px-2">Docente:</span>
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
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              resultsTeacherFilter === t.key
                                ? 'bg-slate-800 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-white hover:text-gray-900'
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
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1 transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">clear</span>
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TABLA DE EVALUACIONES CON BOTÓN DE DETALLES */}
                  <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold text-sm text-gray-900">
                          Actas de Evaluación ({filteredEvaluations.length})
                        </h3>
                        <span className="text-[11px] text-gray-500">
                          {filteredEvaluations.length === evaluations.length ? 'Total registradas' : `Filtradas de ${evaluations.length}`}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 hidden sm:inline">
                        Haz clic en <strong>"Ver Detalles"</strong> para consultar el desglose pregunta por pregunta.
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 bg-white">
                            <th className="py-3 px-3">Carnet</th>
                            <th className="py-3 px-3">Estudiante</th>
                            <th className="py-3 px-3 text-center">Grado</th>
                            <th className="py-3 px-3 text-center">Nivel Obtenido</th>
                            <th className="py-3 px-3">Docente Evaluador</th>
                            <th className="py-3 px-3 text-center">Duración</th>
                            <th className="py-3 px-3">Fecha y Hora</th>
                            <th className="py-3 px-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedEvaluations.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="py-12 text-center text-gray-400 text-xs italic">
                                No se encontraron actas con los filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            paginatedEvaluations.map((ev, i) => {
                              const badgeColors = {
                                A1: 'bg-emerald-50 text-emerald-800 border-emerald-300',
                                A2: 'bg-cyan-50 text-cyan-800 border-cyan-300',
                                B1: 'bg-blue-50 text-blue-800 border-blue-300',
                                B2: 'bg-purple-50 text-purple-800 border-purple-300',
                                C1: 'bg-pink-50 text-pink-800 border-pink-300',
                              }
                              const colorClass = badgeColors[ev.finalLevel] || 'bg-indigo-50 text-indigo-800 border-indigo-200'

                              return (
                                <tr key={ev.id || i} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="py-3.5 px-3 font-mono font-bold text-gray-700">
                                    {ev.studentCarnet || 'N/A'}
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <div className="font-semibold text-gray-900">{ev.studentName}</div>
                                    <div className="text-[11px] text-gray-400 font-mono truncate max-w-xs">{ev.studentEmail}</div>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 font-black text-xs text-slate-800 border border-slate-200">
                                      {ev.grade} - Secc. {ev.section}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`inline-block px-3 py-1 rounded-full font-black text-xs border shadow-2xs ${colorClass}`}>
                                      {ev.finalLevel}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <div className="font-medium text-gray-800 flex items-center gap-1">
                                      <span className="text-xs">👨‍🏫</span>
                                      <span>{ev.teacherName || ev.teacherEmail}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-3 text-center font-mono text-xs text-gray-600">
                                    {ev.durationFormatted || `${ev.totalDurationSeconds}s`}
                                  </td>
                                  <td className="py-3.5 px-3 text-[11px] text-gray-500 whitespace-nowrap">
                                    {ev.completedAt ? new Date(ev.completedAt).toLocaleString('es-SV') : 'Hoy'}
                                  </td>
                                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
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
                                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title="Revisar notas consolidadas y emitir veredicto final"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">gavel</span>
                                        <span>Veredicto</span>
                                      </button>

                                      {/* BOTÓN VER DETALLES DE RÚBRICA */}
                                      <button
                                        type="button"
                                        onClick={() => setSelectedEvaluationDetail(ev)}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#2528b7] font-bold text-xs border border-indigo-200/80 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
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
                    <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                      <span className="text-xs text-gray-500">
                        Página <strong>{resultsPage}</strong> de <strong>{resultsTotalPages}</strong> ({filteredEvaluations.length} evaluados mostrados)
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={resultsPage <= 1}
                          onClick={() => setResultsPage(1)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          disabled={resultsPage <= 1}
                          onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          disabled={resultsPage >= resultsTotalPages}
                          onClick={() => setResultsPage(p => Math.min(resultsTotalPages, p + 1))}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          Siguiente
                        </button>
                        <button
                          type="button"
                          disabled={resultsPage >= resultsTotalPages}
                          onClick={() => setResultsPage(resultsTotalPages)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ================= MODAL DE DETALLES DEL ALUMNO / RÚBRICA ================= */}
                  {selectedEvaluationDetail && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 animate-scaleUp">
                        {/* Cabecera del modal */}
                        <div className="bg-gradient-to-r from-[#161a33] to-[#2528b7] p-6 text-white flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-900 font-extrabold text-[10px] tracking-wider uppercase">
                                Acta de Evaluación Oral Oficial
                              </span>
                              <span className="text-xs text-slate-300">
                                {selectedEvaluationDetail.completedAt ? new Date(selectedEvaluationDetail.completedAt).toLocaleString('es-SV') : 'Hoy'}
                              </span>
                            </div>
                            <h3 className="font-heading font-extrabold text-2xl text-white mt-1">
                              {selectedEvaluationDetail.studentName}
                            </h3>
                            <div className="text-xs text-indigo-200 font-mono flex items-center gap-3 mt-1 flex-wrap">
                              <span>Carnet: <strong>{selectedEvaluationDetail.studentCarnet || 'N/A'}</strong></span>
                              <span>·</span>
                              <span>{selectedEvaluationDetail.grade} - Secc. {selectedEvaluationDetail.section}</span>
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
                            <div className="px-4 py-1.5 rounded-2xl bg-white/15 border border-white/20 text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-200 block">Nivel Asignado</span>
                              <span className="font-heading font-black text-2xl text-amber-300">
                                {selectedEvaluationDetail.finalLevel}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Cuerpo scrollable con rúbricas */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
                          {/* Ficha resumen */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-200/80">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tiempo Total</span>
                              <span className="font-mono font-bold text-base text-gray-800">
                                {selectedEvaluationDetail.durationFormatted || `${selectedEvaluationDetail.totalDurationSeconds} seg`}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Correo Alumno</span>
                              <span className="text-xs font-mono text-gray-600 truncate block">
                                {selectedEvaluationDetail.studentEmail}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nivel Oficial</span>
                              <span className="text-base font-extrabold text-[#2528b7]">
                                {selectedEvaluationDetail.finalLevel}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Docente</span>
                              <span className="text-xs font-semibold text-gray-800 truncate block">
                                {selectedEvaluationDetail.teacherName || selectedEvaluationDetail.teacherEmail}
                              </span>
                            </div>
                          </div>

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
                        </div>

                        {/* Footer modal */}
                        <div className="bg-white p-4 border-t border-gray-200 flex items-center justify-between">
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
                  )}

                </div>
              )}

              {/* SECCIÓN NUEVA: BITÁCORA Y ALERTAS DE FRAUDE / SALIDA DE PESTAÑA */}
              {currentSection === 'security_audit' && (
                <div className="space-y-6">
                  {/* Encabezado y resumen métrico */}
                  <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-[32px]">shield</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-heading font-extrabold text-xl text-on-surface">
                            Supervisión de Seguridad y Antifraude
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                            Tiempo Real
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Monitoreo de salidas de pestaña, cambios de ventana, atajos bloqueados y desconexiones durante las pruebas digitales.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={loadData}
                        className="px-4 py-2 rounded-2xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all flex items-center gap-1.5 cursor-pointer border border-outline-variant/40"
                      >
                        <span className="material-symbols-outlined text-[16px]">sync</span>
                        <span>Actualizar Datos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentSection('interview')}
                        className="px-4 py-2 rounded-2xl bg-[#2528b7] text-white hover:brightness-110 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                      >
                        <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                        <span>Ir a Entrevistas</span>
                      </button>
                    </div>
                  </div>

                  {/* Tarjetas KPI de Fraude */}
                  {(() => {
                    let totalIncidentsCount = 0
                    let autoSubmittedByFraud = 0
                    const flaggedStudents = []

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
                        flaggedStudents.push(s)
                      }
                      if (hasAutoSubmit) autoSubmittedByFraud++
                    })

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                              Alumnos con Incidencias
                            </span>
                            <span className="font-heading font-black text-2xl text-rose-900 mt-1 block">
                              {flaggedStudents.length}
                            </span>
                            <span className="text-[11px] text-gray-500">De {students.length} alumnos totales</span>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[26px]">person_alert</span>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                              Total de Salidas Registradas
                            </span>
                            <span className="font-heading font-black text-2xl text-amber-900 mt-1 block">
                              {totalIncidentsCount}
                            </span>
                            <span className="text-[11px] text-gray-500">En todas las evaluaciones digitales</span>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[26px]">tab_unselected</span>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                              Alumnos Sin Ninguna Alerta
                            </span>
                            <span className="font-heading font-black text-2xl text-emerald-900 mt-1 block">
                              {Math.max(0, students.length - flaggedStudents.length)}
                            </span>
                            <span className="text-[11px] text-gray-500">Comportamiento transparente</span>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[26px]">verified_user</span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Tabla de Alumnos con Alertas de Fraude */}
                  <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold text-sm text-gray-900">
                          Bitácora de Estudiantes con Alertas
                        </h3>
                        <span className="text-[11px] text-gray-500">
                          (Haz clic en <strong>"Ver Registro"</strong> para auditar fechas, horas y tipo de acción)
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 bg-white">
                            <th className="py-3 px-3">Carnet</th>
                            <th className="py-3 px-3">Estudiante</th>
                            <th className="py-3 px-3 text-center">Grado</th>
                            <th className="py-3 px-3 text-center">Secc.</th>
                            <th className="py-3 px-3">Docente Asignado</th>
                            <th className="py-3 px-3 text-center">Nivel Obtenido</th>
                            <th className="py-3 px-3 text-center">Salidas de Pestaña</th>
                            <th className="py-3 px-3 text-center">Estado de Acceso</th>
                            <th className="py-3 px-3 text-right">Auditoría</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(() => {
                            const flagged = students.filter(s => {
                              const c = s.completedExams || {}
                              return Object.values(c).reduce((acc, x) => acc + (x.warningsCount || (x.incidents?.length || 0)), 0) > 0
                            })

                            if (flagged.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="9" className="py-12 text-center text-gray-400 text-xs italic">
                                    <div className="flex flex-col items-center gap-2">
                                      <span className="material-symbols-outlined text-[36px] text-emerald-500">check_circle</span>
                                      <span className="font-bold text-gray-700">No hay incidencias de seguridad registradas</span>
                                      <span className="text-gray-400">Todos los estudiantes han completado sus exámenes sin registrar salidas no autorizadas.</span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            }

                            return flagged.map(s => {
                              const completed = s.completedExams || {}
                              const totalWarnings = Object.values(completed).reduce(
                                (acc, c) => acc + (c.warningsCount || (c.incidents?.length || 0)),
                                0
                              )

                              return (
                                <tr key={s.id || s.email} className="hover:bg-rose-50/20 transition-colors">
                                  <td className="py-3.5 px-3 font-mono font-bold text-gray-700">
                                    {s.carnet || 'N/A'}
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <div className="font-semibold text-gray-900">{s.name}</div>
                                    <div className="text-[11px] text-gray-400 font-mono truncate max-w-xs">{s.email}</div>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-700">
                                      {s.grade || s.codigoGrado || '-'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-center font-bold text-gray-600">
                                    {s.section || '-'}
                                  </td>
                                  <td className="py-3.5 px-3 text-gray-700 font-medium">
                                    {s.assignedTeacher || 'Sin asignar'}
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    {s.assignedLevel ? (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                                        {s.assignedLevel}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-gray-400">Sin nivel</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300 inline-flex items-center gap-1 shadow-2xs">
                                      <span className="material-symbols-outlined text-[15px] text-rose-600">warning</span>
                                      <span>{totalWarnings} advertencia(s)</span>
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {s.status === 'active' ? 'Habilitado' : 'Pausado'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
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
                                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                                        <span>Ver Registro</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
                                          {/* Botón para Desbloquear / Habilitar este examen */}
                                          <button
                                            type="button"
                                            onClick={() => handleUnlockExam(selectedStudentSecurityDetail, k)}
                                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                                            title="Desbloquear este examen para que el alumno pueda volver a rendirlo"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">lock_open</span>
                                            <span>Habilitar / Desbloquear Examen</span>
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
            </>
          )}

        </main>
      </div>
    </div>
  )
}
