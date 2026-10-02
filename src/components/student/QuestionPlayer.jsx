import React, { useState } from 'react'

export function speak(text) {
  if (!text || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export default function QuestionPlayer({ question, onResult }) {
  const [answer, setAnswer] = useState(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)

  const check = () => {
    const ok = QUESTION_CHECKERS[question.type](question, answer)
    setCorrect(ok)
    setChecked(true)
    onResult(ok)
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 border border-outline-variant/40 shadow-sm relative overflow-hidden">
      {/* Tag del tipo de interactividad */}
      <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2">
        <span className="material-symbols-outlined text-[18px]">
          {MODULE_ICONS[question.type] || 'help'}
        </span>
        <span>{MODULE_LABEL[question.type]}</span>
      </div>

      <p className="font-heading font-bold text-lg md:text-xl text-on-surface mb-6">
        {question.prompt}
      </p>

      {/* Vista de interacción según el tipo de ejercicio */}
      <div className="mb-6">
        {QUESTION_VIEWS[question.type](question, answer, setAnswer, checked)}
      </div>

      {/* Botón de Comprobación y Feedback */}
      {!checked ? (
        <button
          onClick={check}
          disabled={answer == null}
          className="w-full py-3 px-4 rounded-xl bg-secondary text-white font-heading font-bold text-sm tracking-wide shadow-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Comprobar Respuesta
        </button>
      ) : (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-bold animate-fadeIn ${
            correct
              ? 'bg-secondary-container/40 text-on-secondary-container border border-secondary/30'
              : 'bg-error-container/60 text-on-error-container border border-error/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">
              {correct ? 'check_circle' : 'cancel'}
            </span>
            <div>
              <p>{correct ? '¡Excelente trabajo! +10 XP' : 'No exactamente.'}</p>
              {!correct && <p className="text-xs font-normal mt-0.5">{explain(question)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MODULE_ICONS = {
  multipleChoice: 'radio_button_checked',
  orderSentence: 'format_align_left',
  fillParagraph: 'edit_note',
  listening: 'volume_up',
  speaking: 'mic',
  writing: 'edit'
}

const MODULE_LABEL = {
  multipleChoice: 'Opción Múltiple',
  orderSentence: 'Ordena la Oración',
  fillParagraph: 'Completa los Huecos',
  listening: 'Comprensión Auditiva',
  speaking: 'Expresión Oral (Speaking)',
  writing: 'Escritura Guiada'
}

const explain = q => {
  if (q.type === 'multipleChoice') return `Respuesta correcta: ${q.options[q.correctIndex]}`
  if (q.type === 'orderSentence') return `Orden correcto: ${q.words.join(' ')}`
  if (q.type === 'fillParagraph') return `Respuestas: ${q.blanks.map(b => b.answer).join(', ')}`
  if (q.type === 'listening') return `Respuesta correcta: ${q.options[q.correctIndex]}`
  if (q.type === 'speaking') return `Debías pronunciar: "${q.targetText}"`
  if (q.type === 'writing') return `Respuesta esperada: ${q.acceptedAnswers[0]}`
  return ''
}

const QUESTION_CHECKERS = {
  multipleChoice: (q, a) => a === q.correctIndex,
  orderSentence: (q, a) => Array.isArray(a) && a.length === q.words.length &&
    a.every((idx, pos) => q.words[idx] === q.words[pos]),
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
}

const QUESTION_VIEWS = {
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
    const toggle = idx => {
      if (checked) return
      if (chosen.includes(idx)) setAnswer(chosen.filter(x => x !== idx))
      else setAnswer([...chosen, idx])
    }
    return (
      <div className="space-y-4">
        {/* Línea de armado de respuesta */}
        <div className="min-h-[56px] p-3 rounded-xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low flex flex-wrap gap-2 items-center">
          {chosen.length === 0 ? (
            <span className="text-xs text-outline italic">Toca las palabras en el orden correcto...</span>
          ) : (
            chosen.map(idx => (
              <button
                key={idx}
                disabled={checked}
                onClick={() => toggle(idx)}
                className="px-3.5 py-2 rounded-xl bg-primary text-white font-semibold text-sm shadow-sm transition-all animate-scaleIn"
              >
                {q.words[idx]}
              </button>
            ))
          )}
        </div>

        {/* Banco de palabras disponibles */}
        <div className="flex flex-wrap gap-2 pt-2">
          {q.words.map((w, idx) => {
            const used = chosen.includes(idx)
            return (
              <button
                key={idx}
                disabled={checked || used}
                onClick={() => toggle(idx)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  used
                    ? 'opacity-30 border-transparent bg-surface-container-high cursor-not-allowed'
                    : 'border-outline-variant/60 bg-surface-container-lowest text-on-surface hover:border-primary shadow-sm'
                }`}
              >
                {w}
              </button>
            )
          })}
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
              className="inline-block mx-1.5 px-3 py-1 text-sm font-bold rounded-lg border border-primary/50 bg-surface-container-low text-primary focus:outline-none"
            >
              <option value="">(elegir)</option>
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
    <div className="space-y-4">
      <div className="flex justify-center p-4">
        <button
          type="button"
          onClick={() => speak(q.audioText)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-container active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[24px]">volume_up</span>
          <span>Reproducir Audio</span>
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {q.options.map((opt, i) => (
          <button
            key={i}
            disabled={checked}
            onClick={() => setAnswer(i)}
            className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all ${
              answer === i
                ? 'border-primary bg-primary-fixed/30 text-primary shadow-sm'
                : 'border-outline-variant/50 bg-surface-container-low hover:bg-surface-container text-on-surface'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
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
