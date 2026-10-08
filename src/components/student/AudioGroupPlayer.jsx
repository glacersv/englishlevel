import React, { useState, useRef, useEffect } from 'react'

// Marcadores de tiempo donde termina el diálogo y empieza la pausa/outro institucional o comercial
const AUDIO_END_POINTS = {
  'A1_first_day_at_schoolA1.mp3': 43.5,
  'A2_giving_directionsA2.mp3': 82.0,
  'B1_the_weekendB1.mp3': 162.0,
  'B2_new_inventions.mp3': 240.0,
  'C1_help_others_help_yourself.mp3': 288.0,
}

function getAudioCutoff(audioUrl) {
  if (!audioUrl) return null
  for (const [key, cutoff] of Object.entries(AUDIO_END_POINTS)) {
    if (audioUrl.includes(key)) return cutoff
  }
  return null
}

export function speakText(text) {
  if (!text || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

/**
 * AudioGroupPlayer:
 * - Mantiene el Audio Player IDÉNTICO al diseño original (tarjeta con bordes redondeados y fondo azul claro).
 * - El audio NUNCA se reinicia ni se detiene al cambiar de pregunta dentro del mismo audio.
 * - Mantiene las reproducciones compartidas para todo el audio (no se gastan al pasar con Next/Previous ni con pestañas).
 * - Permite navegar entre preguntas mediante TABS (Pregunta 1, Pregunta 2, etc.) o botones Previous / Next.
 */
export default function AudioGroupPlayer({
  group,
  examAnswers = {},
  onAnswerChange,
}) {
  const { audioUrl, audioText, questions } = group
  const maxPlays = typeof questions[0]?.maxPlays === 'number' ? questions[0].maxPlays : 2

  // Índice de la pregunta actualmente visible dentro de este bloque de audio
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)

  // Estado del audio persistente (compartido para todas las preguntas de este audio)
  const [playCount, setPlayCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const cutoff = getAudioCutoff(audioUrl)
  const effectiveDuration = cutoff && duration ? Math.min(cutoff, duration) : duration
  const remainingPlays = Math.max(0, maxPlays - playCount)
  const canPlay = remainingPlays > 0 || isPlaying

  // Solo reiniciamos el audio si cambia la URL del audio (es decir, cuando cambiamos a otra grabación completamente distinta)
  useEffect(() => {
    setActiveQuestionIdx(0)
    setPlayCount(0)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [audioUrl])

  const handleTogglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (!canPlay) return
      if (currentTime >= (effectiveDuration || 0.1) - 0.5) {
        audioRef.current.currentTime = 0
        setCurrentTime(0)
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true)
      }).catch(err => {
        console.warn('Error al iniciar audio:', err)
      })
    }
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const curr = audioRef.current.currentTime
    setCurrentTime(curr)

    if (cutoff && curr >= cutoff) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(cutoff)
      setPlayCount(prev => Math.min(maxPlays, prev + 1))
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setPlayCount(prev => Math.min(maxPlays, prev + 1))
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0)
    }
  }

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const progressPercent = effectiveDuration > 0
    ? Math.min(100, (currentTime / effectiveDuration) * 100)
    : 0

  const currentQ = questions[activeQuestionIdx] || questions[0]
  const currentAnswer = examAnswers[currentQ?.id]
  const isAnswered = currentAnswer != null

  const isFirstQ = activeQuestionIdx === 0
  const isLastQ = activeQuestionIdx === questions.length - 1

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-sm relative overflow-hidden space-y-6">
      {/* Etiqueta superior */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
          <span className="material-symbols-outlined text-[18px]">volume_up</span>
          <span>LISTENING COMPREHENSION</span>
        </div>

        {/* Pestañas (Tabs) de navegación directa entre preguntas de este audio */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {questions.map((q, idx) => {
            const hasAns = examAnswers[q.id] != null
            const isCur = idx === activeQuestionIdx
            return (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => setActiveQuestionIdx(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  isCur
                    ? 'bg-[#2528b7] text-white shadow-xs'
                    : hasAns
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'text-slate-600 hover:bg-white'
                }`}
                title={`Pregunta ${idx + 1}`}
              >
                <span>P{idx + 1}</span>
                {hasAns && <span className="text-[10px]">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prompt / Instrucción del reactivo actual */}
      {currentQ?.prompt && currentQ.prompt !== currentQ.question && (
        <p className="font-heading font-bold text-lg md:text-xl text-slate-900 leading-snug">
          {currentQ.prompt}
        </p>
      )}

      {/* ================= REPRODUCTOR DE AUDIO (IDÉNTICO AL DISEÑO ORIGINAL) ================= */}
      {audioUrl ? (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/70 border border-indigo-200/90 shadow-xs flex flex-col gap-3.5">
          {/* Header del reproductor: Icono y badge de reproducciones */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[18px]">headphones</span>
              </span>
              <div>
                <span className="text-xs font-black text-indigo-950 block leading-tight">
                  Audio Oficial de Evaluación
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {canPlay ? 'Escucha con atención antes de responder' : 'Límite de reproducciones alcanzado'}
                </span>
              </div>
            </div>

            {/* Contador de Reproducciones Restantes (compartidas en todas las preguntas) */}
            <div className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all ${
              remainingPlays > 1
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : remainingPlays === 1
                ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className="material-symbols-outlined text-[15px]">
                {remainingPlays > 0 ? 'replay' : 'block'}
              </span>
              <span>
                {remainingPlays > 0 ? `${remainingPlays} de ${maxPlays} escuchas` : '0 escuchas restantes'}
              </span>
            </div>
          </div>

          {/* Elemento de audio HTML oculto controlado por el componente */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onLoadedMetadata={handleLoadedMetadata}
            preload="metadata"
          />

          {/* Barra de progreso visual y tiempos */}
          <div className="space-y-1.5 w-full">
            <div className="w-full h-2.5 bg-indigo-100/80 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-[#2528b7] rounded-full transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          {/* Botón principal de Reproducción / Pausa */}
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={!canPlay && !isPlaying}
              className={`px-6 py-2.5 rounded-full font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                  : canPlay
                  ? 'bg-[#2528b7] hover:bg-[#1d2096] text-white shadow-indigo-600/25 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>
                {isPlaying ? 'Pausar Audio' : canPlay ? 'Reproducir Audio' : 'Sin reproducciones'}
              </span>
            </button>
          </div>

          {remainingPlays === 0 && !isPlaying && (
            <p className="text-[11px] text-center text-rose-600 font-semibold">
              ⚠️ Has completado las {maxPlays} reproducciones permitidas para este audio. Selecciona tus respuestas a continuación.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4">
          <button
            type="button"
            onClick={() => speakText(audioText)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#2528b7] text-white font-bold text-sm shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">volume_up</span>
            <span>Play Audio</span>
          </button>
        </div>
      )}

      {/* ================= CONTENIDO DE LA PREGUNTA SELECCIONADA ================= */}
      {currentQ && (
        <div className="space-y-4 pt-1">
          {/* Enunciado específico de la pregunta */}
          {currentQ.question && (
            <p className="font-bold text-base md:text-lg text-gray-900 px-1">
              {currentQ.question}
            </p>
          )}

          {/* Opciones de respuesta */}
          <div className="flex flex-col gap-2.5">
            {currentQ.options?.map((opt, i) => {
              const isSelected = currentAnswer === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAnswerChange(currentQ.id, i)}
                  className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-sm ring-1 ring-indigo-500'
                      : 'border-gray-200 bg-white hover:bg-slate-50 text-gray-800'
                  }`}
                >
                  <span>{opt}</span>
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer informativo de estado de respuesta */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          {isAnswered ? (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="text-slate-700 font-bold">Respuesta registrada</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Selecciona tu respuesta para continuar</span>
            </>
          )}
        </span>

        {/* Sub-navegación entre preguntas de este mismo audio */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFirstQ}
            onClick={() => setActiveQuestionIdx(i => Math.max(0, i - 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            <span>Anterior</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400">
            {activeQuestionIdx + 1} de {questions.length}
          </span>

          <button
            type="button"
            disabled={isLastQ}
            onClick={() => setActiveQuestionIdx(i => Math.min(questions.length - 1, i + 1))}
            className="px-3 py-1.5 rounded-lg bg-[#2528b7] text-white text-xs font-bold hover:brightness-110 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <span>Siguiente</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  )
}
