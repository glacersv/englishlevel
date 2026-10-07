import React, { useState } from 'react'

export default function AnalyticsDashboard({
  students = [],
  evaluations = [],
  academic = { grades: [], sections: [] },
  onResetStudent = null,
  isTeacherView = false,
  teacherName = ''
}) {
  const [expandedSection, setExpandedSection] = useState(null)
  const [selectedDetailStudent, setSelectedDetailStudent] = useState(null)

  const studentsList = students.filter(u => u.role === 'student' || (!u.role && u.carnet))

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Resumen Superior */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
              Diagnóstico Institucional de Inglés 2026 - 2027
            </span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-gray-900 mt-1">
            Dashboard Analítico y Estadístico por Grado
          </h2>
          <p className="text-xs text-gray-500">
            Monitoreo en tiempo real de baterías de tests, entrevistas orales y asignación docente de nivel.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Alumnos</span>
            <span className="font-heading font-black text-xl text-gray-900">{studentsList.length}</span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Con Nivel Asignado</span>
            <span className="font-heading font-black text-xl text-emerald-600">
              {studentsList.filter(s => Boolean(s.assignedLevel)).length}
            </span>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">Por Nivelar</span>
            <span className="font-heading font-black text-xl text-amber-600">
              {studentsList.filter(s => !s.assignedLevel).length}
            </span>
          </div>
        </div>
      </div>

      {/* AVISO INSTITUCIONAL: Sincronización y Asignación Docente */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-700 text-[22px] shrink-0 mt-0.5">info</span>
          <div className="space-y-0.5">
            <span className="font-bold text-amber-950 block">
              Nota Técnica: Registro de Puntos de Plataforma y Asignación Docente
            </span>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              En el primer bloque de la jornada matutina (7° Grado), por una intermitencia de red y versión preliminar, un grupo de 46 alumnos completó las pruebas registrando su cumplimiento y bitácora de seguridad, pero sin almacenar el desglose numérico de aciertos. 
              <strong className="text-amber-950 font-bold ml-1">
                Recuerda que el nivel definitivo oficial (A1-C1) es siempre asignado y ratificado directamente por las Teachers
              </strong> con base en la entrevista oral presencial y el desempeño del alumno.
            </p>
          </div>
        </div>
      </div>

      {/* Distribución Global por Nivel Oficial MCER */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
        <h3 className="font-heading font-extrabold text-base text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
          Distribución General por Nivel MCER (Evaluados por Docentes)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: 'A1', name: 'A1 - Principiante', color: 'bg-emerald-500', bgLight: 'bg-emerald-50', textCol: 'text-emerald-700', border: 'border-emerald-200' },
            { id: 'A2', name: 'A2 - Básico', color: 'bg-cyan-500', bgLight: 'bg-cyan-50', textCol: 'text-cyan-700', border: 'border-cyan-200' },
            { id: 'B1', name: 'B1 - Pre-Intermedio', color: 'bg-blue-600', bgLight: 'bg-blue-50', textCol: 'text-blue-700', border: 'border-blue-200' },
            { id: 'B2', name: 'B2 - Intermedio Alto', color: 'bg-purple-600', bgLight: 'bg-purple-50', textCol: 'text-purple-700', border: 'border-purple-200' },
            { id: 'C1', name: 'C1 - Avanzado', color: 'bg-pink-600', bgLight: 'bg-pink-50', textCol: 'text-pink-700', border: 'border-pink-200' },
          ].map((lvl) => {
            const count = studentsList.filter(s => s.assignedLevel === lvl.id).length
            const evaluatedTotal = studentsList.filter(s => Boolean(s.assignedLevel)).length
            const pct = evaluatedTotal > 0 ? Math.round((count / evaluatedTotal) * 100) : 0
            return (
              <div key={lvl.id} className={`p-4 rounded-2xl border ${lvl.border} ${lvl.bgLight} space-y-2`}>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${lvl.color} text-white`}>
                    {lvl.id}
                  </span>
                  <span className="text-xs font-bold text-gray-500">{pct}%</span>
                </div>
                <div>
                  <div className={`font-heading font-black text-2xl ${lvl.textCol}`}>
                    {count}
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium block leading-tight">
                    {lvl.name}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Matriz Analítica: Grados y Secciones */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h3 className="font-heading font-extrabold text-base text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">table_chart</span>
              Desglose Analítico por Grados y Secciones
            </h3>
            <p className="text-xs text-gray-500">
              Visualiza cuántos alumnos han sido evaluados y su nivel predominante en cada sección. Haz clic en una fila para ver el listado de alumnos.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500 bg-slate-50/50">
                <th className="py-3 px-4">Grado Escolar</th>
                <th className="py-3 px-4">Sección</th>
                <th className="py-3 px-4 text-center">Total Alumnos</th>
                <th className="py-3 px-4 text-center">Entrevistas Orales (Docentes)</th>
                <th className="py-3 px-4 text-center">Baterías en Plataforma</th>
                <th className="py-3 px-4 text-center">Nivel Oficial Asignado</th>
                <th className="py-3 px-4">Desglose MCER (A1 - C1)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(academic.grades || []).flatMap(g => {
                return (academic.sections || []).map(sec => {
                  // Filtrar alumnos de este grado y sección
                  const inGroup = studentsList.filter(s => {
                    const gStr = (s.grade || '') + ' ' + (s.codigoGrado || '')
                    let matchG = false
                    if (g.id === '6') matchG = gStr.includes('6°') || s.codigoGrado === '06'
                    else if (g.id === '7') matchG = gStr.includes('7°') || s.codigoGrado === '07'
                    else if (g.id === '8') matchG = gStr.includes('8°') || s.codigoGrado === '08'
                    else if (g.id === '9') matchG = gStr.includes('9°') || s.codigoGrado === '09'
                    else if (g.id === '10') matchG = gStr.includes('10°') || gStr.includes('1° Bachillerato') || s.codigoGrado === '10'
                    else if (g.id === '11') matchG = gStr.includes('11°') || gStr.includes('2° Bachillerato') || s.codigoGrado === '11'
                    else if (g.id === '12') matchG = gStr.includes('12°') || gStr.includes('3° Bachillerato') || s.codigoGrado === '32'
                    else matchG = gStr.includes(g.id)

                    return matchG && s.section === sec
                  })

                  if (inGroup.length === 0) return null

                  // 1. Alumnos con entrevista oral realizada
                  const withOral = inGroup.filter(s => {
                    const emailClean = (s.email || '').toLowerCase()
                    return evaluations.some(e => (e.studentEmail || '').toLowerCase() === emailClean || (e.studentCarnet && e.studentCarnet === s.carnet))
                  }).length

                  // 2. Alumnos con tests de plataforma completados
                  const withPlatform = inGroup.filter(s => s.completedExams && Object.keys(s.completedExams).length > 0).length

                  // 3. Alumnos con nivel definitivo oficial asignado por docente
                  const evaluated = inGroup.filter(s => Boolean(s.assignedLevel)).length
                  const pct = inGroup.length > 0 ? Math.round((evaluated / inGroup.length) * 100) : 0
                  const a1 = inGroup.filter(s => s.assignedLevel === 'A1').length
                  const a2 = inGroup.filter(s => s.assignedLevel === 'A2').length
                  const b1 = inGroup.filter(s => s.assignedLevel === 'B1').length
                  const b2 = inGroup.filter(s => s.assignedLevel === 'B2').length
                  const c1 = inGroup.filter(s => s.assignedLevel === 'C1').length

                  const rowKey = `${g.id}-${sec}`
                  const isExpanded = expandedSection === rowKey

                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        onClick={() => setExpandedSection(isExpanded ? null : rowKey)}
                        className={`transition-colors cursor-pointer ${
                          isExpanded ? 'bg-indigo-50/60 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[18px] text-indigo-700 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}>
                            chevron_right
                          </span>
                          <span>{g.label}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 font-extrabold text-xs">
                            Secc. {sec}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-700 text-center">{inGroup.length}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                            withOral > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <span className="material-symbols-outlined text-[14px]">record_voice_over</span>
                            <span>{withOral} / {inGroup.length}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                            withPlatform > 0 ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <span className="material-symbols-outlined text-[14px]">devices</span>
                            <span>{withPlatform} / {inGroup.length}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-extrabold text-xs text-emerald-700">
                              {evaluated} de {inGroup.length} ({pct}%){/* % */}
                            </span>
                            <div className="w-20 bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {a1 > 0 && <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">A1: {a1}</span>}
                              {a2 > 0 && <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-black">A2: {a2}</span>}
                              {b1 > 0 && <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black">B1: {b1}</span>}
                              {b2 > 0 && <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black">B2: {b2}</span>}
                              {c1 > 0 && <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 text-[10px] font-black">C1: {c1}</span>}
                              {evaluated === 0 && (
                                <span className="text-[11px] text-gray-400 italic">Pendiente de nivelación</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedSection(isExpanded ? null : rowKey)
                              }}
                              className="text-[11px] font-extrabold text-indigo-700 hover:underline shrink-0 cursor-pointer"
                            >
                              {isExpanded ? 'Ocultar' : 'Ver Alumnos'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* SUB-FILA EXPANDIDA: DESGLOSE ALUMNO POR ALUMNO CON ALERTAS Y ESTADO */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-slate-50 border-b border-indigo-100">
                            <div className="p-4 md:p-5 space-y-3">
                              <div className="flex flex-col sm:row justify-between sm:items-center gap-2 pb-2 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-indigo-700 text-[20px]">group</span>
                                  <span className="font-extrabold text-xs text-gray-800 uppercase tracking-wider">
                                    Alumnos de {g.label} Sección {sec} ({inGroup.length} estudiantes)
                                  </span>
                                </div>
                                <span className="text-[11px] text-gray-500 italic">
                                  Haz clic en cualquier alumno para ver su expediente completo
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {inGroup
                                  .slice()
                                  .sort((a,b) => (a.name || '').localeCompare(b.name || ''))
                                  .map(st => {
                                    const stEmail = (st.email || '').toLowerCase()
                                    const oralEval = evaluations.find(e => (e.studentEmail || '').toLowerCase() === stEmail || (e.studentCarnet && e.studentCarnet === st.carnet))
                                    const examsDone = st.completedExams ? Object.keys(st.completedExams).length : 0

                                    // Comprobar si tiene notas o fue afectado por el problema de sincronización matutino
                                    let hasNumericScores = false
                                    let totalWarnings = 0
                                    let totalScoreAccum = 0
                                    let examsWithScoreCount = 0

                                    if (st.completedExams) {
                                      for (const [eid, ex] of Object.entries(st.completedExams)) {
                                        if (ex.warningsCount > 0) totalWarnings += ex.warningsCount
                                        if (ex.score !== undefined) {
                                          hasNumericScores = true
                                          totalScoreAccum += ex.score
                                          examsWithScoreCount++
                                        }
                                      }
                                    }

                                    const isAffectedByMorningSync = examsDone > 0 && !hasNumericScores
                                    const avgScore = examsWithScoreCount > 0 ? Math.round(totalScoreAccum / examsWithScoreCount) : null

                                    return (
                                      <div
                                        key={st.email || st.carnet}
                                        onClick={() => setSelectedDetailStudent({ ...st, oralEval, examsDone, isAffectedByMorningSync, totalWarnings, avgScore })}
                                        className={`p-3.5 rounded-2xl border text-xs space-y-2.5 transition-all bg-white cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] group ${
                                          isAffectedByMorningSync
                                            ? 'border-amber-300 ring-1 ring-amber-200/50 shadow-xs hover:border-amber-400'
                                            : totalWarnings > 0
                                              ? 'border-rose-200 hover:border-rose-400'
                                              : 'border-slate-200 hover:border-indigo-300'
                                        }`}
                                      >
                                        {/* Encabezado del Alumno */}
                                        <div className="flex items-start justify-between gap-1.5">
                                          <div className="min-w-0">
                                            <span className="font-extrabold text-gray-900 block truncate group-hover:text-indigo-600 transition-colors" title={st.name}>
                                              {st.name}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-500">
                                              Carnet: {st.carnet || 'S/C'}
                                            </span>
                                          </div>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                            st.assignedLevel
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                                          }`}>
                                            {st.assignedLevel ? `Nivel: ${st.assignedLevel}` : 'Por Nivelar'}
                                          </span>
                                        </div>

                                        {/* Métricas: Oral + Plataforma */}
                                        <div className="space-y-1.5 pt-1 border-t border-slate-100 text-[11px]">
                                          {/* 1. Entrevista Oral Presencial */}
                                          <div className="flex items-center justify-between">
                                            <span className="text-gray-500 flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[13px] text-indigo-600">record_voice_over</span>
                                              Entrevista Oral:
                                            </span>
                                            {oralEval ? (
                                              <span className="font-bold text-indigo-700">
                                                Realizada ({oralEval.finalLevel || 'Evaluada'})
                                                {oralEval.levelsEvaluated?.[oralEval.finalLevel]?.scoreTotal != null && ` • ${oralEval.levelsEvaluated[oralEval.finalLevel].scoreTotal}/45 pts`}
                                              </span>
                                            ) : (
                                              <span className="text-gray-400 italic">Pendiente</span>
                                            )}
                                          </div>

                                          {/* 2. Batería de Tests Digitales */}
                                          <div className="flex items-center justify-between">
                                            <span className="text-gray-500 flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[13px] text-sky-600">devices</span>
                                              Tests Plataforma:
                                            </span>
                                            {examsDone > 0 ? (
                                              <span className="font-bold text-sky-800">
                                                {examsDone} tests completados
                                                {avgScore != null && ` (Prom. ${avgScore}%)`}
                                              </span>
                                            ) : (
                                              <span className="text-gray-400 italic">Sin iniciar</span>
                                            )}
                                          </div>

                                          {/* 3. AVISO TÉCNICO SI FUE AFECTADO POR EL CORTE DE INTERNET / RED */}
                                          {isAffectedByMorningSync && (
                                            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] space-y-0.5">
                                              <div className="font-bold flex items-center gap-1 text-amber-950">
                                                <span className="material-symbols-outlined text-[13px] text-amber-600">wifi_off</span>
                                                <span>Corte de red matutino (Sin desglose)</span>
                                              </div>
                                              <p className="text-amber-800 leading-tight">
                                                Completó las pruebas en el 1er bloque; no se almacenaron puntos por intermitencia. El nivel es ratificado por la Teacher con la entrevista oral.
                                              </p>
                                            </div>
                                          )}

                                          {/* 4. ALERTA DE FRAUDE / SALIDAS DE PESTAÑA */}
                                          {totalWarnings > 0 && (
                                            <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[10px] flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[13px] text-rose-600">warning</span>
                                              <span className="font-bold">
                                                {totalWarnings} advertencia{totalWarnings > 1 ? 's' : ''} de salida / cambio de pestaña
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Docente Titular Asignado y Botón de clic */}
                                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                          <span className="text-gray-500">Docente: <strong className="text-gray-700">{st.assignedTeacher || 'Silvia Herrera'}</strong></span>
                                          <span className="font-bold text-indigo-700 group-hover:underline flex items-center gap-0.5">
                                            <span>Ver detalle</span>
                                            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              }).filter(Boolean)}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: EXPEDIENTE COMPLETO DEL ALUMNO (EVALUACIÓN Y FRAUDE) ================= */}
      {selectedDetailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-scaleIn">
            
            {/* Header del Expediente */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[26px]">badge</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                      Expediente Individual 2026-2027
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedDetailStudent.assignedLevel
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedDetailStudent.assignedLevel ? `Nivel Oficial: ${selectedDetailStudent.assignedLevel}` : 'Nivel Pendiente'}
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-lg md:text-xl text-gray-900 mt-1">
                    {selectedDetailStudent.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                    <span>Carnet: <strong className="font-mono text-gray-800">{selectedDetailStudent.carnet || 'S/C'}</strong></span>
                    <span>•</span>
                    <span>{selectedDetailStudent.grade || '7° Grado'} Secc. {selectedDetailStudent.section || 'A'}</span>
                    <span>•</span>
                    <span className="text-gray-400 font-mono text-[11px]">{selectedDetailStudent.email}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* ADVERTENCIA DE RED / CORTE MATUTINO SI APLICA */}
            {selectedDetailStudent.isAffectedByMorningSync && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-xs text-amber-950 space-y-1.5 shadow-xs">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">wifi_off</span>
                  <span>Incidencia Técnica: Corte de Red / Versión Matutina</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Este alumno completó las evaluaciones en la primera tanda matutina. Por intermitencia de conexión en la versión preliminar, la plataforma registró la entrega a tiempo y bitácora de seguridad, pero <strong>no almacenó el desglose numérico de aciertos</strong>.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-950">
                  <span className="material-symbols-outlined text-[14px] text-indigo-700">verified</span>
                  <span>Criterio Académico: El nivel oficial final es ratificado por la Teacher ({selectedDetailStudent.assignedTeacher || 'Silvia Herrera'}) a través de la entrevista oral.</span>
                </div>
              </div>
            )}

            {/* SECCIÓN 1: EVALUACIÓN ORAL (SPEAKING) */}
            <div className="p-4.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-700 text-[20px]">record_voice_over</span>
                  <span className="font-extrabold text-xs text-indigo-950 uppercase tracking-wider">
                    1. Entrevista Oral Presencial (Speaking)
                  </span>
                </div>
                <span className="text-[11px] font-bold text-indigo-700">
                  Docente: {selectedDetailStudent.assignedTeacher || 'Silvia Herrera'}
                </span>
              </div>

              {selectedDetailStudent.oralEval ? (
                <div className="bg-white p-3.5 rounded-xl border border-indigo-100 text-xs space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-gray-400 block font-bold">Nivel Otorgado</span>
                      <span className="font-extrabold text-sm text-indigo-800">
                        {selectedDetailStudent.oralEval.finalLevel || 'A1'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-gray-400 block font-bold">Puntaje Total</span>
                      <span className="font-extrabold text-sm text-indigo-800">
                        {selectedDetailStudent.oralEval.levelsEvaluated?.[selectedDetailStudent.oralEval.finalLevel]?.scoreTotal != null
                          ? `${selectedDetailStudent.oralEval.levelsEvaluated[selectedDetailStudent.oralEval.finalLevel].scoreTotal} / 45 pts`
                          : 'Completado'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-gray-400 block font-bold">Duración</span>
                      <span className="font-extrabold text-sm text-gray-800">
                        {selectedDetailStudent.oralEval.durationFormatted || '03:00 min'}
                      </span>
                    </div>
                  </div>
                  {selectedDetailStudent.oralEval.comments && (
                    <p className="text-[11px] text-gray-600 italic pt-1 border-t border-slate-100">
                      "{selectedDetailStudent.oralEval.comments}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white/70 rounded-xl border border-dashed border-indigo-200 text-center text-xs text-gray-400 italic">
                  La entrevista oral con el docente aún no ha sido registrada.
                </div>
              )}
            </div>

            {/* SECCIÓN 2: TESTS EN PLATAFORMA DIGITAL */}
            <div className="p-4.5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-700 text-[20px]">devices</span>
                  <span className="font-extrabold text-xs text-sky-950 uppercase tracking-wider">
                    2. Batería de Tests Digitales ({selectedDetailStudent.examsDone} exámenes)
                  </span>
                </div>
                {selectedDetailStudent.avgScore != null && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-extrabold text-[11px]">
                    Promedio: {selectedDetailStudent.avgScore}%
                  </span>
                )}
              </div>

              {selectedDetailStudent.completedExams && Object.keys(selectedDetailStudent.completedExams).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(selectedDetailStudent.completedExams).map(([eid, exData]) => (
                    <div key={eid} className="p-3 bg-white rounded-xl border border-sky-100 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-gray-800 block truncate">
                          {exData.examTitle || eid.replace('exam_official_', '').replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {exData.completedAt ? new Date(exData.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completado'}
                          {exData.byTimeout ? ' • Por límite de tiempo' : ' • Enviado a tiempo'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {exData.score !== undefined ? (
                          <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                            exData.score >= 60 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {exData.correctCount != null ? `${exData.correctCount}/${exData.totalQuestions} (${exData.score}%)` : `${exData.score}%`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            Entregado (Sin nota)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white/70 rounded-xl border border-dashed border-sky-200 text-center text-xs text-gray-400 italic">
                  El alumno aún no ha iniciado las pruebas de plataforma.
                </div>
              )}
            </div>

            {/* SECCIÓN 3: BITÁCORA DE SEGURIDAD Y FRAUDES */}
            <div className={`p-4.5 rounded-2xl border space-y-2.5 ${
              selectedDetailStudent.totalWarnings > 0
                ? 'bg-rose-50/60 border-rose-200'
                : 'bg-emerald-50/50 border-emerald-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[20px] ${
                    selectedDetailStudent.totalWarnings > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {selectedDetailStudent.totalWarnings > 0 ? 'security' : 'verified_user'}
                  </span>
                  <span className={`font-extrabold text-xs uppercase tracking-wider ${
                    selectedDetailStudent.totalWarnings > 0 ? 'text-rose-950' : 'text-emerald-950'
                  }`}>
                    3. Bitácora de Integridad y Alertas de Fraude
                  </span>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  selectedDetailStudent.totalWarnings > 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedDetailStudent.totalWarnings > 0
                    ? `${selectedDetailStudent.totalWarnings} advertencias`
                    : 'Sin incidencias'}
                </span>
              </div>

              {selectedDetailStudent.totalWarnings > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-rose-800">
                    Se registraron intentos de abandono de pantalla o cambio de pestaña activa durante el examen.
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {Object.entries(selectedDetailStudent.completedExams || {}).map(([eid, ex]) => {
                      if (!ex.incidents || ex.incidents.length === 0) return null
                      return (
                        <div key={eid} className="p-2 rounded-lg bg-white/80 border border-rose-100 text-[11px] space-y-1">
                          <span className="font-bold text-rose-900 block">
                            {ex.examTitle || eid}: {ex.warningsCount || ex.incidents.length} advertencias
                          </span>
                          <div className="space-y-0.5">
                            {ex.incidents.map((inc, i) => (
                              <div key={i} className="text-[10px] text-gray-600 flex justify-between">
                                <span>{inc.reason || 'Cambio de pestaña / ventana'}</span>
                                <span className="font-mono text-gray-400">
                                  {inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString() : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-800">
                  El alumno completó o está desarrollando sus evaluaciones dentro del entorno de examen seguro sin registrar salidas de ventana no autorizadas.
                </p>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              {onResetStudent && (
                <button
                  type="button"
                  onClick={() => {
                    onResetStudent(selectedDetailStudent)
                    setSelectedDetailStudent(null)
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Reiniciar el Nivel Oficial y volver a evaluar"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  <span>Resetear Evaluación</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDetailStudent(null)}
                className="ml-auto px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
