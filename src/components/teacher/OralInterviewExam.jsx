import React, { useState, useEffect } from 'react'
import {
  CEFR_LEVELS,
  LEVEL_METADATA,
  RUBRIC_CRITERIA,
  RUBRIC_SCORES,
  getRandom3Questions,
  getQuestionsByLevel
} from '../../lib/oralEvaluation'
import { saveOralEvaluation, updateUserStatus, getInterviewQuestions } from '../../lib/dataService'

export default function OralInterviewExam({ student, teacher, onFinished, onCancel }) {
  // Nivel actual en evaluación (inicia en A1)
  const [currentLevel, setCurrentLevel] = useState('A1')
  // Banco global de preguntas activas
  const [questionsBank, setQuestionsBank] = useState([])
  // Preguntas seleccionadas para el nivel actual (3 preguntas)
  const [levelQuestions, setLevelQuestions] = useState([])
  // Índice de la pregunta activa en pantalla (0, 1 o 2) - Sin scroll
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  // Registro de puntuaciones por nivel: { A1: { q1: { pronunciation: 4, ... }, comments: '' }, ... }
  const [evalRecord, setEvalRecord] = useState({})
  // Comentarios del docente para el nivel actual
  const [comments, setComments] = useState('')
  // Cronómetro de la entrevista
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [saving, setSaving] = useState(false)

  // Cargar banco de preguntas dinámico al inicio
  useEffect(() => {
    getInterviewQuestions().then(bank => {
      if (bank && bank.length > 0) {
        setQuestionsBank(bank)
        const q3 = getRandom3Questions('A1', bank)
        setLevelQuestions(q3)
      }
    }).catch(e => console.warn('Error cargando banco en entrevista:', e))
  }, [])

  // Cargar 3 preguntas cuando cambia el nivel
  useEffect(() => {
    const q3 = getRandom3Questions(currentLevel, questionsBank)
    setLevelQuestions(q3)
    setActiveQuestionIndex(0)
    setComments('')
  }, [currentLevel, questionsBank])

  // Timer activo durante la entrevista
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(s => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Formato mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Asignar puntuación a un criterio de una pregunta
  const handleScoreChange = (qIndex, criteriaId, val) => {
    setEvalRecord(prev => {
      const lvlData = prev[currentLevel] || { questions: {}, comments: '' }
      const qData = lvlData.questions[qIndex] || {}
      return {
        ...prev,
        [currentLevel]: {
          ...lvlData,
          questions: {
            ...lvlData.questions,
            [qIndex]: {
              ...qData,
              [criteriaId]: val
            }
          }
        }
      }
    })
  }

  // Calcular puntaje total del nivel actual
  const calculateCurrentLevelScore = () => {
    const lvlData = evalRecord[currentLevel]
    if (!lvlData || !lvlData.questions) return 0
    let sum = 0
    Object.values(lvlData.questions).forEach(qCriteria => {
      Object.values(qCriteria).forEach(v => {
        sum += (typeof v === 'number' ? v : 0)
      })
    })
    return sum
  }

  // Verificar si todas las 3 preguntas tienen los 5 criterios calificados (3 * 5 = 15 puntuaciones)
  const isLevelCompleted = () => {
    const lvlData = evalRecord[currentLevel]
    if (!lvlData || !lvlData.questions) return false
    for (let qIdx = 0; qIdx < levelQuestions.length; qIdx++) {
      const qScores = lvlData.questions[qIdx] || {}
      for (let c of RUBRIC_CRITERIA) {
        if (!qScores[c.id]) return false
      }
    }
    return true
  }

  // Pasar al siguiente nivel (ej: A1 -> A2, A2 -> B1, etc.)
  const handleNextLevel = () => {
    const meta = LEVEL_METADATA[currentLevel]
    if (!meta.next) {
      handleFinalize(currentLevel)
      return
    }

    // Guardar comentarios antes de avanzar
    setEvalRecord(prev => ({
      ...prev,
      [currentLevel]: {
        ...prev[currentLevel],
        comments: comments,
        scoreTotal: calculateCurrentLevelScore()
      }
    }))

    setCurrentLevel(meta.next)
  }

  // Finalizar evaluación y emitir resultado final
  const handleFinalize = async (overrideFinalLevel = null) => {
    setSaving(true)
    const finalLevelAssigned = overrideFinalLevel || currentLevel

    const fullRecord = {
      ...evalRecord,
      [currentLevel]: {
        ...evalRecord[currentLevel],
        comments: comments,
        scoreTotal: calculateCurrentLevelScore()
      }
    }

    const payload = {
      studentCarnet: student.carnet || '',
      studentName: student.name,
      studentEmail: student.email,
      grade: student.grade,
      section: student.section,
      teacherEmail: teacher.email,
      teacherName: teacher.name,
      finalLevel: finalLevelAssigned,
      totalDurationSeconds: secondsElapsed,
      durationFormatted: formatTime(secondsElapsed),
      levelsEvaluated: fullRecord,
      completedAt: new Date().toISOString()
    }

    await saveOralEvaluation(payload)
    // El estudiante queda activo con su examen completado
    await updateUserStatus(student.email, 'active', teacher.email)

    setSaving(false)
    alert(`✅ Evaluación Oral Finalizada con Éxito\n\nNivel Asignado: ${finalLevelAssigned}\nEstudiante: ${student.name}\nTiempo: ${formatTime(secondsElapsed)}`)
    onFinished?.(payload)
  }

  const currentScore = calculateCurrentLevelScore()
  const currentMeta = LEVEL_METADATA[currentLevel]
  const levelCompleted = isLevelCompleted()

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden max-w-5xl mx-auto my-2 animate-fadeIn">
      
      {/* ================= ENCABEZADO CONSOLA DOCENTE ================= */}
      <div className="bg-gradient-to-r from-[#161a33] via-[#10132b] to-[#1e1b4b] p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-950">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300">
              Evaluación Oral Individual en Vivo (Speaking & Listening)
            </span>
          </div>
          <h2 className="font-heading font-extrabold text-2xl text-white mt-1">
            {student.name}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 font-mono flex-wrap">
            <span>Carnet: <strong className="text-white">{student.carnet || 'N/A'}</strong></span>
            <span>·</span>
            <span>{student.grade} - Secc. {student.section}</span>
            <span>·</span>
            <span className="text-slate-400 truncate max-w-xs">{student.email}</span>
            {student.selfReportedLevel && (
              <>
                <span>·</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-sans font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">psychology</span>
                  Auto-percibido: {student.selfReportedLevel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Cronómetro y Botón Cancelar */}
        <div className="flex items-center gap-4">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Tiempo</span>
            <span className="font-mono text-xl font-bold text-white tracking-wider">
              {formatTime(secondsElapsed)}
            </span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            title="Restaurar y volver a la lista de niveles / alumnos"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Restaurar / Salir a Niveles</span>
          </button>
        </div>
      </div>

      {/* ================= BARRA DE PASOS POR NIVEL (A1 → A2 → B1 → B2 → C1) ================= */}
      <div className="bg-slate-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-2">
          {CEFR_LEVELS.map((lvl, idx) => {
            const isCurrent = currentLevel === lvl
            const isDone = Boolean(evalRecord[lvl]?.scoreTotal)
            return (
              <div key={lvl} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setCurrentLevel(lvl)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#2528b7] text-white shadow-md shadow-indigo-600/30'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span>{lvl}</span>
                  {isDone && <span className="text-[10px]">✓</span>}
                </button>
                {idx < CEFR_LEVELS.length - 1 && (
                  <span className="text-gray-300 mx-2 font-bold text-xs">→</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-right pl-4">
          <span className="text-xs font-semibold text-gray-500">Puntaje Nivel Actual:</span>
          <span className="ml-2 font-heading font-extrabold text-lg text-[#2528b7]">
            {currentScore} <span className="text-xs text-gray-400 font-normal">/ 60 pts max</span>
          </span>
        </div>
      </div>

      {/* ================= PISTA DE AUDIO OFICIAL PARA EL DOCENTE (A1 / A2) ================= */}
      {(currentLevel === 'A1' || currentLevel === 'A2') && (
        <div className="bg-indigo-900 text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3 border-b border-indigo-950 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-indigo-300 text-[20px]">headphones</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Audio Listening {currentLevel}
                </span>
                <span className="text-xs font-extrabold text-white">
                  {currentLevel === 'A1' ? 'First Day at School (A1 Dialogue)' : 'Giving Directions (A2 Dialogues)'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200">
                {currentLevel === 'A1'
                  ? 'Diálogo Tania & Jing en la escuela (Class 1B, Mr Smith).'
                  : 'Indicaciones de ruta en la ciudad (Speakers A, B, C, D).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <audio
              controls
              src={currentLevel === 'A1' ? '/material_evaluaciones/A1_first_day_at_schoolA1.mp3' : '/material_evaluaciones/A2_giving_directionsA2.mp3'}
              className="h-8 max-w-xs w-full"
            >
              Tu navegador no soporta audio.
            </audio>
          </div>
        </div>
      )}

      {/* ================= CONTENIDO: PREGUNTAS PASO A PASO (SIN SCROLL, CON SIGUIENTE) ================= */}
      <div className="p-6 md:p-8 space-y-5 bg-slate-50/50">
        
        {/* Barra de Navegación de las 3 Preguntas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-200 p-4 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentMeta.color }}></span>
              <span className="font-heading font-extrabold text-sm text-gray-900">
                {currentMeta.name} — Pregunta {activeQuestionIndex + 1} de {levelQuestions.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Haz la pregunta verbalmente y califica la rúbrica. Usa <strong>"Siguiente Pregunta"</strong> para avanzar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Pestañas 1, 2, 3 */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {levelQuestions.map((_, idx) => {
                const isCurrent = activeQuestionIndex === idx
                const qScores = evalRecord[currentLevel]?.questions?.[idx] || {}
                const isQComplete = RUBRIC_CRITERIA.every(c => Boolean(qScores[c.id]))

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-[#2528b7] text-white shadow-sm'
                        : isQComplete
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    <span>Pregunta {idx + 1}</span>
                    {isQComplete && (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Botón Cambiar 3 Preguntas */}
            <button
              type="button"
              onClick={() => {
                setLevelQuestions(getRandom3Questions(currentLevel))
                setActiveQuestionIndex(0)
              }}
              className="p-2 bg-white border border-gray-200 hover:bg-slate-100 rounded-xl text-gray-600 transition-all cursor-pointer"
              title="Cambiar por otras 3 preguntas de este nivel"
            >
              <span className="material-symbols-outlined text-[18px]">shuffle</span>
            </button>
          </div>
        </div>

        {/* Tarjeta de la Pregunta Activa */}
        {levelQuestions[activeQuestionIndex] && (() => {
          const q = levelQuestions[activeQuestionIndex]
          const qIndex = activeQuestionIndex
          const currentQAnswers = evalRecord[currentLevel]?.questions?.[qIndex] || {}

          return (
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/90 shadow-sm space-y-6 animate-fadeIn">
              
              {/* Enunciado de la Pregunta para el Docente */}
              <div className="space-y-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 p-5 rounded-2xl border border-indigo-100/60">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[11px] font-extrabold uppercase">
                    Pregunta #{qIndex + 1} de {levelQuestions.length}
                  </span>
                  <span className="text-xs text-indigo-700 font-semibold italic">
                    Tema: {q.topic}
                  </span>
                  {q.isCustom && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">
                      Editada / Docente
                    </span>
                  )}
                </div>

                <p className="font-heading font-extrabold text-xl md:text-2xl text-gray-900 leading-snug">
                  "{q.question}"
                </p>

                {/* Referencia visual o apoyo didáctico si existe */}
                {q.visualPrompt && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0">image</span>
                    <div>
                      <strong className="block font-bold text-amber-800">Apoyo Visual para el Alumno:</strong>
                      <span>{q.visualPrompt}</span>
                    </div>
                  </div>
                )}

                {q.imageUrl && (
                  <div className="pt-2">
                    <img
                      src={q.imageUrl}
                      alt="Material visual de la pregunta"
                      className="max-h-56 rounded-xl border border-gray-200 shadow-xs object-contain bg-white p-1"
                    />
                  </div>
                )}

                <span className="text-[11px] text-gray-400 block">
                  Formula la pregunta con calma al estudiante y escucha su respuesta oral antes de puntuar.
                </span>
              </div>

              {/* Rúbrica Oficial de 5 Criterios (Escala 1 - 4) */}
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block">
                  Rúbrica de Evaluación Oral (Escala Oficial 1 a 4):
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {RUBRIC_CRITERIA.map((criterion) => {
                    const selectedVal = currentQAnswers[criterion.id]

                    return (
                      <div
                        key={criterion.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-slate-50 border border-gray-200/70 hover:bg-slate-100/60 transition-colors gap-2"
                      >
                        <div>
                          <span className="font-bold text-xs text-gray-900 uppercase tracking-tight">
                            {criterion.name}
                          </span>
                          <span className="hidden md:inline text-[11px] text-gray-500 ml-2">
                            — {criterion.desc}
                          </span>
                        </div>

                        {/* Botones 4, 3, 2, 1 */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {[4, 3, 2, 1].map((val) => {
                            const isSelected = selectedVal === val
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleScoreChange(qIndex, criterion.id, val)}
                                className={`w-10 h-9 rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? val === 4
                                      ? 'bg-emerald-600 text-white shadow-md scale-105 ring-2 ring-emerald-200'
                                      : val === 3
                                      ? 'bg-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-200'
                                      : val === 2
                                      ? 'bg-amber-500 text-white shadow-md scale-105 ring-2 ring-amber-200'
                                      : 'bg-red-500 text-white shadow-md scale-105 ring-2 ring-red-200'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                                title={`Puntaje ${val}`}
                              >
                                {val}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Botones de Navegación entre Preguntas: Anterior / Siguiente Pregunta */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={activeQuestionIndex === 0}
                  onClick={() => setActiveQuestionIndex(i => Math.max(0, i - 1))}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Pregunta Anterior</span>
                </button>

                <div className="text-xs font-bold text-gray-400">
                  {activeQuestionIndex + 1} / {levelQuestions.length}
                </div>

                {activeQuestionIndex < levelQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIndex(i => Math.min(levelQuestions.length - 1, i + 1))}
                    className="px-5 py-2.5 rounded-xl bg-[#2528b7] hover:brightness-110 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Siguiente Pregunta</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Última pregunta del nivel
                  </span>
                )}
              </div>

            </div>
          )
        })()}

        {/* Observaciones del docente para este nivel */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Comentarios / Observaciones del Docente para {currentLevel}:
          </label>
          <textarea
            rows="2"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Ej: Buena pronunciación, titubeó en tiempos pasados, responde con oraciones completas..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          ></textarea>
        </div>

      </div>

      {/* ================= FOOTER DE ACCIONES DEL DOCENTE ================= */}
      <div className="bg-white p-5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs text-gray-500 block">
            {levelCompleted
              ? '✓ Las 3 preguntas han sido calificadas.'
              : '⚠️ Puedes calificar todos los criterios o decidir avanzar directamente.'}
          </span>
          <span className="text-xs font-semibold text-gray-800">
            Nivel actual evaluado: <strong>{currentLevel}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Botón 1: Finalizar aquí */}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleFinalize(currentLevel)}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 text-gray-800 font-bold text-xs transition-all hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-600">check_circle</span>
            Finalizar en {currentLevel} (Asignar Nivel)
          </button>

          {/* Botón 2: Pasar al siguiente nivel */}
          {currentMeta.next && (
            <button
              type="button"
              disabled={saving}
              onClick={handleNextLevel}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-xl font-bold text-xs text-white shadow-lg shadow-indigo-600/25 bg-gradient-to-r from-[#2528b7] to-[#4f46e5] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Dar paso a Nivel {currentMeta.next}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
