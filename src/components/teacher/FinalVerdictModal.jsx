import React, { useState, useEffect } from 'react'

/**
 * FinalVerdictModal:
 * Permite a los docentes revisar de forma 360° a cada estudiante:
 * - Puntos y porcentaje de pruebas en Plataforma (Listening, Reading, etc.)
 * - Puntos y desempeño de Entrevista Oral (A1-C1)
 * - Ponderación global (ej. 60% plataforma + 40% oral)
 * - Cruce con la Matriz Oficial de Libros y Grupos (Marco Institucional) según el grado destino
 * - Selección del veredicto final (Grupo / Nivel oficial definitivo)
 * - Justificante o dictamen del docente
 * - Guarda localmente en el estado y localStorage (sin subir a Firebase)
 */
export default function FinalVerdictModal({
  student,
  oralEvaluation,
  diagnosticConfig,
  currentTeacher,
  onSaveVerdict,
  onClose
}) {
  if (!student) return null

  // 1. Obtener datos de la plataforma
  const completedExams = student.completedExams || {}
  const examEntries = Object.entries(completedExams)
  const examsCount = examEntries.length

  let totalPlatformQuestions = 0
  let totalPlatformCorrect = 0
  let totalPlatformScoreSum = 0

  examEntries.forEach(([examId, data]) => {
    if (typeof data.scorePercent === 'number') {
      totalPlatformScoreSum += data.scorePercent
    } else if (data.totalQuestions && data.correctCount != null) {
      totalPlatformQuestions += data.totalQuestions
      totalPlatformCorrect += data.correctCount
    }
  })

  const platformScorePercent = examsCount > 0
    ? (totalPlatformQuestions > 0
        ? Math.round((totalPlatformCorrect / totalPlatformQuestions) * 100)
        : Math.round(totalPlatformScoreSum / examsCount))
    : 0

  // 2. Obtener datos de la entrevista oral
  const oralScorePercent = oralEvaluation
    ? (typeof oralEvaluation.oralScorePercent === 'number'
        ? oralEvaluation.oralScorePercent
        : typeof oralEvaluation.scorePercent === 'number'
        ? oralEvaluation.scorePercent
        : (oralEvaluation.finalLevel ? (
            oralEvaluation.finalLevel === 'A1' ? 40 :
            oralEvaluation.finalLevel === 'A2' ? 60 :
            oralEvaluation.finalLevel === 'B1' ? 80 :
            oralEvaluation.finalLevel === 'B2' ? 95 : 100
          ) : 0))
    : (typeof student.oralScorePercent === 'number' ? student.oralScorePercent : 0)

  const oralLevel = oralEvaluation?.finalLevel || (student.assignedLevel && !student.assignedGroup ? student.assignedLevel : null)

  // 3. Ponderaciones del marco institucional (por defecto 60% plataforma, 40% oral)
  const weights = diagnosticConfig?.weights || { platform: 60, oral: 40 }
  const wPlat = (weights.platform ?? 60) / 100
  const wOral = (weights.oral ?? 40) / 100

  // Cálculo de puntaje global ponderado
  const totalScorePercent = Math.min(100, Math.max(0, Math.round(
    (platformScorePercent * wPlat) + (oralScorePercent * wOral)
  )))

  // 4. Determinar Grado de Destino según el grado actual del alumno
  // Grado 6 -> pasa a 7°
  // Grado 7 -> pasa a 8°
  // Grado 8 -> pasa a 9°
  // Grado 9 -> pasa a 10° (1° Bachillerato)
  // Grado 10 -> pasa a 11° (2° Bachillerato)
  // Grado 11 -> pasa a 12° (3° Bachillerato Técnico) o finaliza
  const currentGradeNum = parseInt(String(student.codigoGrado || student.grade || '7').replace(/\D/g, ''), 10) || 7
  let targetGradeKey = String(currentGradeNum)
  if (currentGradeNum === 6) targetGradeKey = '7'
  else if (currentGradeNum === 7) targetGradeKey = '8'
  else if (currentGradeNum === 8) targetGradeKey = '9'
  else if (currentGradeNum === 9) targetGradeKey = '10'
  else if (currentGradeNum === 10) targetGradeKey = '11'
  else if (currentGradeNum === 11 && student.especialidad === 'Técnico') targetGradeKey = '12'

  const cutoffs = diagnosticConfig?.cutoffs || { basicMax: 40, intermediateMax: 70 }
  const basicMax = cutoffs.basicMax ?? 40
  const intermediateMax = cutoffs.intermediateMax ?? 70

  // Identificar categoría según puntaje
  let suggestedCategory = 'intermediate'
  if (totalScorePercent <= basicMax) suggestedCategory = 'basic'
  else if (totalScorePercent <= intermediateMax) suggestedCategory = 'intermediate'
  else suggestedCategory = 'advanced'

  const destinations = diagnosticConfig?.gradeDestinations || {}
  const currentDestination = destinations[targetGradeKey] || destinations['7'] || {
    label: `${targetGradeKey}° Grado`,
    basic: { code: 'L1-A', label: 'Básico (Libro 1 Inicial)' },
    intermediate: { code: 'L1-B', label: 'Intermedio (Libro 1 Regular)' },
    advanced: { code: 'L2', label: 'Avanzado (Libro 2 Adelantado)' }
  }

  const suggestedOption = currentDestination[suggestedCategory] || currentDestination.intermediate

  // 5. Estado local del Veredicto
  const [selectedGroup, setSelectedGroup] = useState(
    student.assignedGroup || student.assignedLevel || suggestedOption?.code || 'L1-B'
  )
  const [selectedCefr, setSelectedCefr] = useState(
    student.assignedCefr || oralLevel || (suggestedCategory === 'basic' ? 'A1' : suggestedCategory === 'intermediate' ? 'A2' : 'B1')
  )
  const [justification, setJustification] = useState(student.verdictJustification || '')
  const [saving, setSaving] = useState(false)

  // Autocompletar justificación inicial sugerida si está vacía
  useEffect(() => {
    if (!justification) {
      const catText = suggestedCategory === 'basic' ? 'Básico' : suggestedCategory === 'intermediate' ? 'Intermedio' : 'Avanzado'
      setJustification(
        `El estudiante obtuvo ${totalScorePercent}% global (${platformScorePercent}% en pruebas digitales y ${oralScorePercent}% en entrevista oral). Con base en el marco institucional y su desempeño, se le asigna al grupo ${selectedGroup} (${catText}).`
      )
    }
  }, [totalScorePercent])

  const handleSave = () => {
    setSaving(true)
    const payload = {
      studentEmail: student.email,
      assignedLevel: selectedGroup, // Para compatibilidad general con el resto de vistas
      assignedGroup: selectedGroup,
      assignedCefr: selectedCefr,
      platformScorePercent,
      oralScorePercent,
      totalScorePercent,
      verdictJustification: justification.trim(),
      verdictByTeacher: currentTeacher?.name || currentTeacher?.email || 'Docente de Inglés',
      verdictDate: new Date().toISOString()
    }

    onSaveVerdict(payload)
  }

  // Opciones de grupos disponibles para el grado del alumno
  const availableGroups = [
    {
      category: 'basic',
      categoryLabel: `Básico (0 - ${basicMax}%)`,
      code: currentDestination.basic?.code || 'Básico',
      label: currentDestination.basic?.label || 'Libro Inicial',
      badgeColor: 'border-amber-300 bg-amber-50 text-amber-900',
      activeRing: 'ring-2 ring-amber-500 border-amber-500 bg-amber-100/70',
      isSuggested: suggestedCategory === 'basic'
    },
    {
      category: 'intermediate',
      categoryLabel: `Intermedio (${basicMax + 1} - ${intermediateMax}%)`,
      code: currentDestination.intermediate?.code || 'Intermedio',
      label: currentDestination.intermediate?.label || 'Libro Regular',
      badgeColor: 'border-blue-300 bg-blue-50 text-blue-900',
      activeRing: 'ring-2 ring-blue-600 border-blue-600 bg-blue-100/70',
      isSuggested: suggestedCategory === 'intermediate'
    },
    {
      category: 'advanced',
      categoryLabel: `Avanzado (≥ ${intermediateMax + 1}%)`,
      code: currentDestination.advanced?.code || 'Avanzado',
      label: currentDestination.advanced?.label || 'Libro Adelantado',
      badgeColor: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      activeRing: 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-100/70',
      isSuggested: suggestedCategory === 'advanced'
    }
  ]

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* HEADER MODAL */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#2528b7] via-[#3730a3] to-[#4338ca] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-lg md:text-xl leading-tight">
                  Veredicto Final y Asignación de Nivel Oficial
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse"></span>
                  <span>Oficial Firebase</span>
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-0.5">
                Consolidación 360°: Resultados de Plataforma + Entrevista Oral + Matriz de Grupos 2026
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* CONTENIDO DEL MODAL SCROLLABLE */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">

          {/* FICHA RESUMEN DEL ESTUDIANTE */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#2528b7] text-white font-black text-lg flex items-center justify-center shadow-xs">
                {student.name?.charAt(0) || 'E'}
              </div>
              <div>
                <h4 className="font-heading font-black text-base text-slate-900 leading-snug">
                  {student.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {student.carnet || 'Carnet N/A'}
                  </span>
                  <span>•</span>
                  <span>{student.email}</span>
                  <span>•</span>
                  <span>Grado actual: <strong>{student.grade || '6°'} ({student.section || 'A'})</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-extrabold uppercase text-slate-400 block tracking-wider">
                Grado Destino de Asignación:
              </span>
              <span className="inline-block px-3 py-1 rounded-xl bg-indigo-100 text-indigo-900 font-black text-xs border border-indigo-200 mt-0.5">
                {currentDestination.label || `${targetGradeKey}° Grado`}
              </span>
            </div>
          </div>

          {/* TARJETAS DE NOTAS: PLATAFORMA VS ORAL VS GLOBAL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Plataforma */}
            <div className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-white flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-blue-600">devices</span>
                  Tests Plataforma ({weights.platform}%)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {examsCount} prueba(s)
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-heading font-black text-blue-950">
                    {platformScorePercent}%
                  </span>
                  <span className="text-xs text-blue-600 font-semibold">de aciertos</span>
                </div>
                <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${platformScorePercent}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-blue-800/80 leading-tight">
                Listening, Reading y Gramática completados en la consola digital.
              </p>
            </div>

            {/* 2. Entrevista Oral */}
            <div className="p-4 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/70 to-white flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-purple-600">record_voice_over</span>
                  Entrevista Oral ({weights.oral}%)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {oralLevel ? `Nivel: ${oralLevel}` : (oralEvaluation ? 'Evaluado' : 'Pendiente')}
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-heading font-black text-purple-950">
                    {oralScorePercent}%
                  </span>
                  <span className="text-xs text-purple-600 font-semibold">desempeño oral</span>
                </div>
                <div className="w-full bg-purple-100 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${oralScorePercent}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-purple-800/80 leading-tight">
                Fluidez, pronunciación y gramática evaluadas en vivo con el docente.
              </p>
            </div>

            {/* 3. Puntuación Global Ponderada */}
            <div className="p-4 rounded-2xl border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 via-white to-blue-50/50 flex flex-col justify-between shadow-md ring-2 ring-indigo-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-indigo-600">stars</span>
                  Puntaje Global Ponderado
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  100%
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-heading font-black text-indigo-900">
                    {totalScorePercent}%
                  </span>
                  <span className="text-xs font-bold text-indigo-700">Puntaje Final</span>
                </div>
                <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${totalScorePercent}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-indigo-950 font-bold bg-indigo-100/80 p-1.5 rounded-lg">
                <span>Rango según Matriz:</span>
                <span className="uppercase text-indigo-700">{suggestedCategory}</span>
              </div>
            </div>
          </div>

          {/* CRUCE CON LA MATRIZ OFICIAL DE LIBROS Y GRUPOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-[20px]">menu_book</span>
                  <span>Selección de Libro y Grupo Oficial (Marco Institucional)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  El sistema preselecciona el grupo sugerido según el puntaje ({totalScorePercent}%), pero tú como docente tienes el veredicto final.
                </p>
              </div>
              <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                Sugerencia Algoritmo: {suggestedOption?.code}
              </span>
            </div>

            {/* Selector de Grupos de la Matriz */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableGroups.map((grp) => {
                const isSelected = selectedGroup === grp.code
                return (
                  <button
                    key={grp.category}
                    type="button"
                    onClick={() => setSelectedGroup(grp.code)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? grp.activeRing
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    {grp.isSuggested && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider shadow-xs">
                        ⭐ Sugerido por Puntos
                      </span>
                    )}

                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                        {grp.categoryLabel}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-black text-2xl text-slate-950">
                          {grp.code}
                        </span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-snug">
                        {grp.label}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-semibold">Corte:</span>
                      <span className="font-mono font-bold text-slate-700">{grp.categoryLabel.split('(')[1]?.replace(')', '')}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* EQUIVALENCIA MCER ADICIONAL (A1, A2, B1, B2, C1) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
              Nivel de Dominio MCER Asociado al Estudiante:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => {
                const isSelected = selectedCefr === lvl
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedCefr(lvl)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-900 text-white shadow-sm ring-2 ring-indigo-300'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{lvl}</span>
                  </button>
                )
              })}
              <span className="text-[11px] text-slate-400 italic ml-2">
                (El nivel MCER respaldará el informe de competencias para actas)
              </span>
            </div>
          </div>

          {/* CAMPO DE JUSTIFICANTE / DICTAMEN DOCENTE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">edit_note</span>
                <span>Justificante / Dictamen del Docente Evaluador:</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Quedará registrado en el historial del estudiante
              </span>
            </div>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Escribe la justificación pedagógica del veredicto final..."
              className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-xs md:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2528b7]/40 leading-relaxed"
            />
          </div>

        </div>

        {/* FOOTER DEL MODAL */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
            <span>Docente a cargo: <strong>{currentTeacher?.name || currentTeacher?.email || 'Docente'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedGroup}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#4338ca] hover:brightness-110 text-white text-xs font-black shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{saving ? 'Guardando...' : `Confirmar Veredicto: ${selectedGroup}`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
