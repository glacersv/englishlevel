import React, { useState, useMemo } from 'react'

/**
 * Grados oficiales contemplados en el plan:
 * 7° Grado, 8° Grado, 9° Grado, 1° Bachillerato (10°), 2° Bachillerato (11°)
 */
const GRADES_DEF = [
  { id: '7', label: '7° Grado', fullTitle: '7° Grado (Educación Básica)' },
  { id: '8', label: '8° Grado', fullTitle: '8° Grado (Educación Básica)' },
  { id: '9', label: '9° Grado', fullTitle: '9° Grado (Tercer Ciclo)' },
  { id: '10', label: '1° Bachillerato', fullTitle: '1° Bachillerato (10° Grado)' },
  { id: '11', label: '2° Bachillerato', fullTitle: '2° Bachillerato (11° Grado)' }
]

export default function GradeDispatchHub({
  students = [],
  dispatchConfig = {},
  onSetGradeStatus,
  onSetStudentStatus,
  onResetGradeOverrides,
  onCallInterviewStudent,
  currentTeacher
}) {
  // Acordeón: id de grado expandido (o null)
  const [expandedGrade, setExpandedGrade] = useState('7')

  // Filtros por grado: { [gradeId]: { section, level, teacher, search } }
  const [filters, setFilters] = useState({})

  // Actualizar filtros específicos de un grado
  const updateGradeFilter = (gradeId, field, value) => {
    setFilters(prev => ({
      ...prev,
      [gradeId]: {
        ...(prev[gradeId] || {}),
        [field]: value
      }
    }))
  }

  // Agrupar alumnos por grado
  const studentsByGrade = useMemo(() => {
    const map = { '7': [], '8': [], '9': [], '10': [], '11': [] }
    students.forEach(s => {
      const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
      let targetKey = null

      if (gStr.includes('7°') || s.codigoGrado === '07') targetKey = '7'
      else if (gStr.includes('8°') || s.codigoGrado === '08') targetKey = '8'
      else if (gStr.includes('9°') || s.codigoGrado === '09') targetKey = '9'
      else if (gStr.includes('10°') || gStr.includes('1° Bach') || s.codigoGrado === '10') targetKey = '10'
      else if (gStr.includes('11°') || gStr.includes('2° Bach') || s.codigoGrado === '11') targetKey = '11'
      else if (gStr.includes('12°') || gStr.includes('3° Bach') || s.codigoGrado === '32') targetKey = '11' // agrupar bachillerato técnico

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-fadeIn">
      {/* Cabecera del Hub */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">hub</span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-900 leading-tight">
                Panel de Despacho y Control por Grados
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Gestión simultánea de Pruebas de Plataforma y Entrevistas Orales
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed pt-1">
            Todos los grados inician en pausa por protocolo de seguridad. Activa, pausa o finaliza los instrumentos de cada grado de manera independiente, o aplica excepciones individuales para alumnos específicos.
          </p>
        </div>

        {/* Resumen rápido de sincronización */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Transmisión en Vivo Firestore</span>
        </div>
      </div>

      {/* Listado de Acordeones por Grado */}
      <div className="space-y-4">
        {GRADES_DEF.map(gDef => {
          const gId = gDef.id
          const isExpanded = expandedGrade === gId
          const gState = getGradeState(gId)
          const gradeStudents = studentsByGrade[gId] || []

          // Filtros activos para este grado
          const gFilter = filters[gId] || { section: 'all', level: 'all', teacher: 'all', search: '' }

          // Métricas del grado
          const totalInGrade = gradeStudents.length
          const completedInGrade = gradeStudents.filter(s => Boolean(s.assignedLevel) || Object.keys(s.completedExams || {}).length > 0).length
          const activeInGrade = gradeStudents.filter(s => {
            const stState = getStudentPlatformState(s, gState.platformStatus)
            return stState.status === 'active'
          }).length

          // Filtrar alumnos desplegados
          const displayedStudents = gradeStudents.filter(s => {
            // Filtro sección
            if (gFilter.section !== 'all' && s.section !== gFilter.section) return false
            // Filtro nivel
            if (gFilter.level !== 'all' && (s.currentLevel || s.selfReportedLevel) !== gFilter.level) return false
            // Filtro docente
            if (gFilter.teacher !== 'all') {
              const tKey = gFilter.teacher.toLowerCase()
              const assigned = (s.assignedTeacher || '').toLowerCase()
              if (!assigned.includes(tKey)) return false
            }
            // Búsqueda por texto
            if (gFilter.search) {
              const q = gFilter.search.toLowerCase()
              const nameMatch = (s.name || '').toLowerCase().includes(q)
              const nieMatch = (s.carnet || s.nie || '').includes(q)
              if (!nameMatch && !nieMatch) return false
            }
            return true
          })

          return (
            <div
              key={gId}
              className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                isExpanded ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Cabecera de la Tarjeta del Grado */}
              <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                {/* Nombre y Badges de Estado */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedGrade(isExpanded ? null : gId)}
                    className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold transition-transform cursor-pointer shrink-0"
                    title={isExpanded ? 'Plegar nómina' : 'Desplegar nómina de alumnos'}
                  >
                    <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-heading font-black text-slate-900">
                        {gDef.fullTitle}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-200/80 text-slate-700">
                        {totalInGrade} alumnos
                      </span>
                    </div>

                    {/* Resumen rápido de avance */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <strong>{activeInGrade}</strong> activos
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <strong>{completedInGrade}</strong> con avance
                      </span>
                      <span>•</span>
                      <span>{Math.max(0, totalInGrade - completedInGrade)} pendientes</span>
                    </div>
                  </div>
                </div>

                {/* BOTONERA DUAL INDEPENDIENTE: PLATAFORMA & ENTREVISTA */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                  {/* CONTROL 1: EXAMEN DE PLATAFORMA */}
                  <div className="p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1">
                      <span className="material-symbols-outlined text-[18px] text-blue-600">desktop_windows</span>
                      <span className="text-[11px] font-bold text-slate-700 hidden sm:inline">Plataforma:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        gState.platformStatus === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : gState.platformStatus === 'finished'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {gState.platformStatus === 'active' ? '🟢 En Vivo' : gState.platformStatus === 'finished' ? '🔴 Cerrado' : '🟡 Pausado'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                      {/* Play Plataforma */}
                      <button
                        type="button"
                        onClick={() => onSetGradeStatus(gId, 'platform', 'active')}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          gState.platformStatus === 'active'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                        title="Iniciar / Reanudar Examen en Plataforma para este grado"
                      >
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      </button>

                      {/* Pausa Plataforma */}
                      <button
                        type="button"
                        onClick={() => onSetGradeStatus(gId, 'platform', 'paused')}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          gState.platformStatus === 'paused'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                        title="Pausar y congelar cronómetro en vivo a todos los alumnos de este grado"
                      >
                        <span className="material-symbols-outlined text-[18px]">pause</span>
                      </button>

                      {/* Stop / Finalizar Plataforma */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Finalizar y cerrar definitivamente el examen de plataforma para ${gDef.label}?`)) {
                            onSetGradeStatus(gId, 'platform', 'finished')
                          }
                        }}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          gState.platformStatus === 'finished'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                        title="Finalizar y cerrar examen de plataforma para este grado"
                      >
                        <span className="material-symbols-outlined text-[18px]">stop</span>
                      </button>
                    </div>
                  </div>

                  {/* CONTROL 2: ENTREVISTA ORAL */}
                  <div className="p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1">
                      <span className="material-symbols-outlined text-[18px] text-indigo-600">record_voice_over</span>
                      <span className="text-[11px] font-bold text-slate-700 hidden sm:inline">Oral:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        gState.interviewStatus === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : gState.interviewStatus === 'finished'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {gState.interviewStatus === 'active' ? '🟢 Activa' : gState.interviewStatus === 'finished' ? '🔴 Cerrada' : '🟡 Pausa'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                      {/* Play Entrevista */}
                      <button
                        type="button"
                        onClick={() => onSetGradeStatus(gId, 'interview', 'active')}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          gState.interviewStatus === 'active'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                        title="Habilitar bloque de entrevistas orales para este grado"
                      >
                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      </button>

                      {/* Pausa Entrevista */}
                      <button
                        type="button"
                        onClick={() => onSetGradeStatus(gId, 'interview', 'paused')}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          gState.interviewStatus === 'paused'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                        title="Pausar entrevistas orales de este grado"
                      >
                        <span className="material-symbols-outlined text-[18px]">pause</span>
                      </button>

                      {/* Stop / Finalizar Entrevista */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Finalizar el ciclo de entrevistas orales para ${gDef.label}?`)) {
                            onSetGradeStatus(gId, 'interview', 'finished')
                          }
                        }}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          gState.interviewStatus === 'finished'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                        title="Cerrar entrevistas orales de este grado"
                      >
                        <span className="material-symbols-outlined text-[18px]">stop</span>
                      </button>
                    </div>
                  </div>

                  {/* Botón rápido para desplegar */}
                  <button
                    type="button"
                    onClick={() => setExpandedGrade(isExpanded ? null : gId)}
                    className="px-3.5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Ocultar Nómina' : 'Ver Nómina'}</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
              </div>

              {/* CONTENIDO DESPLEGABLE DEL ACORDEÓN: FILTROS + NÓMINA INDIVIDUAL */}
              {isExpanded && (
                <div className="p-5 sm:p-6 border-t border-slate-200 space-y-5 animate-fadeIn">
                  {/* BARRA DE FILTROS INSTANTÁNEOS DEL GRADO */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-indigo-600">filter_alt</span>
                        <span>Filtros instantáneos para {gDef.label}:</span>
                      </span>

                      {/* Limpiar overrides del grado */}
                      <button
                        type="button"
                        onClick={() => {
                          const emails = gradeStudents.map(s => s.email).filter(Boolean)
                          if (confirm(`¿Deseas restablecer todas las excepciones individuales de ${gDef.label} al estado general del grado?`)) {
                            onResetGradeOverrides(gId, emails)
                          }
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                        title="Quitar excepciones individuales de alumnos de este grado"
                      >
                        <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                        <span>Restablecer Excepciones Individuales</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Píldoras de Sección */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Sección
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {['all', 'A', 'B', 'C', 'D'].map(sec => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => updateGradeFilter(gId, 'section', sec)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                gFilter.section === sec
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              {sec === 'all' ? 'Todas' : `Secc. ${sec}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Píldoras de Nivel Institucional */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Nivel de Inglés
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {['all', 'L1-A', 'L1-B', 'L2-A', 'L2-B', 'L3'].map(lvl => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => updateGradeFilter(gId, 'level', lvl)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                gFilter.level === lvl
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              {lvl === 'all' ? 'Todos' : lvl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Docente Asignado */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Docente Evaluador
                        </label>
                        <select
                          value={gFilter.teacher}
                          onChange={(e) => updateGradeFilter(gId, 'teacher', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800"
                        >
                          <option value="all">Todos los Docentes</option>
                          <option value="ronald">Teacher Ronald</option>
                          <option value="silvia">Teacher Silvia</option>
                          <option value="nelsi">Teacher Nelsi</option>
                          <option value="edgar">Teacher Edgar</option>
                        </select>
                      </div>

                      {/* Buscador por Texto */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Buscar Alumno
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Nombre, Apellido o NIE..."
                            value={gFilter.search}
                            onChange={(e) => updateGradeFilter(gId, 'search', e.target.value)}
                            className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 placeholder:text-slate-400"
                          />
                          <span className="material-symbols-outlined absolute left-2 top-1.5 text-slate-400 text-[16px]">
                            search
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NÓMINA DE ALUMNOS DEL GRADO CON CONTROLES INDIVIDUALES */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                      <span>Mostrando {displayedStudents.length} de {gradeStudents.length} alumnos de {gDef.label}</span>
                    </div>

                    {displayedStudents.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                        No se encontraron alumnos en este grado con los filtros seleccionados.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                        {displayedStudents.map((st) => {
                          const pState = getStudentPlatformState(st, gState.platformStatus)
                          const isPlatformPlaying = pState.status === 'active'

                          const completed = st.completedExams || {}
                          const completedCount = Object.keys(completed).length
                          const isEvaluatedOral = Boolean(st.assignedLevel)

                          return (
                            <div
                              key={st.email || st.carnet}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                pState.isOverride
                                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {/* Info Alumno */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-heading font-black text-xs text-slate-900 leading-snug">
                                      {st.name}
                                    </span>
                                    {pState.isOverride && (
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                        Excepción
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                    <span className="font-mono text-slate-600">NIE: {st.carnet || st.nie || 'N/A'}</span>
                                    <span>•</span>
                                    <span>Secc. {st.section || 'A'}</span>
                                    <span>•</span>
                                    <span className="text-indigo-600 font-bold">{st.currentLevel || st.selfReportedLevel || 'L1'}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Docente: {st.assignedTeacher || 'Equipo Docente'}
                                  </div>
                                </div>

                                {/* Estado Rápido */}
                                <div className="text-right shrink-0 space-y-1">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    isEvaluatedOral
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {isEvaluatedOral ? `Oral: ${st.assignedLevel}` : 'Oral Pendiente'}
                                  </span>
                                  <div className="text-[10px] font-mono text-slate-500">
                                    {completedCount > 0 ? `${completedCount} tests hechos` : '0 tests'}
                                  </div>
                                </div>
                              </div>

                              {/* CONTROLES INDIVIDUALES POR ALUMNO */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                {/* Control 1: Plataforma Individual (Play / Pausa) */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextStatus = isPlatformPlaying ? 'paused' : 'active'
                                      onSetStudentStatus(st.email, 'platform', nextStatus)
                                    }}
                                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isPlatformPlaying
                                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    }`}
                                    title={isPlatformPlaying ? 'Pausar a este alumno' : 'Habilitar Play individual a este alumno'}
                                  >
                                    <span className="material-symbols-outlined text-[15px]">
                                      {isPlatformPlaying ? 'pause' : 'play_arrow'}
                                    </span>
                                    <span>{isPlatformPlaying ? 'Pausar Alumno' : 'Play Individual'}</span>
                                  </button>

                                  {pState.isOverride && (
                                    <button
                                      type="button"
                                      onClick={() => onResetGradeOverrides(gId, [st.email])}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 text-[11px]"
                                      title="Quitar excepción y volver al estado general del grado"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">close</span>
                                    </button>
                                  )}
                                </div>

                                {/* Control 2: Entrevista Individual Inmediata */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Activar override de entrevista para el alumno y abrir la consola oral con rúbrica
                                    onSetStudentStatus(st.email, 'interview', 'active')
                                    onCallInterviewStudent(st)
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                  title="Pasar al alumno inmediatamente a la entrevista oral con su rúbrica"
                                >
                                  <span className="material-symbols-outlined text-[15px]">record_voice_over</span>
                                  <span>Llamar a Entrevista</span>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
