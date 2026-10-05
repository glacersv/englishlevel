import React, { useState } from 'react'

export function speak(text) {
  if (!text || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export default function QuestionPlayer({ question, onResult, onAnswerChange, showFeedback = false }) {
  const [answer, setAnswer] = useState(null)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)

  // Actualizar respuesta y notificar automáticamente
  const handleUpdateAnswer = (newVal) => {
    setAnswer(newVal)
    onAnswerChange?.(newVal)
    const isCorrect = QUESTION_CHECKERS[question.type](question, newVal)
    onResult?.(isCorrect, newVal)
  }

  const check = () => {
    const ok = QUESTION_CHECKERS[question.type](question, answer)
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
        {QUESTION_VIEWS[question.type](question, answer, handleUpdateAnswer, showFeedback && checked)}
      </div>

      {/* Solo si se habilita retroalimentación explícita (modo práctica o modo docente con feedback) */}
      {showFeedback && (
        !checked ? (
          <button
            onClick={check}
            disabled={answer == null}
            className="w-full py-3 px-4 rounded-xl bg-[#2528b7] text-white font-heading font-bold text-sm tracking-wide shadow-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Check Answer
          </button>
        ) : (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-bold animate-fadeIn ${
              correct
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]">
                {correct ? 'check_circle' : 'cancel'}
              </span>
              <div>
                <p>{correct ? 'Correct! Well done.' : 'Incorrect.'}</p>
                {!correct && <p className="text-xs font-normal mt-0.5">{explain(question)}</p>}
              </div>
            </div>
          </div>
        )
      )}
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
  trueFalse: (q, a) => {
    const expected = q.isTrue !== undefined ? q.isTrue : q.correct
    return a === expected
  },
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
    const toggle = idx => {
      if (checked) return
      if (chosen.includes(idx)) setAnswer(chosen.filter(x => x !== idx))
      else setAnswer([...chosen, idx])
    }
    return (
      <div className="space-y-4">
        {/* Sentence construction slot */}
        <div className="min-h-[56px] p-3 rounded-xl border-2 border-dashed border-outline-variant/60 bg-surface-container-low flex flex-wrap gap-2 items-center">
          {chosen.length === 0 ? (
            <span className="text-xs text-outline italic">Tap or click words in the correct order...</span>
          ) : (
            chosen.map(idx => (
              <button
                key={idx}
                disabled={checked}
                onClick={() => toggle(idx)}
                className="px-3.5 py-2 rounded-xl bg-[#2528b7] text-white font-semibold text-sm shadow-sm transition-all animate-scaleIn cursor-pointer"
              >
                {q.words[idx]}
              </button>
            ))
          )}
        </div>

        {/* Word bank */}
        <div className="flex flex-wrap gap-2 pt-2">
          {q.words.map((w, idx) => {
            const used = chosen.includes(idx)
            return (
              <button
                key={idx}
                disabled={checked || used}
                onClick={() => toggle(idx)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
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

  listening: (q, answer, setAnswer, checked) => {
    const [showTranscript, setShowTranscript] = React.useState(false)

    return (
      <div className="space-y-4">
        {q.audioUrl ? (
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex flex-col items-center gap-3">
            <div className="flex items-center justify-between w-full max-w-md">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-900">
                <span className="material-symbols-outlined text-[20px] text-indigo-600">headphones</span>
                <span>Official Audio Track (MP3)</span>
              </div>
              {q.audioText && (
                <button
                  type="button"
                  onClick={() => setShowTranscript(s => !s)}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">description</span>
                  <span>{showTranscript ? 'Hide Transcript' : 'View Transcript'}</span>
                </button>
              )}
            </div>
            <audio controls src={q.audioUrl} className="w-full max-w-md h-10">
              Your browser does not support audio playback.
            </audio>
            {showTranscript && q.audioText && (
              <div className="w-full max-w-md p-3.5 bg-white/90 rounded-xl border border-indigo-100 text-xs text-gray-700 italic leading-relaxed animate-fadeIn">
                <span className="not-italic font-bold text-indigo-900 block mb-1">Transcript:</span>
                "{q.audioText}"
              </div>
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
            {q.audioText && (
              <button
                type="button"
                onClick={() => setShowTranscript(s => !s)}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 mt-1 cursor-pointer"
              >
                {showTranscript ? 'Hide Transcript' : 'View Transcript'}
              </button>
            )}
            {showTranscript && q.audioText && (
              <div className="w-full max-w-md p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-gray-700 italic leading-relaxed animate-fadeIn">
                "{q.audioText}"
              </div>
            )}
          </div>
        )}

        {q.question && (
          <p className="font-bold text-sm md:text-base text-gray-900 px-1">
            {q.question}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {q.options.map((opt, i) => (
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
  },

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
