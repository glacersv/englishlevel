import React, { useState, useEffect } from 'react'
import Sidebar from '../shared/Sidebar'
import ExamBuilder from './ExamBuilder'
import OralInterviewExam from './OralInterviewExam'
import TeacherProfile from './TeacherProfile'
import teacherAvatar from '../../assets/avatar_teacher.png'
import {
  getAllUsers,
  updateUserStatus,
  updateUsersStatusBatch,
  getOralEvaluations,
  getAcademicStructure,
  resetStudentEvaluation,
  resetAllEvaluations
} from '../../lib/dataService'

export default function TeacherWorkspace({ user, onLogout, onSwitchToStudentView, onUpdateCurrentUser }) {
  const [currentSection, setCurrentSection] = useState('interview')
  const [collapsed, setCollapsed] = useState(false)
  const [currentTeacher, setCurrentTeacher] = useState(user)

  // Mantener sincronizado si user cambia
  useEffect(() => {
    if (user) setCurrentTeacher(user)
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

  // Cargar lista de alumnos, evaluaciones y estructura académica
  const loadData = async () => {
    setLoadingStudents(true)
    try {
      const [all, evals, struct] = await Promise.all([
        getAllUsers(),
        getOralEvaluations(),
        getAcademicStructure()
      ])
      setStudents((all || []).filter(u => u.role === 'student'))
      setEvaluations(evals || [])
      if (struct) setAcademic(struct)
    } catch (e) {
      console.error('Error cargando alumnos en vista docente:', e)
    } finally {
      setLoadingStudents(false)
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
    const matchStatus = statusToggle === 'all' ||
      (statusToggle === 'completed' && isCompleted) ||
      (statusToggle === 'pending' && !isCompleted)

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
    const matchLevel = levelPill === 'all' || s.currentLevel === levelPill

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

  const menuItems = [
    { key: 'interview', label: 'Entrevista Oral (A1-C1)', icon: 'record_voice_over', badge: `${students.length}` },
    { key: 'results', label: 'Resultados y Niveles', icon: 'military_tech', badge: `${evaluations.length}` },
    { key: 'builder', label: 'Constructor de Examen', icon: 'quiz' },
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
              teacher={user}
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
                        alt={currentTeacher?.name || user.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 bg-slate-100"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-heading font-extrabold text-xl text-on-surface">
                            {currentTeacher?.name || user.name}
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
                          {user.email} · {currentTeacher?.specialty || 'Consola de Entrevista Diagnóstica Oral (A1 - C1)'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Estudiantes Sincronizados</span>
                      <span className="font-heading font-extrabold text-2xl text-[#2528b7]">{students.length} alumnos</span>
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
                        { id: 'nelsi', label: 'Nelsi Ramos', short: 'Teacher Nelsi' }
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
                                    {s.currentLevel && s.currentLevel !== 'Sin Nivel' ? (
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
                                        (userEmail.includes('nelsi') && (studentTeacher.includes('nelsi') || studentTeacherEmail.includes('nelsi')))

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
                                            <button
                                              type="button"
                                              onClick={() => handleStartInterview(s)}
                                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#4f46e5] hover:brightness-110 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                                            >
                                              <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
                                              <span>{hasLevel ? 'Reevaluar' : 'Llamar'}</span>
                                            </button>
                                          ) : (
                                            <span
                                              className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-xs flex items-center gap-1 cursor-not-allowed select-none"
                                              title={`Solo puede ser evaluado por ${s.assignedTeacher || 'su docente titular'}`}
                                            >
                                              <span className="material-symbols-outlined text-[15px]">lock</span>
                                              <span>Otro Docente</span>
                                            </span>
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

              {/* SECCIÓN 2: RESULTADOS Y HISTORIAL */}
              {currentSection === 'results' && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-heading font-bold text-lg text-on-surface">Actas de Entrevistas Orales</h2>
                      <p className="text-xs text-on-surface-variant">Historial de evaluaciones orales completadas con rúbrica y tiempo registrado.</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200">
                      {evaluations.length} evaluados
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant/30 text-[11px] font-bold uppercase text-on-surface-variant">
                          <th className="pb-3 px-3">Estudiante</th>
                          <th className="pb-3 px-3">Grado</th>
                          <th className="pb-3 px-3">Nivel Final</th>
                          <th className="pb-3 px-3">Duración</th>
                          <th className="pb-3 px-3">Docente Evaluador</th>
                          <th className="pb-3 px-3">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20">
                        {evaluations.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-400 text-xs italic">
                              Aún no se han completado entrevistas orales.
                            </td>
                          </tr>
                        ) : (
                          evaluations.map((ev, i) => (
                            <tr key={i} className="hover:bg-surface-container-low transition-colors">
                              <td className="py-3 px-3 font-semibold text-gray-900">{ev.studentName}</td>
                              <td className="py-3 px-3">{ev.grade} - {ev.section}</td>
                              <td className="py-3 px-3">
                                <span className="px-3 py-0.5 rounded-full font-bold text-xs bg-indigo-100 text-[#2528b7]">
                                  {ev.finalLevel}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-gray-600">{ev.durationFormatted || `${ev.totalDurationSeconds}s`}</td>
                              <td className="py-3 px-3 text-gray-600">{ev.teacherName || ev.teacherEmail}</td>
                              <td className="py-3 px-3 text-[11px] text-gray-400">
                                {ev.completedAt ? new Date(ev.completedAt).toLocaleString() : 'Hoy'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECCIÓN 3: CONSTRUCTOR WIZARD */}
              {currentSection === 'builder' && (
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm">
                  <ExamBuilder onPublished={() => setCurrentSection('interview')} />
                </div>
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
            </>
          )}

        </main>
      </div>
    </div>
  )
}
