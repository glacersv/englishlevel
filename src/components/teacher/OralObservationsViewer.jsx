import React, { useMemo, useState } from 'react'

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1']

/**
 * Extrae todas las observaciones no vacías de una evaluación oral,
 * ordenadas por nivel MCER (A1 → C1).
 */
export function extractOralObservations(evaluation) {
  if (!evaluation || !evaluation.levelsEvaluated) return []
  const entries = Object.entries(evaluation.levelsEvaluated)
  entries.sort(([a], [b]) => {
    const ia = CEFR_ORDER.indexOf(a.toUpperCase())
    const ib = CEFR_ORDER.indexOf(b.toUpperCase())
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return entries
    .map(([level, data]) => ({
      level,
      comments: typeof data?.comments === 'string' ? data.comments.trim() : '',
      scoreTotal: data?.scoreTotal ?? null
    }))
    .filter(item => item.comments.length > 0)
}

function normalizeGrade(gradeStr) {
  const match = String(gradeStr || '').match(/\d+/)
  return match ? match[0] : ''
}

export default function OralObservationsViewer({
  evaluations = [],
  students = [],
  academic = { grades: [], sections: [] },
  onOpenDetail,
  onOpenVerdict
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [onlyWithComments, setOnlyWithComments] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Enriquecer evaluaciones con sus observaciones extraídas y docente normalizado
  const enrichedEvaluations = useMemo(() => {
    return evaluations
      .map(ev => {
        const observations = extractOralObservations(ev)
        const gradeNum = normalizeGrade(ev.grade)
        const teacherLabel = ev.teacherName || ev.teacherEmail || 'Docente no especificado'
        return {
          ...ev,
          observations,
          hasObservations: observations.length > 0,
          gradeNum,
          teacherLabel
        }
      })
      .sort((a, b) => {
        const da = new Date(a.completedAt || a.createdAt || 0).getTime()
        const db = new Date(b.completedAt || b.createdAt || 0).getTime()
        return db - da
      })
  }, [evaluations])

  // Lista dinámica de docentes que han evaluado
  const teacherOptions = useMemo(() => {
    const map = new Map()
    enrichedEvaluations.forEach(ev => {
      const key = (ev.teacherEmail || ev.teacherName || '').toLowerCase().trim()
      if (key && !map.has(key)) {
        map.set(key, ev.teacherLabel)
      }
    })
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }))
  }, [enrichedEvaluations])

  // KPIs
  const totalWithObs = useMemo(
    () => enrichedEvaluations.filter(ev => ev.hasObservations).length,
    [enrichedEvaluations]
  )
  const totalObsNotes = useMemo(
    () => enrichedEvaluations.reduce((sum, ev) => sum + ev.observations.length, 0),
    [enrichedEvaluations]
  )

  // Filtrado
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return enrichedEvaluations.filter(ev => {
      if (onlyWithComments && !ev.hasObservations) return false
      if (gradeFilter !== 'all' && ev.gradeNum !== gradeFilter) return false
      if (levelFilter !== 'all' && (ev.finalLevel || '').toUpperCase() !== levelFilter) return false
      if (teacherFilter !== 'all') {
        const tKey = (ev.teacherEmail || ev.teacherName || '').toLowerCase().trim()
        if (tKey !== teacherFilter) return false
      }
      if (q) {
        const inStudent =
          (ev.studentName || '').toLowerCase().includes(q) ||
          (ev.studentCarnet || '').toLowerCase().includes(q) ||
          (ev.studentEmail || '').toLowerCase().includes(q)
        const inComments = ev.observations.some(o =>
          o.comments.toLowerCase().includes(q) || o.level.toLowerCase().includes(q)
        )
        const inTeacher = ev.teacherLabel.toLowerCase().includes(q)
        if (!inStudent && !inComments && !inTeacher) return false
      }
      return true
    })
  }, [enrichedEvaluations, onlyWithComments, gradeFilter, levelFilter, teacherFilter, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage])

  const resetFilters = () => {
    setSearchTerm('')
    setGradeFilter('all')
    setLevelFilter('all')
    setTeacherFilter('all')
    setPage(1)
  }

  // Exportar observaciones filtradas a CSV (UTF-8 BOM para Excel)
  const handleExportCSV = () => {
    const headers = [
      'Carnet',
      'Estudiante',
      'Correo',
      'Grado',
      'Seccion',
      'Nivel Final',
      'Docente Evaluador',
      'Fecha',
      'Observaciones por Nivel'
    ]
    const escapeCSV = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const rows = filtered.map(ev => {
      const obsText = ev.observations.length > 0
        ? ev.observations.map(o => `[${o.level}${o.scoreTotal != null ? ` · ${o.scoreTotal} pts` : ''}]: ${o.comments}`).join(' | ')
        : 'Sin observaciones registradas'
      const dateStr = ev.completedAt ? new Date(ev.completedAt).toLocaleString('es-SV') : ''
      return [
        ev.studentCarnet || '',
        ev.studentName || '',
        ev.studentEmail || '',
        ev.grade || '',
        ev.section || '',
        ev.finalLevel || '',
        ev.teacherLabel || '',
        dateStr,
        obsText
      ].map(escapeCSV).join(',')
    })

    const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `observaciones_entrevista_oral_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const gradeOptions = useMemo(() => {
    if (academic?.grades?.length > 0) {
      return academic.grades.map(g => ({
        id: String(g.id),
        label: g.id ? `${parseInt(g.id, 10)}°` : g.label
      }))
    }
    return ['6', '7', '8', '9', '10', '11', '12'].map(id => ({ id, label: `${id}°` }))
  }, [academic])

  const hasActiveFilters = searchTerm || gradeFilter !== 'all' || levelFilter !== 'all' || teacherFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-[#2528b7] via-[#4f46e5] to-[#6d28d9] rounded-3xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-indigo-100 text-xs font-bold border border-white/15">
              <span className="material-symbols-outlined text-[15px]">speaker_notes</span>
              <span>Bitácora Cualitativa de Speaking & Listening</span>
            </div>
            <h2 className="text-2xl font-black font-heading tracking-tight">
              Observaciones de la Entrevista Oral
            </h2>
            <p className="text-indigo-100/85 text-xs sm:text-sm max-w-2xl">
              Consulta, busca y filtra los comentarios que los docentes registraron durante las entrevistas orales por nivel MCER (A1–C1), sin tener que abrir acta por acta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shrink-0">
            <div className="text-center px-2.5">
              <span className="text-[10px] uppercase font-bold text-indigo-200 block">Con Observaciones</span>
              <span className="text-2xl font-black text-white">{totalWithObs}</span>
            </div>
            <div className="w-[1px] h-8 bg-white/20" />
            <div className="text-center px-2.5">
              <span className="text-[10px] uppercase font-bold text-indigo-200 block">Total Notas</span>
              <span className="text-2xl font-black text-amber-300">{totalObsNotes}</span>
            </div>
            <div className="w-[1px] h-8 bg-white/20" />
            <div className="text-center px-2.5">
              <span className="text-[10px] uppercase font-bold text-indigo-200 block">Entrevistas</span>
              <span className="text-2xl font-black text-emerald-300">{evaluations.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="card-academy p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por alumno, carnet, docente o palabra clave en la observación..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#eceaf6] text-xs focus:outline-none focus:ring-2 focus:ring-[#8a70d6]/30 bg-[#f8f7fc] text-[#2d2c38]"
            />
            <span className="material-symbols-outlined text-[18px] text-[#8e8a9f] absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Toggle solo con observaciones */}
            <button
              type="button"
              onClick={() => {
                setOnlyWithComments(prev => !prev)
                setPage(1)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                onlyWithComments
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-[#f8f7fc] text-[#585567] border-[#eceaf6] hover:bg-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {onlyWithComments ? 'filter_alt' : 'list_alt'}
              </span>
              <span>{onlyWithComments ? 'Solo con observaciones' : 'Todas las entrevistas'}</span>
            </button>

            {/* Exportar CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Exportar CSV ({filtered.length})</span>
            </button>
          </div>
        </div>

        {/* Filtros secundarios */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#eceaf6]/70">
          {/* Grado */}
          <div className="flex items-center gap-1 bg-[#f8f7fc] p-1 rounded-2xl border border-[#eceaf6] flex-wrap">
            <span className="text-[10px] font-bold text-[#8e8a9f] uppercase px-2">Grado:</span>
            <button
              type="button"
              onClick={() => { setGradeFilter('all'); setPage(1) }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gradeFilter === 'all' ? 'bg-[#5446a8] text-white shadow-xs' : 'text-[#585567] hover:bg-white'
              }`}
            >
              Todos
            </button>
            {gradeOptions.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => { setGradeFilter(g.id); setPage(1) }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  gradeFilter === g.id ? 'bg-[#5446a8] text-white shadow-xs' : 'text-[#585567] hover:bg-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Nivel MCER */}
          <div className="flex items-center gap-1 bg-[#f8f7fc] p-1 rounded-2xl border border-[#eceaf6]">
            <span className="text-[10px] font-bold text-[#8e8a9f] uppercase px-2">Nivel:</span>
            {['all', ...CEFR_ORDER].map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => { setLevelFilter(lvl); setPage(1) }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  levelFilter === lvl ? 'bg-[#5446a8] text-white shadow-xs' : 'text-[#585567] hover:bg-white'
                }`}
              >
                {lvl === 'all' ? 'Todos' : lvl}
              </button>
            ))}
          </div>

          {/* Docente */}
          {teacherOptions.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#f8f7fc] px-2.5 py-1 rounded-2xl border border-[#eceaf6]">
              <span className="text-[10px] font-bold text-[#8e8a9f] uppercase">Docente:</span>
              <select
                value={teacherFilter}
                onChange={(e) => { setTeacherFilter(e.target.value); setPage(1) }}
                className="bg-transparent text-xs font-bold text-[#2d2c38] focus:outline-none py-1 cursor-pointer"
              >
                <option value="all">Todos ({teacherOptions.length})</option>
                {teacherOptions.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-[#8e8a9f] hover:text-red-600 hover:bg-red-50 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">clear</span>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Listado de Observaciones */}
      {paginated.length === 0 ? (
        <div className="card-academy p-12 text-center space-y-2">
          <span className="material-symbols-outlined text-[42px] text-[#8e8a9f]/50">speaker_notes_off</span>
          <p className="text-sm font-bold text-[#2d2c38]">
            No hay observaciones que coincidan con los filtros actuales.
          </p>
          <p className="text-xs text-[#8e8a9f]">
            {onlyWithComments
              ? 'Prueba desactivar "Solo con observaciones" o limpiar los filtros de búsqueda.'
              : 'Aún no se han registrado entrevistas orales con estos criterios.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {paginated.map((ev, idx) => {
            const matchedStudent = students.find(
              s => (s.email || '').toLowerCase() === (ev.studentEmail || '').toLowerCase()
            ) || {
              name: ev.studentName,
              email: ev.studentEmail,
              carnet: ev.studentCarnet,
              grade: ev.grade,
              section: ev.section
            }

            return (
              <div
                key={ev.id || `${ev.studentEmail}_${idx}`}
                className="card-academy p-5 hover:border-[#8a70d6]/40 transition-all space-y-3.5"
              >
                {/* Cabecera del alumno */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#eceaf6]">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#f4f1fd] text-[#5446a8] font-black text-sm flex items-center justify-center border border-[#e2e0ed] shrink-0">
                      {ev.studentName?.charAt(0) || 'E'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-extrabold text-sm text-[#2d2c38]">
                          {ev.studentName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-lg bg-[#f4f1fd] text-[#5446a8] font-mono font-bold text-[11px] border border-[#e2e0ed]">
                          {ev.studentCarnet || 'S/C'}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {ev.grade} {ev.section}
                        </span>
                        {ev.finalLevel && (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-black text-[11px]">
                            Nivel Final: {ev.finalLevel}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8e8a9f] mt-1">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">person</span>
                          Evaluado por: <strong className="text-[#585567]">{ev.teacherLabel}</strong>
                        </span>
                        <span>•</span>
                        <span>{ev.completedAt ? new Date(ev.completedAt).toLocaleString('es-SV') : 'Fecha N/D'}</span>
                        {ev.durationFormatted && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{ev.durationFormatted}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenVerdict && (
                      <button
                        type="button"
                        onClick={() => onOpenVerdict(matchedStudent)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">gavel</span>
                        <span>Veredicto</span>
                      </button>
                    )}
                    {onOpenDetail && (
                      <button
                        type="button"
                        onClick={() => onOpenDetail(ev)}
                        className="px-3 py-1.5 rounded-xl bg-[#f4f1fd] hover:bg-[#e9e3ff] text-[#5446a8] font-bold text-xs border border-[#e2e0ed] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        <span>Rúbrica</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Observaciones por nivel */}
                {ev.hasObservations ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {ev.observations.map((obs) => (
                      <div
                        key={obs.level}
                        className="bg-amber-50/75 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-950 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-200/70 text-amber-900 font-black text-[11px]">
                            Nivel {obs.level}
                          </span>
                          {obs.scoreTotal != null && (
                            <span className="font-mono text-[11px] font-bold text-amber-800">
                              {obs.scoreTotal} pts
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-amber-950 whitespace-pre-line">
                          "{obs.comments}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8e8a9f] italic">
                    Sin comentarios u observaciones escritas en esta entrevista.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[#8e8a9f]">
            Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} registros
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-[#eceaf6] bg-white text-xs font-bold text-[#585567] disabled:opacity-40 hover:bg-[#f8f7fc] cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-xs font-mono font-bold text-[#2d2c38]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-[#eceaf6] bg-white text-xs font-bold text-[#585567] disabled:opacity-40 hover:bg-[#f8f7fc] cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
