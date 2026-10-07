import React, { useState, useEffect } from 'react'
import { MODULES, moduleCatalog, LEVELS } from '../../modules/registry'
import { saveExam, getExams, deleteExam, getDiagnosticConfig } from '../../lib/dataService'
import { AI_TOPICS, generateAIQuestion } from '../../lib/aiQuestionGenerator'
import { OFFICIAL_DIAGNOSTIC_EXAMS } from '../../data/officialExamsData'
import QuestionPlayer from '../student/QuestionPlayer'

const GRADE_PILLS = [
  { id: 'all', label: 'Universal (Todos)' },
  { id: '6°', label: '6° Grado' },
  { id: '7°', label: '7° Grado' },
  { id: '8°', label: '8° Grado' },
  { id: '9°', label: '9° Grado' },
  { id: '10°', label: '10° Bach.' },
  { id: '11°', label: '11° Bach.' },
  { id: '12°', label: '12° Téc.' },
]

export default function ExamBuilder({ onPublished }) {
  const [viewMode, setViewMode] = useState('list') // 'list' para ver exámenes creados / 'create' para asistente
  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState({
    title: '',
    grade: 'all',
    level: 'A1',
    weight: 12,              // % de peso dentro de plataforma
    timeLimitMinutes: 15,    // temporizador en minutos (0 = ilimitado)
    audioMaxPlays: 2,        // límite de reproducciones de audio por pregunta (1 a 5)
    toolType: 'multipleChoice'
  })
  const [questions, setQuestions] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingDefaults, setLoadingDefaults] = useState(false)

  // Estado para el modal de Prueba / Simulación interactiva del docente
  const [simulatingExam, setSimulatingExam] = useState(null)
  const [simulationIndex, setSimulationIndex] = useState(0)
  const [simulationScore, setSimulationScore] = useState(0)
  const [simulationTimeLeft, setSimulationTimeLeft] = useState(0)

  // Presupuesto porcentual de plataforma
  const [existingExams, setExistingExams] = useState([])
  const [maxPlatformWeight, setMaxPlatformWeight] = useState(60)

  // Modo de configuración de ponderación:
  // 'internal_100': Los tests se reparten un 100% interno de la batería (y se escala automáticamente al % de plataforma)
  // 'global_platform': Los tests se configuran directamente con su % absoluto sobre la nota global (ej: 60% o 70%)
  const [weightMode, setWeightMode] = useState('internal_100')

  useEffect(() => {
    loadExistingExamsAndConfig()
  }, [])

  // Temporizador interactivo de prueba para simulación
  useEffect(() => {
    if (!simulatingExam || simulationTimeLeft <= 0) return
    const timer = setInterval(() => {
      setSimulationTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [simulatingExam, simulationTimeLeft > 0])

  const loadExistingExamsAndConfig = async () => {
    try {
      const [examsList, config] = await Promise.all([
        getExams(),
        getDiagnosticConfig()
      ])
      const finalExams = (examsList && examsList.length > 0) ? examsList : OFFICIAL_DIAGNOSTIC_EXAMS
      setExistingExams(finalExams)
      if (config?.weights?.platform) {
        setMaxPlatformWeight(config.weights.platform)
      }
    } catch (e) {
      console.warn('Error cargando configuración de exámenes:', e)
      setExistingExams(OFFICIAL_DIAGNOSTIC_EXAMS)
    }
  }

  // Objetivo máximo según el modo seleccionado (100% para interno, o maxPlatformWeight para global)
  const targetBudget = weightMode === 'internal_100' ? 100 : maxPlatformWeight

  // Cálculo de pesos existentes para el grado seleccionado
  const allocatedWeightOtherExams = existingExams
    .filter(e => e.active !== false && (meta.grade === 'all' || e.grade === 'all' || e.grade === meta.grade))
    .reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0)

  const currentTotalWeight = allocatedWeightOtherExams + (Number(meta.weight) || 0)
  const isWeightExceeded = currentTotalWeight > targetBudget

  // Official standardized battery loader (100% English, Pure Tests, 20 Scramble Sentences)
  const handleLoadOfficialBattery = async () => {
    const confirmLoad = window.confirm(
      'Do you want to load the Official Diagnostic Battery (CEFR A1 - C1)?\n\nThis will install 4 standardized tests with 100% English instructions:\n1. Listening Comprehension (Audio-only with official MP3s)\n2. Syntax & Sentence Scramble (20 Drag-and-Drop Sentences A1-C1)\n3. Reading Comprehension & Textual Analysis (Passages & True/False)\n4. Use of English & Grammatical Cloze (Gap-fill precision)'
    )
    if (!confirmLoad) return

    setLoadingDefaults(true)
    try {
      for (const exam of OFFICIAL_DIAGNOSTIC_EXAMS) {
        await saveExam(exam)
      }
      await loadExistingExamsAndConfig()
      alert('✅ Official Standardized Diagnostic Battery successfully installed and synchronized.')
      onPublished?.()
    } catch (err) {
      console.error('Error loading official diagnostic exams:', err)
      alert('Error loading exams: ' + err.message)
    } finally {
      setLoadingDefaults(false)
    }
  }

  // Estado para el modal de Asistente IA
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiConfig, setAiConfig] = useState({
    type: 'multipleChoice',
    level: 'A1',
    topic: 'daily_routine'
  })
  const [aiPreview, setAiPreview] = useState(null)
  const [isAiGenerating, setIsAiGenerating] = useState(false)

  const addQuestion = q => {
    setQuestions([...questions, q])
  }
  const removeQuestion = i => setQuestions(questions.filter((_, x) => x !== i))

  const handleTriggerAiGenerate = () => {
    setIsAiGenerating(true)
    setTimeout(() => {
      const generated = generateAIQuestion(aiConfig.type, aiConfig.level, aiConfig.topic)
      setAiPreview(generated)
      setIsAiGenerating(false)
    }, 400)
  }

  const handleAcceptAiQuestion = () => {
    if (!aiPreview) return
    addQuestion(aiPreview)
    setAiPreview(null)
    setIsAiModalOpen(false)
  }

  const publish = async () => {
    if (isWeightExceeded) {
      alert(`⚠️ El porcentaje total acumulado (${currentTotalWeight}%) sobrepasa el límite asignado para la plataforma (${maxPlatformWeight}%). Ajusta la ponderación antes de guardar.`)
      return
    }

    setSaving(true)
    try {
      await saveExam({
        id: `exam_${Date.now()}`,
        ...meta,
        questions,
        active: true,
        createdAt: new Date().toISOString(),
      })
      alert('✅ Test interactivo publicado y sincronizado con éxito.')
      onPublished?.()
    } catch (e) {
      console.error('Error publicando examen:', e)
      alert('Error guardando examen: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de cabecera con selector de modo: Batería Oficial vs Crear Nuevo */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-purple-50/90 p-5 rounded-3xl border border-indigo-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#2528b7] text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-2xl">auto_stories</span>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">
              Batería Oficial Diagnóstica MCER (A1 a C1)
            </h3>
            <p className="text-xs text-gray-600">
              Tests con audios MP3 oficiales, lecturas de Macmillan y preguntas calibradas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white/90 p-1 rounded-2xl border border-indigo-200/60 shadow-2xs flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-[#2528b7] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              <span>Batería de Tests ({existingExams.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('create')
                setStep(1)
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'create'
                  ? 'bg-[#2528b7] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Crear Nuevo</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleLoadOfficialBattery}
            disabled={loadingDefaults}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            title="Cargar automáticamente los 4 tests oficiales del material de evaluación A1-C1"
          >
            <span className="material-symbols-outlined text-[16px]">
              {loadingDefaults ? 'sync' : 'library_add'}
            </span>
            <span>{loadingDefaults ? 'Precargando...' : 'Precargar Batería'}</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: LISTADO DE EXÁMENES DE LA BATERÍA CREADOS */}
      {viewMode === 'list' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-extrabold text-gray-900">
                Tests Activos en Plataforma ({existingExams.length})
              </h4>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                allocatedWeightOtherExams === 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-indigo-100 text-[#2528b7]'
              }`}>
                Total Asignado: {allocatedWeightOtherExams}% de {targetBudget}% (Batería de Tests)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewMode('create')
                setStep(1)
              }}
              className="text-xs font-bold text-[#2528b7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Crear otro examen</span>
            </button>
          </div>

          {existingExams.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-200 text-center space-y-3 shadow-xs">
              <span className="material-symbols-outlined text-4xl text-gray-300">quiz</span>
              <h5 className="font-bold text-gray-800 text-sm">Aún no se ha cargado la batería de exámenes</h5>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Haz clic en el botón verde <strong>"Precargar Batería"</strong> para instalar de inmediato los 4 exámenes oficiales basados en el material A1 a C1.
              </p>
              <button
                type="button"
                onClick={handleLoadOfficialBattery}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#2528b7] text-white text-xs font-bold hover:brightness-110 shadow-md cursor-pointer"
              >
                Precargar Batería Oficial Ahora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {existingExams.map((ex, idx) => (
                <div
                  key={ex.id || idx}
                  className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-[#2528b7] border border-indigo-200">
                        Nivel {ex.level || 'A1'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                        <span className="material-symbols-outlined text-[15px] text-indigo-600">percent</span>
                        <span>{ex.weight || 15}% peso</span>
                      </div>
                    </div>

                    <h5 className="font-heading font-extrabold text-sm text-gray-900 leading-snug">
                      {ex.title}
                    </h5>

                    {ex.description && (
                      <p className="text-[11px] text-gray-500 line-clamp-2">
                        {ex.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-gray-600 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-amber-600">timer</span>
                        <span>{ex.timeLimitMinutes > 0 ? `${ex.timeLimitMinutes} min` : 'Sin límite'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-blue-600">format_list_bulleted</span>
                        <span>{(ex.questions || []).length} preguntas</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-purple-600">school</span>
                        <span>{ex.grade === 'all' ? 'Universal' : ex.grade}</span>
                      </span>
                    </div>

                    {/* Reproductor dinámico de audio según las pistas reales del examen */}
                    {(() => {
                      const questionsWithAudio = (ex.questions || []).filter(q => q.audioUrl)
                      const uniqueAudioTracks = Array.from(
                        new Map(questionsWithAudio.map(q => [q.audioUrl, q])).values()
                      )

                      if (uniqueAudioTracks.length === 0) return null

                      return (
                        <div className="mt-2 p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
                            <span className="material-symbols-outlined text-[18px] text-indigo-600">headphones</span>
                            <span>Pistas Oficiales de Audio ({uniqueAudioTracks.length})</span>
                          </div>

                          {uniqueAudioTracks.map((track, trackIdx) => {
                            const filename = track.audioUrl.split('/').pop().replace('.mp3', '').replace(/_/g, ' ')
                            return (
                              <div key={track.audioUrl || trackIdx} className="bg-white p-2.5 rounded-xl border border-indigo-100 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                                  <span className="capitalize">{trackIdx + 1}. {track.prompt?.split('(')[1]?.split(')')[0] || filename}</span>
                                  <span className="text-[10px] text-indigo-600 font-mono">Nivel {track.level || ex.level || 'MP3'}</span>
                                </div>
                                <audio controls src={track.audioUrl} className="w-full h-8">
                                  Tu navegador no soporta audio.
                                </audio>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Publicado y Activo</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSimulatingExam(ex)
                          setSimulationIndex(0)
                          setSimulationScore(0)
                          setSimulationTimeLeft((ex.timeLimitMinutes || 15) * 60)
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2528b7] to-[#4f46e5] text-white hover:brightness-110 font-black text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                        title="Probar y responder este examen tal como lo verá el estudiante"
                      >
                        <span className="material-symbols-outlined text-[15px]">play_circle</span>
                        <span>Probar Examen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMeta({
                            title: ex.title,
                            grade: ex.grade || 'all',
                            level: ex.level || 'A1',
                            weight: ex.weight || 12,
                            timeLimitMinutes: ex.timeLimitMinutes || 15,
                            audioMaxPlays: ex.audioMaxPlays || 2,
                            toolType: ex.toolType || 'multipleChoice'
                          })
                          setQuestions(ex.questions || [])
                          setViewMode('create')
                          setStep(2)
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-[#2528b7] text-gray-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Editar parámetros o reactivos de este examen"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`¿Deseas ELIMINAR el examen "${ex.title}" de la plataforma?`)) return
                          try {
                            await deleteExam(ex.id)
                            await loadExistingExamsAndConfig()
                          } catch (err) {
                            alert('Error al eliminar: ' + err.message)
                          }
                        }}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors flex items-center justify-center cursor-pointer"
                        title="Eliminar este examen"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: CREAR O EDITAR TEST INTERACTIVO (WIZARD 3 PASOS) */}
      {viewMode === 'create' && (
        <div className="space-y-6">
          {/* Wizard Step Indicator */}
          <div className="flex items-center justify-between max-w-xl mx-auto mb-6">
            {[
              { num: 1, label: 'Parámetros y Ponderación' },
              { num: 2, label: 'Reactivos & Asistente IA' },
              { num: 3, label: 'Confirmación' }
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s.num
                      ? 'bg-[#2528b7] text-white shadow-sm ring-2 ring-indigo-200'
                      : 'bg-slate-100 text-gray-500'
                  }`}
                >
                  {s.num}
                </div>
                <span className={`text-xs font-semibold ${step >= s.num ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                  {s.label}
                </span>
                {i < 2 && <div className="w-10 h-0.5 bg-gray-200 hidden sm:block mx-2"></div>}
              </div>
            ))}
          </div>

      {/* Paso 1: Configuración General con Toggles / Pills y Medidor de Presupuesto % */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Título del Test / Instrumento
            </label>
            <input
              type="text"
              value={meta.title}
              placeholder="Ej: Test 1: Comprensión Auditiva (Diálogo Escolar A1)"
              onChange={e => setMeta({ ...meta, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50/50 text-xs md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2528b7]/30"
            />
          </div>

          {/* Grado Asignado: TOGGLE PILLS OVALADOS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800">
                Grado Asignado
              </label>
              <span className="text-[11px] font-semibold text-gray-400">
                Seleccionado: <strong className="text-[#2528b7]">{meta.grade === 'all' ? 'Universal' : meta.grade}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {GRADE_PILLS.map(g => {
                const isSelected = meta.grade === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setMeta({ ...meta, grade: g.id })}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2528b7] text-white shadow-sm ring-2 ring-indigo-300'
                        : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                    }`}
                  >
                    {g.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nivel MCER Objetivo: TOGGLE PILLS CON BADGES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800">
                Nivel MCER Objetivo
              </label>
              <span className="text-[11px] font-semibold text-gray-400">
                Nivel: <strong className="text-[#2528b7]">{meta.level}</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {LEVELS.map(l => {
                const isSelected = meta.level === l.id
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setMeta({ ...meta, level: l.id })}
                    className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#2528b7] text-white border-[#2528b7] shadow-md ring-2 ring-indigo-200'
                        : 'bg-slate-50/70 text-gray-700 border-gray-200 hover:bg-slate-100 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-base font-black">{l.id}</span>
                    <span className={`text-[10px] truncate max-w-full font-medium ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                      {l.name.split('-')[1]?.trim() || l.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Temporizador, Límite de Reproducciones de Audio y Ponderación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
            {/* Temporizador límite */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-amber-600">timer</span>
                Temporizador Límite
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={meta.timeLimitMinutes}
                  onChange={e => setMeta({ ...meta, timeLimitMinutes: parseInt(e.target.value, 10) || 0 })}
                  className="w-20 px-2.5 py-1.5 rounded-xl border border-amber-300 text-xs font-black bg-white text-center shadow-xs"
                />
                <span className="text-xs text-amber-900 font-semibold">minutos</span>
              </div>
              <p className="text-[10px] text-amber-800">
                (Usa 0 para tiempo libre sin cuenta regresiva).
              </p>
            </div>

            {/* Límite de reproducciones de audio */}
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-1.5">
              <label className="text-xs font-bold text-purple-950 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-purple-600">replay</span>
                Límite de Audios
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={meta.audioMaxPlays || 2}
                  onChange={e => setMeta({ ...meta, audioMaxPlays: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-20 px-2.5 py-1.5 rounded-xl border border-purple-300 text-xs font-black bg-white text-center shadow-xs"
                />
                <span className="text-xs text-purple-900 font-semibold">reproducciones</span>
              </div>
              <p className="text-[10px] text-purple-800">
                (El audio se bloquea al alcanzar este número).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#2528b7]">percent</span>
                  Ponderación de este Test
                </label>
                {/* Toggle de Modo: 100% Interno vs % Directo de Plataforma */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-indigo-200 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setWeightMode('internal_100')}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      weightMode === 'internal_100'
                        ? 'bg-[#2528b7] text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    100% Interno
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightMode('global_platform')}
                    className={`px-2 py-0.5 rounded font-bold transition-all ${
                      weightMode === 'global_platform'
                        ? 'bg-[#2528b7] text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Directo ({maxPlatformWeight}%)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={targetBudget}
                  value={meta.weight}
                  onChange={e => setMeta({ ...meta, weight: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-20 px-2.5 py-1.5 rounded-xl border border-indigo-300 text-xs font-black bg-white text-center shadow-xs"
                />
                <span className="text-xs text-indigo-900 font-semibold">
                  {weightMode === 'internal_100' ? '% interno de la batería' : '% sobre la nota total'}
                </span>
              </div>

              <div className="text-[10px] text-indigo-800 bg-white/70 p-2 rounded-xl border border-indigo-100 flex items-center justify-between">
                <span>
                  {weightMode === 'internal_100' ? (
                    <>Equivale a: <strong>{((meta.weight || 0) * (maxPlatformWeight / 100)).toFixed(1)}%</strong> de la nota global (Plataforma: {maxPlatformWeight}%).</>
                  ) : (
                    <>Equivale al <strong>{maxPlatformWeight > 0 ? (((meta.weight || 0) / maxPlatformWeight) * 100).toFixed(1) : 0}%</strong> interno de los tests.</>
                  )}
                </span>
                <span className="font-bold text-indigo-600">Meta: {targetBudget}%</span>
              </div>
            </div>
          </div>

          {/* CONTROL Y MEDIDOR EN TIEMPO REAL DEL % TOTAL ACUMULADO */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isWeightExceeded
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : currentTotalWeight === targetBudget
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-gray-800'
          }`}>
            <div className="flex items-center justify-between text-xs font-extrabold mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">
                  {isWeightExceeded ? 'warning' : currentTotalWeight === targetBudget ? 'check_circle' : 'monitoring'}
                </span>
                <span>
                  {weightMode === 'internal_100'
                    ? 'Presupuesto Interno de la Batería de Tests (100%):'
                    : `Presupuesto Global de Plataforma (${maxPlatformWeight}%):`}
                </span>
              </div>
              <span>
                <strong>{currentTotalWeight}%</strong> / {targetBudget}%
              </span>
            </div>

            {/* Barra de progreso visual acumulada */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden relative">
              {/* Peso de otros exámenes */}
              <div
                className="h-full bg-indigo-400 absolute left-0 top-0 transition-all"
                style={{ width: `${Math.min(100, (allocatedWeightOtherExams / targetBudget) * 100)}%` }}
                title={`Otros tests: ${allocatedWeightOtherExams}%`}
              />
              {/* Peso de este examen */}
              <div
                className={`h-full absolute top-0 transition-all ${
                  isWeightExceeded ? 'bg-rose-600' : 'bg-emerald-500'
                }`}
                style={{
                  left: `${Math.min(100, (allocatedWeightOtherExams / targetBudget) * 100)}%`,
                  width: `${Math.min(100 - (allocatedWeightOtherExams / targetBudget) * 100, ((meta.weight || 0) / targetBudget) * 100)}%`
                }}
                title={`Este test: ${meta.weight}%`}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold mt-1.5">
              <span>Otros tests: {allocatedWeightOtherExams}% | Este test: {meta.weight || 0}%</span>
              <span>
                {isWeightExceeded ? (
                  <strong className="text-rose-700">⚠️ Te pasas por {currentTotalWeight - targetBudget}%</strong>
                ) : currentTotalWeight === targetBudget ? (
                  <strong className="text-emerald-700">🎯 Presupuesto exacto (100% completado sin faltantes)</strong>
                ) : (
                  <span className="text-gray-500">Quedan disponibles {targetBudget - currentTotalWeight}%</span>
                )}
              </span>
            </div>
          </div>

          {/* Botón continuar */}
          <div className="pt-2 flex justify-between items-center">
            <span className="text-[11px] text-gray-400">
              {existingExams.length} test(s) creados previamente en el sistema.
            </span>
            <button
              disabled={!meta.title.trim() || isWeightExceeded}
              onClick={() => setStep(2)}
              className="py-2.5 px-6 rounded-xl bg-[#2528b7] text-white font-bold text-xs tracking-wide shadow-md hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continuar a Reactivos</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Paso 2: Catálogo de Módulos & Botón Asistente IA */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h4 className="font-heading font-extrabold text-sm text-gray-900">
                Reactivos del Examen ({questions.length})
              </h4>
              <p className="text-xs text-gray-500">
                Añade reactivos manualmente del catálogo o usa el <strong>Asistente IA</strong> para crearlos en segundos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiConfig(prev => ({ ...prev, level: meta.level }))
                  setAiPreview(null)
                  setIsAiModalOpen(true)
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:brightness-110 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>Generar con IA</span>
              </button>
            </div>
          </div>

          {/* Grid de módulos interactivos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {moduleCatalog().map(m => (
              <ModulePicker key={m.id} mod={m} onAdd={q => addQuestion(q)} />
            ))}
          </div>

          {/* Lista de reactivos creados */}
          {questions.length > 0 && (
            <div className="space-y-2 pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Preguntas agregadas al test:</h5>
              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                {questions.map((q, i) => (
                  <div key={i} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-black flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] uppercase shrink-0">
                        {MODULES[q.type]?.name || q.type}
                      </span>
                      <span className="text-gray-800 font-medium truncate max-w-lg">{q.prompt}</span>
                    </div>
                    <button
                      onClick={() => removeQuestion(i)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                      title="Eliminar reactivo"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={() => setStep(1)}
              className="py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              ← Modificar Parámetros
            </button>
            <button
              disabled={questions.length === 0}
              onClick={() => setStep(3)}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Revisar y Publicar</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Confirmación de Publicación */}
      {step === 3 && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-xl text-gray-900">Resumen del Test Interactivo</h3>
            <p className="text-xs text-gray-500 mt-1">Listo para ser sincronizado en Firestore y publicado para los alumnos.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 text-xs text-left space-y-2.5 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-gray-500">Título:</span>
              <span className="font-bold text-gray-900">{meta.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Grado:</span>
              <span className="font-bold text-gray-900">{meta.grade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nivel MCER:</span>
              <span className="font-extrabold text-indigo-700">{meta.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Temporizador:</span>
              <span className="font-bold text-amber-700">
                {meta.timeLimitMinutes > 0 ? `${meta.timeLimitMinutes} minutos` : 'Ilimitado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ponderación:</span>
              <span className="font-bold text-indigo-700">{meta.weight}%</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-gray-500 font-bold">Total reactivos:</span>
              <span className="font-extrabold text-gray-900">{questions.length} ejercicios</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              className="py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-50 cursor-pointer"
            >
              Añadir más reactivos
            </button>
            <button
              disabled={saving}
              onClick={publish}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">publish</span>
              <span>{saving ? 'Publicando...' : 'Publicar Test Oficial'}</span>
            </button>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Modal Asistente IA Generador de Preguntas */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-[24px]">auto_awesome</span>
                <h3 className="font-heading font-extrabold text-base text-gray-900">
                  Asistente IA: Generador de Reactivos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Parámetros de la IA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Tipo de Herramienta</label>
                <select
                  value={aiConfig.type}
                  onChange={e => setAiConfig({ ...aiConfig, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white"
                >
                  <option value="multipleChoice">Opción Múltiple</option>
                  <option value="trueFalse">Verdadero o Falso</option>
                  <option value="orderSentence">Ordenar Oración (Scramble)</option>
                  <option value="fillParagraph">Completar Párrafo (Cloze)</option>
                  <option value="listening">Comprensión Auditiva</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Nivel MCER</label>
                <select
                  value={aiConfig.level}
                  onChange={e => setAiConfig({ ...aiConfig, level: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white"
                >
                  {LEVELS.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1">Tema Curricular</label>
              <select
                value={aiConfig.topic}
                onChange={e => setAiConfig({ ...aiConfig, topic: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white"
              >
                {AI_TOPICS.map(t => (
                  <option key={t.id} value={t.id}>{t.label} ({t.levels.join(', ')})</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={isAiGenerating}
              onClick={handleTriggerAiGenerate}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <span>{isAiGenerating ? 'Generando con IA...' : 'Generar Reactivo'}</span>
            </button>

            {/* Vista Previa del Reactivo Generado */}
            {aiPreview && (
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-2 animate-fadeIn">
                <span className="text-[10px] font-black uppercase text-purple-700 block">
                  ✨ Reactivo Generado:
                </span>
                <p className="font-bold text-gray-900">{aiPreview.prompt}</p>
                {aiPreview.readingText && (
                  <p className="text-[11px] text-gray-600 italic">"{aiPreview.readingText}"</p>
                )}
                {aiPreview.options && (
                  <ul className="list-disc list-inside text-gray-700 pl-1">
                    {aiPreview.options.map((opt, oIdx) => (
                      <li key={oIdx} className={oIdx === aiPreview.correctIndex ? 'font-bold text-emerald-700' : ''}>
                        {opt} {oIdx === aiPreview.correctIndex && '✓'}
                      </li>
                    ))}
                  </ul>
                )}
                {aiPreview.words && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {aiPreview.words.map((w, wIdx) => (
                      <span key={wIdx} className="px-2 py-0.5 bg-white border border-purple-200 rounded text-[10px] font-bold">
                        {w}
                      </span>
                    ))}
                  </div>
                )}
                {aiPreview.explanation && (
                  <p className="text-[10px] text-purple-900 border-t border-purple-200/60 pt-1.5">
                    💡 <em>{aiPreview.explanation}</em>
                  </p>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAcceptAiQuestion}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Agregar al Examen</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL DE SIMULACIÓN / PRUEBA INTERACTIVA DEL EXAMEN (VISTA ALUMNO) */}
      {simulatingExam && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl flex flex-col justify-between">
            {/* Header del examen en prueba */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-[#2528b7] text-white flex items-center justify-center font-black shadow-sm">
                  {simulatingExam.level || 'A1'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-extrabold text-sm md:text-base text-gray-900">
                      {simulatingExam.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                      Teacher Preview Mode
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Question {simulationIndex + 1} of {(simulatingExam.questions || []).length} · Test Weight: {simulatingExam.weight}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Cronómetro activo de simulación */}
                {(simulatingExam.timeLimitMinutes || 0) > 0 && (
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono text-xs font-black transition-all ${
                    simulationTimeLeft <= 60
                      ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                      : simulationTimeLeft <= 300
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-gray-200 text-gray-800 shadow-2xs'
                  }`}>
                    <span className="material-symbols-outlined text-[16px] text-amber-600">timer</span>
                    <span>
                      {Math.floor(simulationTimeLeft / 60)}:
                      {(simulationTimeLeft % 60) < 10 ? '0' : ''}
                      {simulationTimeLeft % 60}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSimulatingExam(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Cuerpo del examen interactivo con QuestionPlayer */}
            <div className="p-6">
              {simulatingExam.questions && simulatingExam.questions.length > 0 ? (
                (() => {
                  const currentQ = simulatingExam.questions[simulationIndex]
                  if (!currentQ) {
                    return (
                      <div className="text-center py-10 space-y-4">
                        <span className="material-symbols-outlined text-5xl text-emerald-500">emoji_events</span>
                        <h4 className="font-heading font-extrabold text-lg text-gray-900">
                          Test Preview Completed!
                        </h4>
                        <p className="text-xs text-gray-600 max-w-md mx-auto">
                          You have answered all {simulatingExam.questions.length} questions of this diagnostic test.
                        </p>
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl max-w-xs mx-auto text-xs font-bold text-emerald-900">
                          Score obtained: {simulationScore} / {simulatingExam.questions.length} correct
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSimulationIndex(0)
                            setSimulationScore(0)
                          }}
                          className="px-4 py-2 rounded-xl bg-[#2528b7] text-white text-xs font-bold hover:brightness-110 cursor-pointer"
                        >
                          Restart Test
                        </button>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      {/* Progreso del examen */}
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2528b7] transition-all"
                          style={{
                            width: `${((simulationIndex + 1) / simulatingExam.questions.length) * 100}%`
                          }}
                        />
                      </div>

                      <QuestionPlayer
                        key={currentQ.id || simulationIndex}
                        question={{
                          ...currentQ,
                          maxPlays: currentQ.maxPlays ?? simulatingExam.audioMaxPlays ?? 2
                        }}
                        onResult={(isCorrect) => {
                          if (isCorrect) setSimulationScore(s => s + 1)
                        }}
                      />

                      {/* Botones de navegación de la prueba */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          disabled={simulationIndex === 0}
                          onClick={() => setSimulationIndex(i => Math.max(0, i - 1))}
                          className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                        >
                          ← Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulationIndex(i => i + 1)}
                          className="px-4 py-1.5 rounded-xl bg-[#2528b7] text-white text-xs font-bold hover:brightness-110 cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <span>{simulationIndex + 1 >= simulatingExam.questions.length ? 'Finish Test' : 'Next Question'}</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="text-center py-8 text-gray-500 text-xs">
                  This test currently has no questions registered.
                </div>
              )}
            </div>

            {/* Footer con tiempo límite informativo */}
            <div className="p-4 border-t border-gray-100 bg-slate-50/50 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[16px] text-amber-600">timer</span>
                <span>Official student time limit: <strong>{simulatingExam.timeLimitMinutes || 15} minutes</strong></span>
              </span>
              <button
                type="button"
                onClick={() => setSimulatingExam(null)}
                className="text-xs font-bold text-[#2528b7] hover:underline cursor-pointer"
              >
                Close and return to list
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function ModulePicker({ mod, onAdd }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(mod.makeEmpty())

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-3 rounded-2xl border border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/20 transition-all text-left flex flex-col justify-between h-28 shadow-xs group cursor-pointer"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">{mod.icon}</span>
        <div>
          <b className="block text-xs text-gray-900 font-bold leading-tight">{mod.name}</b>
          <span className="text-[10px] text-gray-400 line-clamp-1">{mod.desc}</span>
        </div>
      </button>
    )
  }

  const handleSaveDraft = () => {
    onAdd(draft)
    setOpen(false)
    setDraft(mod.makeEmpty())
  }

  return (
    <div className="col-span-full bg-white rounded-3xl p-5 border-2 border-indigo-400 shadow-xl space-y-4 animate-scaleIn">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mod.icon}</span>
          <h4 className="font-heading font-extrabold text-sm text-gray-900">Configurar: {mod.name}</h4>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded-lg text-gray-400 hover:bg-slate-100 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Instrucción / Enunciado</label>
        <input
          type="text"
          value={draft.prompt}
          onChange={e => setDraft({ ...draft, prompt: e.target.value })}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-slate-100 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveDraft}
          className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm cursor-pointer"
        >
          Guardar Pregunta
        </button>
      </div>
    </div>
  )
}
