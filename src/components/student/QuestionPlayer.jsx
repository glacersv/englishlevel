import React, { useState, useRef, useEffect } from 'react'

export function speak(text) {
  if (!text || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export default function QuestionPlayer({ question, initialAnswer = null, onResult, onAnswerChange, showFeedback = false }) {
  const [answer, setAnswer] = useState(initialAnswer)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)

  // Sincronizar si cambia la pregunta o la respuesta inicial previa
  useEffect(() => {
    setAnswer(initialAnswer != null ? initialAnswer : null)
  }, [question?.id, initialAnswer])

  // Actualizar respuesta y notificar automáticamente
  const handleUpdateAnswer = (newVal) => {
    setAnswer(newVal)
    onAnswerChange?.(newVal)
    const isCorrect = QUESTION_CHECKERS[question.type] ? QUESTION_CHECKERS[question.type](question, newVal) : false
    onResult?.(isCorrect, newVal)
  }

  const check = () => {
    const ok = QUESTION_CHECKERS[question.type] ? QUESTION_CHECKERS[question.type](question, answer) : false
    setCorrect(ok)
    setChecked(true)
    onResult?.(ok, answer)
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-sm relative overflow-hidden">
      {/* Interaction type tag */}
      <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2">
        <span className="material-symbols-outlined text-[18px]">
          {MODULE_ICONS[question.type] || 'help'}
        </span>
        <span>{MODULE_LABEL[question.type]}</span>
      </div>

      <p className="font-heading font-bold text-lg md:text-xl text-on-surface mb-6">
        {question.prompt}
      </p>

      {/* Interaction view per question type */}
      <div className="mb-6">
        {QUESTION_VIEWS[question.type](question, answer, handleUpdateAnswer, false)}
      </div>

      {/* Botón de confirmación / Siguiente en silencio (Sin revelar si está bien o mal) */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          {answer != null ? (
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
      </div>
    </div>
  )
}

const MODULE_ICONS = {
  multipleChoice: 'radio_button_checked',
  trueFalse: 'check_circle',
  orderSentence: 'format_align_left',
  fillParagraph: 'edit_note',
  listening: 'volume_up',
  speaking: 'mic',
  writing: 'edit'
}

const MODULE_LABEL = {
  multipleChoice: 'Multiple Choice',
  trueFalse: 'True or False',
  orderSentence: 'Sentence Scramble',
  fillParagraph: 'Gap Fill / Cloze',
  listening: 'Listening Comprehension',
  speaking: 'Speaking Evaluation',
  writing: 'Guided Writing'
}

const explain = q => {
  if (q.type === 'multipleChoice') return `Correct answer: ${q.options[q.correctIndex]}`
  if (q.type === 'trueFalse') {
    const isT = q.isTrue !== undefined ? q.isTrue : q.correct
    return `Correct answer: ${isT ? 'True' : 'False'}. ${q.explanation || ''}`
  }
  if (q.type === 'orderSentence') return `Correct order: ${q.correctSentence || q.words.join(' ')}`
  if (q.type === 'fillParagraph') return `Answers: ${q.blanks.map(b => b.answer).join(', ')}`
  if (q.type === 'listening') return `Correct answer: ${q.options[q.correctIndex]}`
  if (q.type === 'speaking') return `Target phrase: "${q.targetText}"`
  if (q.type === 'writing') return `Expected answer: ${q.acceptedAnswers[0]}`
  return ''
}

export const QUESTION_CHECKERS = {
  multipleChoice: (q, a) => a === q.correctIndex,
  orderSentence: (q, a) => {
    if (!Array.isArray(a) || !q.words) return false
    if (a.length !== q.words.length) return false
    // Map chosen indices to the selected words
    const studentWords = a.map(idx => q.words[idx]).join(' ').trim().toLowerCase()
    const expectedWords = (q.correctSentence || q.words.join(' ')).trim().toLowerCase()
    return studentWords === expectedWords
  },
  fillParagraph: (q, a) => Array.isArray(a) && q.blanks.every((b, i) => a[i] === b.answer),
  listening: (q, a) => a === q.correctIndex,
  speaking: (q, a) => {
    if (!a) return false
    const norm = s => s.toLowerCase().replace(/[^a-zñ\s']/g, '').split(/\s+/).filter(Boolean)
    const t = norm(q.targetText), said = norm(a)
    const hits = t.filter(w => said.includes(w)).length
    return hits / t.length >= (q.tolerance ?? 0.7)
  },
  writing: (q, a) => {
    if (!a) return false
    const clean = s => s.trim().toLowerCase().replace(/[.,!?;:]/g, '')
    return q.acceptedAnswers.some(ans => clean(ans) === clean(a))
  },
  trueFalse: (q, a) => {
    const expected = q.isTrue !== undefined ? q.isTrue : q.correct
    return a === expected
  },
}

// Generates a deterministic scrambled order for question word tiles
function getScrambledWordTiles(question) {
  const words = question.words || []
  const tiles = words.map((word, idx) => ({ idx, word }))
  if (tiles.length <= 1) return tiles

  // Deterministic seed based on question id or content so order remains stable while answering
  let seed = 0
  const seedStr = (question.id || '') + (question.prompt || '') + words.join('')
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
  }

  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  // Fisher-Yates shuffle
  const scrambled = [...tiles]
  for (let i = scrambled.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1))
    ;[scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]]
  }

  // Ensure it is NEVER identical to the original solution order
  const isStillOriginal = scrambled.every((item, pos) => item.idx === pos)
  if (isStillOriginal && scrambled.length > 1) {
    ;[scrambled[0], scrambled[1]] = [scrambled[1], scrambled[0]]
  }

  return scrambled
}

const QUESTION_VIEWS = {
  trueFalse: (q, answer, setAnswer, checked) => (
    <div className="space-y-4">
      {(q.readingContext || q.readingText) && (
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs md:text-sm text-gray-800 leading-relaxed italic whitespace-pre-line">
          <div className="font-bold text-indigo-900 not-italic flex items-center gap-1.5 mb-1.5">
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Read the following passage / rule:</span>
          </div>
          "{q.readingContext || q.readingText}"
        </div>
      )}
      {q.statement && (
        <p className="font-bold text-sm md:text-base text-gray-900 px-1">
          {q.statement}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {[
          { val: true, label: 'True', icon: 'check_circle', color: 'emerald' },
          { val: false, label: 'False', icon: 'cancel', color: 'red' }
        ].map(item => (
          <button
            key={String(item.val)}
            type="button"
            disabled={checked}
            onClick={() => setAnswer(item.val)}
            className={`p-4 rounded-xl border-2 font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
              answer === item.val
                ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-300 shadow-sm'
                : 'border-gray-200 bg-white hover:bg-slate-50 text-gray-700'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  ),

  multipleChoice: (q, answer, setAnswer, checked) => (
    <div className="flex flex-col gap-2.5">
      {q.options.map((opt, i) => (
        <button
          key={i}
          disabled={checked}
          onClick={() => setAnswer(i)}
          className={`w-full text-left p-4 rounded-xl border text-sm md:text-base font-semibold transition-all flex items-center justify-between ${
            answer === i
              ? 'border-primary bg-primary-fixed/30 text-primary shadow-sm ring-1 ring-primary'
              : 'border-outline-variant/50 bg-surface-container-low hover:bg-surface-container text-on-surface'
          }`}
        >
          <span>{opt}</span>
          <span
            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
              answer === i ? 'border-primary bg-primary text-white' : 'border-outline-variant'
            }`}
          >
            {answer === i && <span className="w-2 h-2 rounded-full bg-white"></span>}
          </span>
        </button>
      ))}
    </div>
  ),

  orderSentence: (q, answer, setAnswer, checked) => {
    const chosen = answer || []
    const scrambledTiles = getScrambledWordTiles(q)

    const toggle = idx => {
      if (checked) return
      if (chosen.includes(idx)) setAnswer(chosen.filter(x => x !== idx))
      else setAnswer([...chosen, idx])
    }

    const resetOrder = () => {
      if (checked) return
      setAnswer([])
    }

    return (
      <div className="space-y-4">
        {/* Header helpers */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-indigo-600">shuffle</span>
            <span>Haz clic en las palabras en el orden correcto:</span>
          </span>
          {chosen.length > 0 && !checked && (
            <button
              type="button"
              onClick={resetOrder}
              className="text-xs text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              Reiniciar
            </button>
          )}
        </div>

        {/* Sentence construction slot */}
        <div className="min-h-[64px] p-3.5 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex flex-wrap gap-2 items-center">
          {chosen.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              Construye la oración aquí haciendo clic en las fichas desordenadas de abajo...
            </span>
          ) : (
            chosen.map((idx, pos) => (
              <button
                key={`${idx}_${pos}`}
                type="button"
                disabled={checked}
                onClick={() => toggle(idx)}
                className="px-3.5 py-2 rounded-xl bg-[#2528b7] text-white font-bold text-sm shadow-sm hover:bg-[#1f2196] active:scale-95 transition-all animate-scaleIn cursor-pointer flex items-center gap-1.5"
                title="Haz clic para quitar de la oración"
              >
                <span>{q.words[idx]}</span>
                <span className="text-[11px] opacity-70">✕</span>
              </button>
            ))
          )}
        </div>

        {/* Scrambled Word bank */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
            Banco de palabras disponibles (desordenadas):
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            {scrambledTiles.map(tile => {
              const used = chosen.includes(tile.idx)
              return (
                <button
                  key={tile.idx}
                  type="button"
                  disabled={checked || used}
                  onClick={() => toggle(tile.idx)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    used
                      ? 'opacity-25 border-dashed border-slate-300 bg-slate-200 text-slate-400 cursor-not-allowed scale-95'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-indigo-600 hover:text-indigo-600 hover:shadow-sm active:scale-95 shadow-xs'
                  }`}
                >
                  {tile.word}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  },

  fillParagraph: (q, answer, setAnswer, checked) => {
    const ans = answer || []
    const setBlank = (i, val) => {
      if (checked) return
      const copy = [...ans]
      copy[i] = val
      setAnswer(copy)
    }
    const parts = q.textWithBlanks.split(/(\{\{\d+\}\})/)
    return (
      <div className="leading-loose text-base md:text-lg text-on-surface">
        {parts.map((p, idx) => {
          const m = p.match(/\{\{(\d+)\}\}/)
          if (!m) return <span key={idx}>{p}</span>
          const bIdx = parseInt(m[1])
          const blank = q.blanks[bIdx]
          return (
            <select
              key={idx}
              disabled={checked}
              value={ans[bIdx] || ''}
              onChange={e => setBlank(bIdx, e.target.value)}
              className="inline-block mx-1.5 px-3 py-1 text-sm font-bold rounded-lg border border-primary/50 bg-surface-container-low text-primary focus:outline-none cursor-pointer"
            >
              <option value="">(select)</option>
              {blank.options.map((opt, oIdx) => (
                <option key={oIdx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )
        })}
      </div>
    )
  },

  listening: (q, answer, setAnswer, checked) => (
    <ListeningAudioSection
      q={q}
      answer={answer}
      setAnswer={setAnswer}
      checked={checked}
    />
  ),

  speaking: (q, answer, setAnswer, checked) => {
    const [recording, setRecording] = useState(false)
    const [error, setError] = useState(null)

    const toggleRecord = () => {
      if (checked) return
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) {
        setError('Tu navegador no soporta reconocimiento de voz nativo.')
        return
      }
      const rec = new SR()
      rec.lang = 'en-US'
      rec.continuous = false
      rec.interimResults = false

      rec.onstart = () => { setRecording(true); setError(null) }
      rec.onresult = e => {
        const text = e.results[0][0].transcript
        setAnswer(text)
        setRecording(false)
      }
      rec.onerror = () => { setError('Error al capturar audio'); setRecording(false) }
      rec.onend = () => setRecording(false)
      rec.start()
    }

    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-on-surface-variant">Pronuncia en voz alta la siguiente frase:</p>
        <div className="p-4 rounded-xl bg-surface-container-high/60 font-heading font-extrabold text-xl md:text-2xl text-primary">
          "{q.targetText}"
        </div>

        <div className="pt-2">
          <button
            type="button"
            disabled={checked}
            onClick={toggleRecord}
            className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm text-white shadow-md transition-all ${
              recording
                ? 'bg-error animate-pulse'
                : 'bg-primary hover:bg-primary-container'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {recording ? 'mic' : 'mic_none'}
            </span>
            <span>{recording ? 'Escuchando tu voz...' : 'Presionar y Hablar'}</span>
          </button>
        </div>

        {answer && (
          <div className="p-3 rounded-lg bg-surface-container text-xs text-on-surface-variant font-mono">
            Capturado: "{answer}"
          </div>
        )}
        {error && <p className="text-xs text-error font-medium">{error}</p>}
      </div>
    )
  },

  writing: (q, answer, setAnswer, checked) => (
    <div className="space-y-4">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => speak(q.audioPrompt)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold text-xs shadow-sm hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[20px]">volume_up</span>
          <span>Escuchar frase</span>
        </button>
      </div>

      <div>
        <textarea
          rows={3}
          disabled={checked}
          value={answer || ''}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Escribe aquí exactamente lo que escuchaste en inglés..."
          className="w-full p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  )
}

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

function ListeningAudioSection({ q, answer, setAnswer, checked }) {
  const maxPlays = typeof q.maxPlays === 'number' ? q.maxPlays : 2
  const [playCount, setPlayCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const cutoff = getAudioCutoff(q.audioUrl)
  const effectiveDuration = cutoff && duration ? Math.min(cutoff, duration) : duration
  const remainingPlays = Math.max(0, maxPlays - playCount)
  const canPlay = remainingPlays > 0 || isPlaying

  // Detener y reiniciar si cambia la pregunta
  useEffect(() => {
    setPlayCount(0)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [q.id, q.audioUrl])

  const handleTogglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (!canPlay) return
      // Si la reproducción anterior ya había terminado, reiniciamos desde el inicio
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

    // Si llega al punto donde termina el diálogo (corte antes del comercial/outro)
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

  return (
    <div className="space-y-4">
      {q.audioUrl ? (
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

            {/* Contador de Reproducciones Restantes */}
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
            src={q.audioUrl}
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
              ⚠️ Has completado las {maxPlays} reproducciones permitidas para esta pregunta. Selecciona tu respuesta a continuación.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4">
          <button
            type="button"
            onClick={() => speak(q.audioText)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-container active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">volume_up</span>
            <span>Play Audio</span>
          </button>
        </div>
      )}

      {/* Enunciado de la pregunta */}
      {q.question && (
        <p className="font-bold text-sm md:text-base text-gray-900 px-1">
          {q.question}
        </p>
      )}

      {/* Opciones de respuesta */}
      <div className="flex flex-col gap-2.5">
        {q.options?.map((opt, i) => (
          <button
            key={i}
            disabled={checked}
            onClick={() => setAnswer(i)}
            className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
              answer === i
                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-sm ring-1 ring-indigo-500'
                : 'border-gray-200 bg-white hover:bg-slate-50 text-gray-800'
            }`}
          >
            <span>{opt}</span>
            <span
              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                answer === i ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
              }`}
            >
              {answer === i && <span className="w-2 h-2 rounded-full bg-white"></span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

