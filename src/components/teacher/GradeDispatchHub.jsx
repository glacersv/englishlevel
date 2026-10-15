import React, { useState, useMemo } from 'react'

/**
 * Grados oficiales contemplados en el plan:
 * 6° Grado, 7° Grado, 8° Grado, 9° Grado, 1° Bachillerato (10°), 2° Bachillerato (11°)
 */
const GRADES_DEF = [
  { id: '6', label: '6° Grado', fullTitle: '6° Grado (Educación Básica)', badge: 'Básica' },
  { id: '7', label: '7° Grado', fullTitle: '7° Grado (Educación Básica)', badge: 'Básica' },
  { id: '8', label: '8° Grado', fullTitle: '8° Grado (Educación Básica)', badge: 'Básica' },
  { id: '9', label: '9° Grado', fullTitle: '9° Grado (Tercer Ciclo)', badge: 'Tercer Ciclo' },
  { id: '10', label: '1° Bachillerato', fullTitle: '1° Bachillerato (10° Grado)', badge: 'Media' },
  { id: '11', label: '2° Bachillerato', fullTitle: '2° Bachillerato (11° Grado)', badge: 'Graduandos' }
]

export default function GradeDispatchHub({
  students = [],
  dispatchConfig = {},
  onSetGradeStatus,
  onSetStudentStatus,
  onResetGradeOverrides,
  onCallInterviewStudent,
  onUnlockStudentExam,
  onViewStudentSecurity,
  onToggleStudentLevelVisibility,
  currentTeacher
}) {
  // Navegación: null = vista principal de reproductores (cards de grados), string (ej: '7') = vista dedicada de nómina
  const [activeRosterGradeId, setActiveRosterGradeId] = useState(null)

  // Modal de Detalle de Exámenes del Estudiante en la Nómina
  const [selectedStudentDetailModal, setSelectedStudentDetailModal] = useState(null)

  // Filtros de la nómina: { section, level, teacher, search }
  const [rosterFilters, setRosterFilters] = useState({
    section: 'all',
    level: 'all',
    teacher: 'all',
    search: ''
  })

  // Agrupar alumnos por grado
  const studentsByGrade = useMemo(() => {
    const map = { '6': [], '7': [], '8': [], '9': [], '10': [], '11': [] }
    students.forEach(s => {
      const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
      let targetKey = null

      if (gStr.includes('6°') || s.codigoGrado === '06') targetKey = '6'
      else if (gStr.includes('7°') || s.codigoGrado === '07') targetKey = '7'
      else if (gStr.includes('8°') || s.codigoGrado === '08') targetKey = '8'
      else if (gStr.includes('9°') || s.codigoGrado === '09') targetKey = '9'
      else if (gStr.includes('10°') || gStr.includes('1° Bach') || s.codigoGrado === '10') targetKey = '10'
      else if (gStr.includes('11°') || gStr.includes('2° Bach') || s.codigoGrado === '11') targetKey = '11'
      else if (gStr.includes('12°') || gStr.includes('3° Bach') || s.codigoGrado === '32') targetKey = '11'

      if (targetKey && map[targetKey]) {
        map[targetKey].push(s)
      }
    })
    return map
  }, [students])

  // Obtener estado de un grado en dispatchConfig
  const getGradeState = (gradeId) => {
    const gControl = dispatchConfig.gradesControl?.[gradeId] || {}
    return {
      platformStatus: gControl.platformStatus || 'paused',
      interviewStatus: gControl.interviewStatus || 'paused',
      studentLevelVisible: Boolean(gControl.studentLevelVisible),
      updatedAt: gControl.updatedAt
    }
  }

  // Helper para verificar estado individual de plataforma de un alumno
  const getStudentPlatformState = (student, gradePlatformStatus) => {
    const clean = (student.email || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_')
    const ov = dispatchConfig.studentOverrides?.[clean] || dispatchConfig.studentOverrides?.[(student.email || '').toLowerCase()]
    if (ov && ov.platformStatus) {
      return {
        status: ov.platformStatus,
        isOverride: true
      }
    }
    return {
      status: gradePlatformStatus,
      isOverride: false
    }
  }

  // Renderizador del Modal de Detalle de Evaluaciones (utilizado tanto en Nómina como en Vista Principal)
  const renderStudentDetailModal = () => {
    if (!selectedStudentDetailModal) return null
    const modalStudent = students.find(s => (s.email || '').toLowerCase() === (selectedStudentDetailModal.email || '').toLowerCase()) || selectedStudentDetailModal
    const completedExams = modalStudent.completedExams || {}
    const examEntries = Object.entries(completedExams)

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-[#eceaf6] animate-scaleUp">
          {/* Cabecera del modal */}
          <div className="bg-gradient-to-r from-[#2d2454] via-[#5446a8] to-[#7052c9] p-5 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-[#1a1926] font-black text-[10px] tracking-wider uppercase">
                  Detalle de Evaluaciones
                </span>
                <span className="text-xs text-[#e9e3ff] font-mono">
                  {modalStudent.carnet || modalStudent.grade || ''}
                </span>
              </div>
              <h3 className="font-heading font-black text-xl text-white mt-1">
                {modalStudent.name}
              </h3>
              <span className="text-[11px] text-[#e9e3ff] block font-mono">
                {modalStudent.email}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStudentDetailModal(null)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Cuerpo del modal con lista de actividades */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#585567] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#5446a8]">fact_check</span>
                <span>Actividades Realizadas ({examEntries.length})</span>
              </span>

              {examEntries.length > 0 && onUnlockStudentExam && (
                <button
                  type="button"
                  onClick={() => onUnlockStudentExam(modalStudent, null)}
                  className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                  title="Resetear todas las actividades de este alumno para que las realice de nuevo"
                >
                  <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                  <span>Resetear Todas</span>
                </button>
              )}
            </div>

            {examEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8e8a9f] italic bg-white rounded-2xl border border-dashed border-[#eceaf6]">
                Este alumno no tiene actividades digitales completadas actualmente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {examEntries.map(([eid, edata]) => {
                  const isListening = eid.toLowerCase().includes('listening') || (edata.examTitle || '').toLowerCase().includes('listening') || (edata.examTitle || '').toLowerCase().includes('audio')
                  const warnings = edata.warningsCount || (edata.incidents?.length || 0)

                  return (
                    <div
                      key={eid}
                      className={`p-3.5 bg-white rounded-2xl border shadow-2xs space-y-2 transition-all ${
                        isListening ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/20 to-white' : 'border-[#eceaf6]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`material-symbols-outlined text-[20px] shrink-0 ${isListening ? 'text-indigo-600' : 'text-[#8a70d6]'}`}>
                            {isListening ? 'headphones' : 'assignment'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-[#2d2c38] truncate block">
                                {edata.examTitle || eid.replace('exam_official_', '').replace(/_/g, ' ')}
                              </span>
                              {isListening && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  Listening
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#8e8a9f]">
                              {edata.completedAt ? new Date(edata.completedAt).toLocaleString('es-SV') : 'Completado'}
                              {edata.byTimeout ? ' • Límite tiempo' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {edata.score !== undefined && (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono border ${
                              edata.score >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {edata.score}%
                            </span>
                          )}
                          {warnings > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {warnings} alerta(s)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-dashed border-[#eceaf6] flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-gray-400">
                          {edata.correctCount != null ? `Aciertos: ${edata.correctCount}/${edata.totalQuestions || 0}` : 'Enviado'}
                        </span>
                        {onUnlockStudentExam && (
                          <button
                            type="button"
                            onClick={() => onUnlockStudentExam(modalStudent, eid)}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title={`Resetear esta actividad (${edata.examTitle || eid}) para que el alumno pueda realizarla de nuevo`}
                          >
                            <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                            <span>Resetear esta actividad</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pie del modal */}
          <div className="p-4 bg-white border-t border-[#eceaf6] flex items-center justify-between">
            <div className="text-xs text-[#8e8a9f]">
              Total: <strong className="text-[#2d2c38]">{examEntries.length}</strong> prueba(s)
            </div>
            <button
              type="button"
              onClick={() => setSelectedStudentDetailModal(null)}
              className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si estamos en la vista de nómina de un grado específico
  if (activeRosterGradeId) {
    const currentGradeDef = GRADES_DEF.find(g => g.id === activeRosterGradeId) || { id: activeRosterGradeId, label: `${activeRosterGradeId}° Grado`, fullTitle: `${activeRosterGradeId}° Grado` }
    const currentGradeStudents = studentsByGrade[activeRosterGradeId] || []
    const currentGradeState = getGradeState(activeRosterGradeId)

    // Filtrar estudiantes de la nómina
    const filteredRosterStudents = currentGradeStudents.filter(s => {
      if (rosterFilters.section !== 'all' && s.section !== rosterFilters.section) return false
      if (rosterFilters.level !== 'all' && (s.currentLevel || s.selfReportedLevel) !== rosterFilters.level) return false
      if (rosterFilters.teacher !== 'all') {
        const tKey = rosterFilters.teacher.toLowerCase()
        const assigned = (s.assignedTeacher || '').toLowerCase()
        if (!assigned.includes(tKey)) return false
      }
      if (rosterFilters.search) {
        const q = rosterFilters.search.toLowerCase()
        const nameMatch = (s.name || '').toLowerCase().includes(q)
        const nieMatch = (s.carnet || s.nie || '').includes(q)
        if (!nameMatch && !nieMatch) return false
      }
      return true
    })

    const activeInGrade = currentGradeStudents.filter(s => {
      const stState = getStudentPlatformState(s, currentGradeState.platformStatus)
      return stState.status === 'active'
    }).length

    const completedInGrade = currentGradeStudents.filter(s => Boolean(s.assignedLevel) || Object.keys(s.completedExams || {}).length > 0).length

    return (
      <div className="space-y-6 text-left animate-fadeIn">
        {/* Barra superior de navegación para volver a reproductores */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white card-academy p-6">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                setActiveRosterGradeId(null)
                setRosterFilters({ section: 'all', level: 'all', teacher: 'all', search: '' })
              }}
              className="w-11 h-11 rounded-2xl bg-[#f8f7fc] hover:bg-[#ede9f7] text-[#5446a8] border border-[#e2e0ed] flex items-center justify-center font-bold transition-all shadow-xs cursor-pointer group"
              title="Volver a la vista de reproductores de grados"
            >
              <span className="material-symbols-outlined text-[22px] group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed]">
                  Nómina Dedicada
                </span>
                <span className="text-xs text-[#8e8a9f] font-mono">
                  {currentGradeStudents.length} alumnos registrados
                </span>
              </div>
              <h2 className="text-2xl font-heading font-black text-[#2d2c38]">
                {currentGradeDef.fullTitle}
              </h2>
            </div>
          </div>

          {/* Mini reproductor de cabecera para el grado */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-2xl bg-[#f8f7fc] border border-[#e2e0ed] flex items-center gap-2 text-xs">
              <span className="text-[#8e8a9f] font-bold">Plataforma:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                currentGradeState.platformStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : currentGradeState.platformStatus === 'finished' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
              }`}>
                {currentGradeState.platformStatus === 'active' ? 'En Vivo' : currentGradeState.platformStatus === 'finished' ? 'Cerrado' : 'Pausado'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSetGradeStatus(activeRosterGradeId, 'platform', 'active')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  currentGradeState.platformStatus === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#f8f7fc] text-[#585567] hover:bg-emerald-50 hover:text-emerald-700 border border-[#e2e0ed]'
                }`}
                title="Play Plataforma"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              </button>
              <button
                type="button"
                onClick={() => onSetGradeStatus(activeRosterGradeId, 'platform', 'paused')}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  currentGradeState.platformStatus === 'paused'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-[#f8f7fc] text-[#585567] hover:bg-amber-50 hover:text-amber-700 border border-[#e2e0ed]'
                }`}
                title="Pausar Plataforma"
              >
                <span className="material-symbols-outlined text-[18px]">pause</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Finalizar examen de plataforma para ${currentGradeDef.label}?`)) {
                    onSetGradeStatus(activeRosterGradeId, 'platform', 'finished')
                  }
                }}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  currentGradeState.platformStatus === 'finished'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-[#f8f7fc] text-[#585567] hover:bg-rose-50 hover:text-rose-700 border border-[#e2e0ed]'
                }`}
                title="Stop Plataforma"
              >
                <span className="material-symbols-outlined text-[18px]">stop</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const emails = currentGradeStudents.map(s => s.email).filter(Boolean)
                if (confirm(`¿Restablecer excepciones individuales de ${currentGradeDef.label}?`)) {
                  onResetGradeOverrides(activeRosterGradeId, emails)
                }
              }}
              className="px-3 py-2 rounded-2xl bg-[#f8f7fc] hover:bg-rose-50 text-xs font-bold text-[#585567] hover:text-rose-700 border border-[#e2e0ed] flex items-center gap-1 cursor-pointer transition-all"
              title="Quitar excepciones individuales"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset Excepciones</span>
            </button>

            {/* Toggle Visibilidad de Nivel para Alumnos */}
            {onToggleStudentLevelVisibility && (
              <button
                type="button"
                onClick={() => {
                  const nextVisible = !currentGradeState.studentLevelVisible
                  onToggleStudentLevelVisibility(activeRosterGradeId, nextVisible)
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentGradeState.studentLevelVisible
                    ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title={
                  currentGradeState.studentLevelVisible
                    ? 'Los alumnos de este grado PUEDEN ver su nivel oficial asignado en su dashboard. Clic para ocultar.'
                    : 'Nivel OCULTO para los alumnos de este grado en su dashboard. Clic para habilitar y permitir que lo vean.'
                }
              >
                <span className="material-symbols-outlined text-[17px]">
                  {currentGradeState.studentLevelVisible ? 'visibility' : 'visibility_off'}
                </span>
                <span>
                  {currentGradeState.studentLevelVisible ? 'Nivel Visible en Alumno' : 'Nivel Oculto en Alumno'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Filtros Rápida */}
        <div className="card-academy p-5 space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-black text-sm text-[#2d2c38] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7052c9] text-[20px]">tune</span>
                <span>Filtros y Búsqueda en {currentGradeDef.label}</span>
              </h3>
              <p className="text-xs text-[#8e8a9f]">
                {activeInGrade} activos en vivo • {completedInGrade} evaluados • {Math.max(0, currentGradeStudents.length - completedInGrade)} pendientes
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Buscar por carnet, nombre..."
                value={rosterFilters.search}
                onChange={(e) => setRosterFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#eceaf6] text-xs focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 bg-[#f8f7fc] text-[#2d2c38]"
              />
              <span className="material-symbols-outlined text-[18px] text-[#8e8a9f] absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#eceaf6]">
            {/* Sección */}
            <div className="flex items-center gap-1 bg-[#f8f7fc] p-1 rounded-2xl border border-[#eceaf6]">
              <span className="text-[10px] font-bold text-[#8e8a9f] uppercase px-2">Secc:</span>
              {['all', 'A', 'B', 'C', 'D'].map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setRosterFilters(prev => ({ ...prev, section: sec }))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    rosterFilters.section === sec
                      ? 'bg-[#5446a8] text-white shadow-xs'
                      : 'text-[#585567] hover:bg-white'
                  }`}
                >
                  {sec === 'all' ? 'Todas' : sec}
                </button>
              ))}
            </div>

            {/* Nivel */}
            <div className="flex items-center gap-1 bg-[#f8f7fc] p-1 rounded-2xl border border-[#eceaf6]">
              <span className="text-[10px] font-bold text-[#8e8a9f] uppercase px-2">Nivel:</span>
              {['all', 'L1-A', 'L1-B', 'L2-A', 'L2-B', 'L3'].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setRosterFilters(prev => ({ ...prev, level: lvl }))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    rosterFilters.level === lvl
                      ? 'bg-[#5446a8] text-white shadow-xs'
                      : 'text-[#585567] hover:bg-white'
                  }`}
                >
                  {lvl === 'all' ? 'Todos' : lvl}
                </button>
              ))}
            </div>

            {/* Docente */}
            <div className="flex items-center gap-1 bg-[#f8f7fc] p-1 rounded-2xl border border-[#eceaf6]">
              <span className="text-[10px] font-bold text-[#8e8a9f] uppercase px-2">Docente:</span>
              {[
                { k: 'all', label: 'Todos' },
                { k: 'ronald', label: 'Ronald' },
                { k: 'silvia', label: 'Silvia' },
                { k: 'nelsi', label: 'Nelsi' },
                { k: 'edgar', label: 'Edgar' }
              ].map(t => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setRosterFilters(prev => ({ ...prev, teacher: t.k }))}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    rosterFilters.teacher === t.k
                      ? 'bg-[#5446a8] text-white shadow-xs'
                      : 'text-[#585567] hover:bg-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {(rosterFilters.section !== 'all' || rosterFilters.level !== 'all' || rosterFilters.teacher !== 'all' || rosterFilters.search) && (
              <button
                type="button"
                onClick={() => setRosterFilters({ section: 'all', level: 'all', teacher: 'all', search: '' })}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-[#8e8a9f] hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">clear</span>
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Cuadrícula de Alumnos de la Nómina (Diseño Ultra Clean estilo SaaS / Access Control) */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#8e8a9f] font-bold px-1 mb-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8a70d6]"></span>
              <span>Mostrando {filteredRosterStudents.length} de {currentGradeStudents.length} alumnos de {currentGradeDef.label}</span>
            </span>
          </div>

          {filteredRosterStudents.length === 0 ? (
            <div className="bg-white rounded-3xl p-14 text-center text-[#8e8a9f] text-xs italic border border-[#eceaf6] shadow-sm">
              <span className="material-symbols-outlined text-[36px] text-[#8e8a9f]/50 block mb-2">person_search</span>
              No se encontraron alumnos con los criterios seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredRosterStudents.map((st) => {
                const pState = getStudentPlatformState(st, currentGradeState.platformStatus)
                const isPlatformPlaying = pState.status === 'active'
                const completed = st.completedExams || {}
                const completedCount = Object.keys(completed).length
                const isEvaluatedOral = Boolean(st.assignedLevel)

                // Inicial para avatar suave
                const initial = (st.name || 'A').trim().charAt(0).toUpperCase()

                return (
                  <div
                    key={st.email || st.carnet}
                    className={`bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                      pState.isOverride
                        ? 'border-[#8a70d6]/50 ring-2 ring-[#e9e3ff]'
                        : 'border-[#eceaf6] hover:border-[#d8d5e8]'
                    }`}
                  >
                    {/* Header: Título Alumno + Badge Estado */}
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-heading font-black text-[15px] text-[#1e1c2a] leading-tight" title={st.name}>
                              {st.name}
                            </h4>
                            {pState.isOverride && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed]">
                                Excepción
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8e8a9f] font-mono">
                            NIE: {st.carnet || st.nie || 'N/A'} • {st.grade || ''} {st.section || 'A'}
                          </p>
                        </div>

                        {/* Badge de Nivel estilo Access Control */}
                        {isEvaluatedOral ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Nivel {st.assignedLevel}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#fbf9ff] text-[#8e8a9f] border border-[#eceaf6] shrink-0">
                            Pendiente
                          </span>
                        )}
                      </div>

                      {/* Contenedor Interior tipo "MEMBERS / DATA ITEM" de la referencia */}
                      <div className="bg-[#fbfbfd] p-3.5 rounded-2xl border border-[#eceaf6] space-y-3">
                        {/* Fila 1: Docente & Asignación */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-[#e9e3ff] text-[#5446a8] font-black text-xs flex items-center justify-center shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-bold text-[#8e8a9f] block leading-none">Docente Titular</span>
                              <span className="text-xs font-bold text-[#2d2c38] truncate block mt-0.5">
                                {st.assignedTeacher || 'Sin asignar'}
                              </span>
                            </div>
                          </div>

                          {/* Botón Llamar a Entrevista tipo botón minimalista "View only / Full access" */}
                          <button
                            type="button"
                            onClick={() => {
                              onSetStudentStatus(st.email, 'interview', 'active')
                              onCallInterviewStudent(st)
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed] text-xs font-bold transition-all shadow-2xs hover:border-[#8a70d6] flex items-center gap-1 cursor-pointer shrink-0"
                            title="Llamar a entrevista oral y calificar rúbrica"
                          >
                            <span className="material-symbols-outlined text-[15px]">record_voice_over</span>
                            <span>Llamar</span>
                          </button>
                        </div>

                        {/* Fila divisoria punteada con estado de pruebas y botón de reset / auditoría */}
                        <div className="border-t border-dashed border-[#eceaf6] pt-2.5 flex items-center justify-between text-[11px] gap-2">
                          <span className="text-[#8e8a9f] font-medium flex items-center gap-1 shrink-0">
                            <span className="material-symbols-outlined text-[14px] text-[#8a70d6]">fact_check</span>
                            <span>Pruebas Digitales:</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-bold text-[#2d2c38]">
                              {completedCount > 0 ? (
                                <span className="text-emerald-700">{completedCount} test(s)</span>
                              ) : (
                                <span className="text-[#8e8a9f]">Sin iniciar</span>
                              )}
                            </span>
                            {completedCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedStudentDetailModal(st)}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-[#5446a8] bg-[#f4f1fd] hover:bg-[#e9e3ff] border border-[#e2e0ed] transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Ver detalle de exámenes realizados y resetear actividades individuales o todas"
                              >
                                <span className="material-symbols-outlined text-[13px]">visibility</span>
                                <span>Detalle</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Control de Acceso Oscura estilo SSO Enforcement de la referencia */}
                    <div className="bg-[#1e1c2a] text-white p-3 px-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isPlatformPlaying ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`}></span>
                        <div>
                          <span className="text-[11px] font-black uppercase tracking-wider block text-white/90">
                            Prueba Plataforma
                          </span>
                          <span className="text-[10px] text-white/60 block leading-tight">
                            {isPlatformPlaying ? 'Habilitado y en vivo' : 'Pausado para este alumno'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {pState.isOverride && (
                          <button
                            type="button"
                            onClick={() => onResetGradeOverrides(activeRosterGradeId, [st.email])}
                            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 text-xs transition-colors cursor-pointer"
                            title="Restablecer excepción y heredar estado del grado"
                          >
                            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                          </button>
                        )}

                        {/* Toggle switch activo/pausa como en la referencia */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = isPlatformPlaying ? 'paused' : 'active'
                            onSetStudentStatus(st.email, 'platform', nextStatus)
                          }}
                          className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                            isPlatformPlaying ? 'bg-emerald-500' : 'bg-gray-700'
                          }`}
                          title={isPlatformPlaying ? 'Pausar acceso al alumno' : 'Dar play al alumno'}
                        >
                          <div
                            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                              isPlatformPlaying ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          ></div>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal de Detalle de Evaluaciones en la Nómina */}
        {renderStudentDetailModal()}
      </div>
    )
  }

  // VISTA PRINCIPAL: TARJETAS TIPO REPRODUCTOR (MÁXIMO 3 CARDS POR FILA)
  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Banner / Cabecera Principal */}
      <div className="bg-gradient-to-r from-[#e9e3ff] via-[#f4f1fd] to-[#fbfbfb] rounded-4xl p-7 border border-[#e2e0ed] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-[#5446a8] border border-[#d8ceff] shadow-2xs">
              Consola de Despacho 2026
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Sincronización en Vivo</span>
            </div>
          </div>
          <h2 className="text-2xl lg:text-3xl font-heading font-black text-[#2d2c38] tracking-tight">
            Panel de Despacho y Control por Grados
          </h2>
          <p className="text-xs text-[#8e8a9f] max-w-2xl font-medium">
            Controla la emisión en vivo de cada grado con los reproductores independientes. Pulsa <strong>"Ver Nómina"</strong> para abrir la lista completa de alumnos y aplicar excepciones personalizadas.
          </p>
        </div>

        {/* Resumen Global de Alumnos */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-3xl border border-[#eceaf6] shadow-xs shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-[#f4f1fd] text-[#7052c9] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[22px]">groups</span>
          </div>
          <div className="text-right pr-1">
            <span className="text-[10px] uppercase font-bold text-[#8e8a9f] block">Total Matrícula</span>
            <span className="font-heading font-black text-xl text-[#2d2c38] leading-tight">
              {students.length}
            </span>
          </div>
        </div>
      </div>

      {/* CUADRÍCULA DE REPRODUCTORES (3 COLUMNAS: 2 FILAS DE 3 CARDS PARA LOS 6 GRADOS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {GRADES_DEF.map(gDef => {
          const gId = gDef.id
          const gState = getGradeState(gId)
          const gradeStudents = studentsByGrade[gId] || []

          const totalInGrade = gradeStudents.length
          const completedInGrade = gradeStudents.filter(s => Boolean(s.assignedLevel) || Object.keys(s.completedExams || {}).length > 0).length
          const activeInGrade = gradeStudents.filter(s => {
            const stState = getStudentPlatformState(s, gState.platformStatus)
            return stState.status === 'active'
          }).length

          const isPlatformActive = gState.platformStatus === 'active'
          const isPlatformPaused = gState.platformStatus === 'paused'
          const isPlatformFinished = gState.platformStatus === 'finished'

          const isInterviewActive = gState.interviewStatus === 'active'
          const isInterviewPaused = gState.interviewStatus === 'paused'
          const isInterviewFinished = gState.interviewStatus === 'finished'

          const percentCompleted = totalInGrade > 0 ? Math.round((completedInGrade / totalInGrade) * 100) : 0

          return (
            <div
              key={gId}
              className={`card-academy p-5 flex flex-col justify-between transition-all duration-200 relative group hover:shadow-lg ${
                isPlatformActive
                  ? 'border-emerald-300 ring-2 ring-emerald-100 bg-gradient-to-b from-white via-white to-emerald-50/20'
                  : 'hover:border-[#8a70d6]/40'
              }`}
            >
              {/* Badge Circular "En Vivo" en la esquina superior derecha */}
              {isPlatformActive && (
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 shadow-2xs z-10 animate-fadeIn">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                    En Vivo
                  </span>
                </div>
              )}

              {/* Encabezado del Grado / Reproductor */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 pr-20">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#f4f1fd] text-[#5446a8] border border-[#e2e0ed]">
                    {gDef.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#8e8a9f]">
                    {totalInGrade} alumnos
                  </span>
                </div>

                <div>
                  <h3 className="font-heading font-black text-lg text-[#2d2c38] tracking-tight group-hover:text-[#5446a8] transition-colors" title={gDef.fullTitle}>
                    {gDef.fullTitle}
                  </h3>
                  <p className="text-[11px] text-[#8e8a9f] mt-0.5 font-medium truncate">
                    {activeInGrade} activos • {completedInGrade} con avance
                  </p>
                </div>

                {/* Barra de progreso de avance */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-[#8e8a9f]">Avance</span>
                    <span className="text-[#5446a8]">{percentCompleted}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#f4f1fd] overflow-hidden border border-[#eceaf6]">
                    <div
                      className="h-full bg-gradient-to-r from-[#8a70d6] to-[#7052c9] rounded-full transition-all duration-500"
                      style={{ width: `${percentCompleted}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* CONSOLA TIPO REPRODUCTOR (DECK DUAL) */}
              <div className="my-4 p-3.5 rounded-2xl bg-[#f8f7fc] border border-[#eceaf6] space-y-3">
                {/* Canal 1: Plataforma Digital */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-blue-600">desktop_windows</span>
                      <span className="text-xs font-black text-[#2d2c38]">Plataforma</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      isPlatformActive ? 'bg-emerald-100 text-emerald-800' : isPlatformFinished ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {isPlatformActive ? '● En Vivo' : isPlatformFinished ? '● Cerrada' : '● Pausada'}
                    </span>
                  </div>

                  {/* Controles tipo Reproductor Multimedia (Play, Pause, Stop) */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border border-[#eceaf6] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onSetGradeStatus(gId, 'platform', 'active')}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isPlatformActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[#585567] hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title="Iniciar o reanudar examen en plataforma"
                    >
                      <span className="material-symbols-outlined text-[17px]">play_arrow</span>
                      <span className="text-[11px]">Play</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSetGradeStatus(gId, 'platform', 'paused')}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isPlatformPaused
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-[#585567] hover:bg-amber-50 hover:text-amber-700'
                      }`}
                      title="Pausar y congelar cronómetro en vivo"
                    >
                      <span className="material-symbols-outlined text-[17px]">pause</span>
                      <span className="text-[11px]">Pausa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Finalizar definitivamente el examen de plataforma para ${gDef.label}?`)) {
                          onSetGradeStatus(gId, 'platform', 'finished')
                        }
                      }}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isPlatformFinished
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-[#585567] hover:bg-rose-50 hover:text-rose-700'
                      }`}
                      title="Finalizar y cerrar examen de plataforma"
                    >
                      <span className="material-symbols-outlined text-[17px]">stop</span>
                      <span className="text-[11px]">Cerrar</span>
                    </button>
                  </div>
                </div>

                {/* Canal 2: Entrevista Oral */}
                <div className="space-y-1.5 pt-2 border-t border-[#eceaf6]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#7052c9]">record_voice_over</span>
                      <span className="text-xs font-black text-[#2d2c38]">Oral</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      isInterviewActive ? 'bg-emerald-100 text-emerald-800' : isInterviewFinished ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {isInterviewActive ? '● Activa' : isInterviewFinished ? '● Cerrada' : '● Pausa'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-xl border border-[#eceaf6] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onSetGradeStatus(gId, 'interview', 'active')}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isInterviewActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[#585567] hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title="Habilitar bloque de entrevistas orales"
                    >
                      <span className="material-symbols-outlined text-[17px]">play_arrow</span>
                      <span className="text-[11px]">Play</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSetGradeStatus(gId, 'interview', 'paused')}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isInterviewPaused
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-[#585567] hover:bg-amber-50 hover:text-amber-700'
                      }`}
                      title="Pausar entrevistas orales"
                    >
                      <span className="material-symbols-outlined text-[17px]">pause</span>
                      <span className="text-[11px]">Pausa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Finalizar el ciclo de entrevistas orales para ${gDef.label}?`)) {
                          onSetGradeStatus(gId, 'interview', 'finished')
                        }
                      }}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isInterviewFinished
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-[#585567] hover:bg-rose-50 hover:text-rose-700'
                      }`}
                      title="Cerrar entrevistas orales de este grado"
                    >
                      <span className="material-symbols-outlined text-[17px]">stop</span>
                      <span className="text-[11px]">Cerrar</span>
                    </button>
                  </div>
                </div>

                {/* Canal 3: Visibilidad de Nivel en Dashboard del Alumno */}
                <div className="space-y-1.5 pt-2 border-t border-[#eceaf6]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-teal-600">
                        {gState.studentLevelVisible ? 'visibility' : 'visibility_off'}
                      </span>
                      <span className="text-xs font-black text-[#2d2c38]">Ver Nivel (Alumno)</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      gState.studentLevelVisible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {gState.studentLevelVisible ? '● Habilitado' : '● Oculto'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-[#eceaf6] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onToggleStudentLevelVisibility && onToggleStudentLevelVisibility(gId, true)}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        gState.studentLevelVisible
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[#585567] hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title="Permitir que los estudiantes de este grado vean su nivel asignado en su dashboard"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span className="text-[11px]">Habilitar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleStudentLevelVisibility && onToggleStudentLevelVisibility(gId, false)}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        !gState.studentLevelVisible
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'text-[#585567] hover:bg-slate-100 hover:text-slate-800'
                      }`}
                      title="Ocultar el nivel asignado a los estudiantes de este grado (mostrará en revisión)"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                      <span className="text-[11px]">Ocultar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón Principal: Ir a la Nómina Dedicada (cambia a la vista completa de alumnos) */}
              <button
                type="button"
                onClick={() => {
                  setActiveRosterGradeId(gId)
                  setRosterFilters({ section: 'all', level: 'all', teacher: 'all', search: '' })
                }}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-[#f4f1fd] text-[#5446a8] hover:text-[#7052c9] border border-[#e2e0ed] font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer group/btn"
              >
                <span>Ver Nómina ({totalInGrade})</span>
                <span className="material-symbols-outlined text-[17px] group-hover/btn:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal de Detalle de Evaluaciones (permite resetear una a una o todas) */}
      {renderStudentDetailModal()}
    </div>
  )
}

